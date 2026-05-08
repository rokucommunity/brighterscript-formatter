import type { Token, Parser, IfStatement } from 'brighterscript';
import { createVisitor, createToken, isCommentStatement, isIfStatement, isTryCatchStatement, TokenKind, WalkMode } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';

export class SingleLineIfFormatter {
    public format(tokens: Token[], options: FormattingOptions, parser: Parser): Token[] {
        const mode = options.singleLineIf;
        if (!mode || mode === 'original') {
            return tokens;
        }

        // Collect all if statements from the AST
        const ifStatements: IfStatement[] = [];
        parser.ast.walk(createVisitor({
            IfStatement: (stmt) => {
                ifStatements.push(stmt);
            }
        }), { walkMode: WalkMode.visitAllRecursive });

        if (mode === 'block') {
            // `isInline` is true on every IfStatement of an inline chain (parent + every
            // nested else-if). It cannot be derived from `!tokens.endIf`, since brighterscript
            // attaches the `end if` to the deepest else-if of a multi-line chain — which would
            // leave the outer IfStatement looking endIf-less even though the chain is multi-line.
            //
            // The range check rejects ifs that brighterscript labels inline but whose body
            // happens to span multiple physical lines, e.g. `if x then return { ... }` where
            // the AA literal spans several lines. Expanding those would land `end if` inside
            // the literal.
            const inlineIfs = ifStatements.filter(s => s.isInline === true && this.isSingleLine(s) && this.isStandaloneIf(tokens, s));
            for (let i = inlineIfs.length - 1; i >= 0; i--) {
                this.expand(tokens, inlineIfs[i], options);
            }
        } else if (mode === 'inline' || mode === 'inlineNoElseIf' || mode === 'inlineNoElse') {
            const collapsible = ifStatements.filter(s => this.isCollapsible(s) && this.isStandaloneIf(tokens, s));
            for (let i = collapsible.length - 1; i >= 0; i--) {
                this.collapse(tokens, collapsible[i]);
            }
        }

        return tokens;
    }

    private isSingleLine(stmt: IfStatement): boolean {
        const range = stmt.range;
        return !range || range.start.line === range.end.line;
    }

    /**
     * A multi-line if is collapsible to inline form only when:
     *   - it has an `end if` (multi-line) and no else branch,
     *   - the body has exactly one statement,
     *   - that statement fits on a single line (so the inline result is one line),
     *   - and that statement is not itself an `if` (chaining inline ifs is undesirable).
     */
    private isCollapsible(stmt: IfStatement): boolean {
        if (!stmt.tokens.endIf || stmt.elseBranch || stmt.thenBranch?.statements?.length !== 1) {
            return false;
        }
        const body = stmt.thenBranch.statements[0];
        if (isIfStatement(body) || isTryCatchStatement(body) || isCommentStatement(body)) {
            // brighterscript reports TryCatchStatement.range as just the `try` keyword,
            // so we cannot rely on a multi-line range check to reject it.
            //
            // A comment-only body has no executable code, so collapsing it would turn an
            // intentionally-empty branch into something that looks like a trailing comment
            // on the `if` line. Leave those alone.
            return false;
        }
        const range = body.range;
        if (range && range.start.line !== range.end.line) {
            return false;
        }
        return true;
    }

