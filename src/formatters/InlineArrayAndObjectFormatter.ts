import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class InlineArrayAndObjectFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const threshold = options.inlineArrayAndObjectThreshold!;
        if (!threshold || threshold <= 0) {
            return tokens;
        }

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            let openKind: TokenKind | undefined;
            let closeKind: TokenKind | undefined;

            if (token.kind === TokenKind.LeftCurlyBrace) {
                openKind = TokenKind.LeftCurlyBrace;
                closeKind = TokenKind.RightCurlyBrace;
            } else if (token.kind === TokenKind.LeftSquareBracket) {
                openKind = TokenKind.LeftSquareBracket;
                closeKind = TokenKind.RightSquareBracket;
            } else {
                continue;
            }

            const closingToken = util.getClosingToken(tokens, i, openKind, closeKind);
            if (!closingToken) {
                continue;
            }
            let closeIndex = tokens.indexOf(closingToken);

            // Only process multi-line arrays/AAs
            const hasNewline = tokens.slice(i + 1, closeIndex).some(t => t.kind === TokenKind.Newline);
            if (!hasNewline) {
                continue;
            }

            // Reject if there are nested multi-line arrays/AAs inside
            if (this.hasNestedMultiLine(tokens, i + 1, closeIndex)) {
                continue;
            }

            // Estimate the inlined character length. If it exceeds the threshold, skip.
            const inlinedLength = this.estimateInlinedLength(tokens, i + 1, closeIndex);
            if (inlinedLength > threshold) {
                continue;
            }

            // Collapse: remove all Newline tokens and the Whitespace indentation that follows each one.
            let j = i + 1;
            while (j < closeIndex) {
                if (tokens[j].kind === TokenKind.Newline) {
                    tokens.splice(j, 1);
                    closeIndex--;
                    // Remove leading whitespace on the now-joined line (indentation)
                    while (j < closeIndex && tokens[j].kind === TokenKind.Whitespace) {
                        tokens.splice(j, 1);
                        closeIndex--;
                    }
                } else {
                    j++;
                }
            }
        }

        return tokens;
    }

    /**
     * Checks whether any nested [ or { within [startIndex, endIndex) itself spans multiple lines.
     */
    private hasNestedMultiLine(tokens: Token[], startIndex: number, endIndex: number): boolean {
        for (let i = startIndex; i < endIndex; i++) {
            const t = tokens[i];
            let openKind: TokenKind | undefined;
            let closeKind: TokenKind | undefined;
            if (t.kind === TokenKind.LeftCurlyBrace) {
                openKind = TokenKind.LeftCurlyBrace;
                closeKind = TokenKind.RightCurlyBrace;
            } else if (t.kind === TokenKind.LeftSquareBracket) {
                openKind = TokenKind.LeftSquareBracket;
                closeKind = TokenKind.RightSquareBracket;
            } else {
                continue;
            }
            const closer = util.getClosingToken(tokens, i, openKind, closeKind);
            if (!closer) {
                continue;
            }
            const closerIdx = tokens.indexOf(closer);
            if (tokens.slice(i + 1, closerIdx).some(x => x.kind === TokenKind.Newline)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Estimates the character length of the inlined form of the content between brackets.
     * Skips newlines and the indentation whitespace that follows them.
     * Adds 2 for the surrounding brackets.
     */
    private estimateInlinedLength(tokens: Token[], fromIdx: number, toIdx: number): number {
        let length = 2; // surrounding brackets
        let prevWasNewline = false;
        for (let i = fromIdx; i < toIdx; i++) {
            const t = tokens[i];
            if (t.kind === TokenKind.Newline) {
                prevWasNewline = true;
                continue;
            }
            if (t.kind === TokenKind.Whitespace && prevWasNewline) {
                // Leading indentation after a newline — skip
                continue;
            }
            prevWasNewline = false;
            length += t.text.length;
        }
        return length;
    }
}
