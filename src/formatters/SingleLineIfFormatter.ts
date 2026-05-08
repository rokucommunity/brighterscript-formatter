import type { Token, Parser, IfStatement, Block } from 'brighterscript';
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
            const collapsible = ifStatements.filter(s => this.isCollapsible(s, mode) && this.isStandaloneIf(tokens, s));
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
     * A multi-line if is collapsible to inline form when every branch in the chain has a
     * single, single-line, non-block body. The mode controls which branch shapes are allowed:
     *
     *   - `inlineNoElse`     — only simple `if/then/end if` (no else of any kind)
     *   - `inlineNoElseIf`   — adds plain `if/then/else/end if` (single else allowed)
     *   - `inline`           — adds `else if` chains, with or without a final plain else
     *
     * Already-inline ifs are skipped — they have nothing to collapse.
     */
    private isCollapsible(stmt: IfStatement, mode: 'inline' | 'inlineNoElseIf' | 'inlineNoElse'): boolean {
        if (stmt.isInline === true) {
            return false;
        }
        let current: IfStatement | undefined = stmt;
        while (current) {
            if (!this.isSimpleSingleLineBody(current.thenBranch)) {
                return false;
            }
            const elseBranch: IfStatement | Block | undefined = current.elseBranch;
            if (!elseBranch) {
                return true;
            }
            if (isIfStatement(elseBranch)) {
                if (mode !== 'inline') {
                    return false;
                }
                current = elseBranch;
            } else {
                if (mode === 'inlineNoElse') {
                    return false;
                }
                return this.isSimpleSingleLineBody(elseBranch);
            }
        }
        return true;
    }

    /**
     * A branch body is collapsible when it contains exactly one statement, that statement
     * fits on a single physical line, and isn't a nested control-flow block whose collapse
     * would corrupt structure (if, try/catch) or a comment-only line.
     */
    private isSimpleSingleLineBody(branch: Block | undefined): boolean {
        if (!branch?.statements || branch.statements.length !== 1) {
            return false;
        }
        const body = branch.statements[0];
        if (isIfStatement(body) || isTryCatchStatement(body) || isCommentStatement(body)) {
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
     * Collapse a multi-line if (and any chained else/else-if branches) onto a single line.
     *
     * Walks the chain via `elseBranch` to gather two sets of structural tokens:
     *   - openers: every `then` token plus the `else` of a plain-else branch — the body
     *     starts on the line right after these
     *   - closers: every `else` token plus the chain's `end if` — the body ends on the line
     *     right before these
     *
     * Then in token-reference order:
     *   - For each opener: remove the `\n` after it and the body's indent, leaving a space
     *     between the opener and the body
     *   - For each closer (else): replace the `\n` before it with a space
     *   - For the final `end if`: remove the `\n` before it AND the `end if` token entirely
     *
     * Token references stay valid across splices, so we can re-resolve indices each time.
     */
    private collapse(tokens: Token[], stmt: IfStatement): void {
        const openers: Token[] = [];
        const closers: Token[] = [];
        let endIfToken: Token | undefined;

        let current: IfStatement | undefined = stmt;
        while (current) {
            if (!current.tokens.then) {
                return;
            }
            openers.push(current.tokens.then);
            if (current.tokens.else) {
                closers.push(current.tokens.else);
            }
            if (current.tokens.endIf) {
                endIfToken = current.tokens.endIf;
            }
            const elseBranch: IfStatement | Block | undefined = current.elseBranch;
            if (!elseBranch) {
                break;
            }
            if (isIfStatement(elseBranch)) {
                current = elseBranch;
            } else {
                // plain `else` body — the `else` token is also an opener for this body
                if (!current.tokens.else) {
                    return;
                }
                openers.push(current.tokens.else);
                break;
            }
        }

        if (!endIfToken) {
            return;
        }
        // Validate all structural tokens are present before mutating anything, so a
        // corrupt input results in a no-op rather than a partial mutation.
        for (const token of [...openers, ...closers, endIfToken]) {
            if (!tokens.includes(token)) {
                return;
            }
        }

        // Process closers (else, end-if): collapse the `\n + indent` before each into a
        // single space. For end-if specifically, drop the `\n` entirely since the token
        // itself is removed below.
        for (const closer of closers) {
            this.collapseBeforeCloser(tokens, closer, false);
        }
        this.collapseBeforeCloser(tokens, endIfToken, true);

        // Process openers (then, plain-else's else): collapse the `\n + indent` after each
        // into a single space between the opener and its body.
        for (const opener of openers) {
            this.collapseAfterOpener(tokens, opener);
        }

        // Finally remove the `end if` token. Any `\n` that previously preceded it was
        // already removed by collapseBeforeCloser above.
        const endIfIdx = tokens.indexOf(endIfToken);
        if (endIfIdx !== -1) {
            tokens.splice(endIfIdx, 1);
        }
    }

    private collapseBeforeCloser(tokens: Token[], closer: Token, removeNewline: boolean): void {
        const closerIdx = tokens.indexOf(closer);
        if (closerIdx === -1) {
            return;
        }
        let walkIdx = closerIdx - 1;
        while (walkIdx >= 0 && tokens[walkIdx].kind === TokenKind.Whitespace) {
            walkIdx--;
        }
        if (walkIdx < 0 || tokens[walkIdx].kind !== TokenKind.Newline) {
            return;
        }
        const newlineIdx = walkIdx;
        const wsCount = closerIdx - newlineIdx - 1;
        for (let k = 0; k < wsCount; k++) {
            tokens.splice(newlineIdx + 1, 1);
        }
        if (removeNewline) {
            tokens.splice(newlineIdx, 1);
        } else {
            tokens[newlineIdx] = { kind: TokenKind.Whitespace, text: ' ' } as TokenWithStartIndex;
        }
    }

    private collapseAfterOpener(tokens: Token[], opener: Token): void {
        const openerIdx = tokens.indexOf(opener);
        if (openerIdx === -1) {
            return;
        }
        let walkIdx = openerIdx + 1;
        while (walkIdx < tokens.length && tokens[walkIdx].kind === TokenKind.Whitespace) {
            walkIdx++;
        }
        if (walkIdx >= tokens.length || tokens[walkIdx].kind !== TokenKind.Newline) {
            return;
        }
        const newlineIdx = walkIdx;
        // Remove indent whitespace after the newline
        let indentIdx = newlineIdx + 1;
        while (indentIdx < tokens.length && tokens[indentIdx].kind === TokenKind.Whitespace) {
            tokens.splice(indentIdx, 1);
        }
        // Replace the newline with a single space
        tokens[newlineIdx] = { kind: TokenKind.Whitespace, text: ' ' } as TokenWithStartIndex;
    }
}