    /**
     * Returns false if this if statement is an `else if` branch
     * (i.e. the token before `if` on the same line is `else`).
     */
    private isStandaloneIf(tokens: Token[], stmt: IfStatement): boolean {
        const ifIdx = tokens.indexOf(stmt.tokens.if);
        if (ifIdx === -1) {
            return false;
        }
        for (let i = ifIdx - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.kind === TokenKind.Newline || t.kind === TokenKind.Eof) {
                break;
            }
            if (t.kind === TokenKind.Else) {
                return false;
            }
        }
        return true;
    }

    /**
     * Expand: `if x then y = 1 [else if z then y = 2] [else y = 3]`  →  multi-line block.
     *
     * Walks the if/else-if chain via `elseBranch` and inserts `\n` after every `then` and
     * around every `else`/`else if`, so each branch's body lands on its own line. Finally
     * appends `\n end if` after the last branch's body. IndentFormatter handles indentation.
     */
    private expand(tokens: Token[], stmt: IfStatement, options: FormattingOptions): void {
        const breakAfter: Token[] = [];
        const breakBefore: Token[] = [];

        let current: IfStatement | undefined = stmt;
        while (current) {
            if (current.tokens.then) {
                breakAfter.push(current.tokens.then);
            }
            if (current.tokens.else) {
                breakBefore.push(current.tokens.else);
            }
            if (isIfStatement(current.elseBranch)) {
                // `else if` — descend into the chained IfStatement
                current = current.elseBranch;
            } else {
                // plain `else` body — break after the `else` so its body lands on a new line
                if (current.elseBranch && current.tokens.else) {
                    breakAfter.push(current.tokens.else);
                }
                current = undefined;
            }
        }

        if (breakAfter.length === 0) {
            return;
        }

        // Find the line end after the rightmost structural token, where `\n end if` will go
        const lastChainToken = breakAfter[breakAfter.length - 1];
        const lastChainIdx = tokens.indexOf(lastChainToken);
        if (lastChainIdx === -1) {
            return;
        }
        let lineEndIdx = lastChainIdx + 1;
        while (lineEndIdx < tokens.length && tokens[lineEndIdx].kind !== TokenKind.Newline && tokens[lineEndIdx].kind !== TokenKind.Eof) {
            lineEndIdx++;
        }

        const endIfText = options.compositeKeywords === 'combine' ? 'endif' : 'end if';
        // Give the synthetic EndIf a range on a far-future line so IndentFormatter
        // does not classify the re-parsed if as an inline single-line if.
        const endIfToken = createToken(TokenKind.EndIf, endIfText, {
            start: { line: 999999, character: 0 },
            end: { line: 999999, character: endIfText.length }
        });
        const lineEnder = tokens[lineEndIdx];

        // 1. Insert `\n end if` at the rightmost position first (highest indices stay highest).
        if (lineEnder?.kind === TokenKind.Eof) {
            tokens.splice(lineEndIdx, 0,
                { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex,
                endIfToken
            );
        } else {
            tokens.splice(lineEndIdx + 1, 0,
                endIfToken,
                { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex
            );
        }

        // 2. Break around each structural token. Token references stay valid across splices,
        //    so re-resolving via indexOf each time keeps the logic order-independent.
        for (const token of breakBefore) {
            const idx = tokens.indexOf(token);
            if (idx <= 0) {
                continue;
            }
            const prev = tokens[idx - 1];
            if (prev?.kind === TokenKind.Whitespace) {
                prev.text = '\n';
                prev.kind = TokenKind.Newline;
            } else {
                tokens.splice(idx, 0, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
            }
        }
        for (const token of breakAfter) {
            const idx = tokens.indexOf(token);
            if (idx === -1) {
                continue;
            }
            const next = tokens[idx + 1];
            if (next?.kind === TokenKind.Whitespace) {
                next.text = '\n';
                next.kind = TokenKind.Newline;
            } else {
                tokens.splice(idx + 1, 0, { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex);
            }
        }
    }

    /**
     * Collapse:
     * ```
     * if x then
     *     y = 1
     * end if
     * ```
     * →  `if x then y = 1`
     *
     * Removes the \n after `then`, the body's indentation, the \n before `end if`,
     * and the `end if` token itself. Keeps the \n that was *after* `end if` as the
     * line-ender for the resulting inline if.
     */
    private collapse(tokens: Token[], stmt: IfStatement): void {
        const thenToken = stmt.tokens.then;
        const endIfToken = stmt.tokens.endIf;
        if (!thenToken || !endIfToken) {
            return;
        }

        const thenIdx = tokens.indexOf(thenToken);
        const endIfIdx = tokens.indexOf(endIfToken);
        if (thenIdx === -1 || endIfIdx === -1) {
            return;
        }

        // Find the \n immediately after `then` (may have whitespace between then and \n, though unusual)
        let newlineAfterThenIdx = thenIdx + 1;
        while (newlineAfterThenIdx < endIfIdx && tokens[newlineAfterThenIdx].kind === TokenKind.Whitespace) {
            newlineAfterThenIdx++;
        }
        if (tokens[newlineAfterThenIdx].kind !== TokenKind.Newline) {
            return; // not a multi-line if
        }

        // Find the \n immediately before `end if` (the body's line-ender)
        let newlineBeforeEndIfIdx = endIfIdx - 1;
        while (newlineBeforeEndIfIdx > newlineAfterThenIdx && tokens[newlineBeforeEndIfIdx].kind === TokenKind.Whitespace) {
            newlineBeforeEndIfIdx--;
        }
        if (tokens[newlineBeforeEndIfIdx].kind !== TokenKind.Newline) {
            return; // unexpected structure
        }

        // Perform all deletions in reverse index order (highest first) to keep indices stable:

        // 1. Remove `end if` token
        tokens.splice(endIfIdx, 1);

        // 2. Remove the \n before `end if` (body line-ender)
        //    endIfIdx didn't shift because we only removed endIfIdx itself which is >= endIfIdx
        tokens.splice(newlineBeforeEndIfIdx, 1);

        // 3. Remove body indentation whitespace (tokens between \n-after-then+1 and body start)
        //    Both splices above were at indices > newlineAfterThenIdx, so it's still valid.
        let indentIdx = newlineAfterThenIdx + 1;
        while (indentIdx < tokens.length && tokens[indentIdx].kind === TokenKind.Whitespace) {
            tokens.splice(indentIdx, 1);
        }

        // 4. Remove the \n after `then`
        tokens.splice(newlineAfterThenIdx, 1);

        // 5. Insert a space between `then` and the body (now at newlineAfterThenIdx position)
        tokens.splice(newlineAfterThenIdx, 0, {
            kind: TokenKind.Whitespace,
            text: ' '
        } as TokenWithStartIndex);
    }
}
