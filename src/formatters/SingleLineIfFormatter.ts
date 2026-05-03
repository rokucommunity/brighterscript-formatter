import type { Token, Parser, IfStatement } from 'brighterscript';
import { createVisitor, createToken, TokenKind, WalkMode } from 'brighterscript';
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

        if (mode === 'expand') {
            // Inline ifs have no endIf token. Process in reverse to keep indices stable.
            const inlineIfs = ifStatements.filter(s => !s.tokens.endIf && this.isStandaloneIf(tokens, s));
            for (let i = inlineIfs.length - 1; i >= 0; i--) {
                this.expand(tokens, inlineIfs[i], options);
            }
        } else if (mode === 'collapse') {
            // Collapsible: multi-line, single statement, no else, and not an `else if` branch
            const collapsible = ifStatements.filter(s => s.tokens.endIf && !s.elseBranch && s.thenBranch?.statements?.length === 1 && this.isStandaloneIf(tokens, s));
            for (let i = collapsible.length - 1; i >= 0; i--) {
                this.collapse(tokens, collapsible[i]);
            }
        }

        return tokens;
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
     * Expand: `if x then y = 1`  →  multi-line block with `end if`
     *
     * Replaces the whitespace after `then` with `\n`, then appends `\n end if [\n]`
     * after the body. IndentFormatter handles indentation.
     */
    private expand(tokens: Token[], stmt: IfStatement, options: FormattingOptions): void {
        const thenToken = stmt.tokens.then;
        if (!thenToken) {
            return;
        }
        const thenIdx = tokens.indexOf(thenToken);
        if (thenIdx === -1) {
            return;
        }

        // Replace whitespace after `then` with a newline (or insert one if missing)
        const afterThen = tokens[thenIdx + 1];
        if (afterThen?.kind === TokenKind.Whitespace) {
            afterThen.text = '\n';
            afterThen.kind = TokenKind.Newline;
        } else {
            tokens.splice(thenIdx + 1, 0, {
                kind: TokenKind.Newline,
                text: '\n'
            } as TokenWithStartIndex);
        }

        // Walk forward to find the end of the body line (the \n or EOF that terminates it)
        let lineEndIdx = thenIdx + 2;
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

        if (lineEnder?.kind === TokenKind.Eof) {
            // No trailing newline — insert \n + end if before EOF
            tokens.splice(lineEndIdx, 0,
                { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex,
                endIfToken
            );
        } else {
            // lineEnder is \n — insert end if + \n after it
            tokens.splice(lineEndIdx + 1, 0,
                endIfToken,
                { kind: TokenKind.Newline, text: '\n' } as TokenWithStartIndex
            );
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
