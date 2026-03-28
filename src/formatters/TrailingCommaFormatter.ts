import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class TrailingCommaFormatter {
    public format(tokens: Token[], options: FormattingOptions): Token[] {
        const mode = options.trailingComma;
        if (!mode || mode === 'original') {
            return tokens;
        }

        // Collect all opening bracket token objects (by reference, not index)
        // so indices remain valid after splicing during inner-collection processing
        const openTokens: Array<{ token: Token; openKind: TokenKind; closeKind: TokenKind }> = [];
        for (const token of tokens) {
            if (token.kind === TokenKind.LeftCurlyBrace) {
                openTokens.push({ token: token, openKind: TokenKind.LeftCurlyBrace, closeKind: TokenKind.RightCurlyBrace });
            } else if (token.kind === TokenKind.LeftSquareBracket) {
                openTokens.push({ token: token, openKind: TokenKind.LeftSquareBracket, closeKind: TokenKind.RightSquareBracket });
            }
        }

        // Process innermost collections first (reverse order) so that splicing inside a nested
        // collection does not shift the opening-bracket index of outer collections.
        for (let ci = openTokens.length - 1; ci >= 0; ci--) {
            const { token: openToken, openKind, closeKind } = openTokens[ci];

            // Re-resolve index each time — inner modifications may have shifted outer tokens
            const openIndex = tokens.indexOf(openToken);
            const closingToken = util.getClosingToken(tokens, openIndex, openKind, closeKind);
            if (!closingToken) {
                continue;
            }
            const closeIndex = tokens.indexOf(closingToken);

            // Only process multiline collections
            const isMultiLine = tokens.slice(openIndex, closeIndex).some(t => t.kind === TokenKind.Newline);
            if (!isMultiLine) {
                continue;
            }

            // Collect the last-content-token index for each item line at depth 0.
            // Gathering all of them first lets us identify which one is the trailing item.
            const itemEnds: Array<{ contentIdx: number; hasComma: boolean }> = [];
            let depth = 0;

            for (let i = openIndex + 1; i < closeIndex; i++) {
                const token = tokens[i];

                // Track nesting depth so we only operate on direct items of this collection
                if (
                    token.kind === TokenKind.LeftCurlyBrace ||
                    token.kind === TokenKind.LeftSquareBracket ||
                    token.kind === TokenKind.LeftParen
                ) {
                    depth++;
                    continue;
                }

                if (
                    token.kind === TokenKind.RightCurlyBrace ||
                    token.kind === TokenKind.RightSquareBracket ||
                    token.kind === TokenKind.RightParen
                ) {
                    depth--;
                    // fall through — need to reach the newline check below
                }

                if (depth !== 0 || token.kind !== TokenKind.Newline) {
                    continue;
                }

                // Find the last non-whitespace token on this line (stops at the previous newline
                // so blank lines return undefined)
                const lastContentIdx = this.findLastContentTokenBefore(tokens, i);
                if (lastContentIdx === undefined || lastContentIdx < openIndex) {
                    continue;
                }

                const lastContent = tokens[lastContentIdx];

                // Skip the line that only contains the opening bracket, and comment-only lines
                if (lastContent.kind === openKind || lastContent.kind === TokenKind.Comment) {
                    continue;
                }

                itemEnds.push({
                    contentIdx: lastContentIdx,
                    hasComma: lastContent.kind === TokenKind.Comma
                });
            }

            // Decide what to do with each item now that we know which is last
            const modifications: Array<{ index: number; action: 'insert' | 'delete' }> = [];
            for (let idx = 0; idx < itemEnds.length; idx++) {
                const { contentIdx, hasComma } = itemEnds[idx];
                const isLast = idx === itemEnds.length - 1;

                const wantComma =
                    mode === 'always' ||
                    (mode === 'allButLast' && !isLast);

                if (wantComma && !hasComma) {
                    modifications.push({ index: contentIdx + 1, action: 'insert' });
                } else if (!wantComma && hasComma) {
                    modifications.push({ index: contentIdx, action: 'delete' });
                }
            }

            // Apply in reverse order so earlier indices are not shifted by later splices
            for (const mod of [...modifications].reverse()) {
                if (mod.action === 'insert') {
                    tokens.splice(mod.index, 0, {
                        kind: TokenKind.Comma,
                        text: ','
                    } as TokenWithStartIndex);
                } else {
                    tokens.splice(mod.index, 1);
                }
            }
        }

        return tokens;
    }

    /**
     * Returns the index of the last non-whitespace token before `endIndex` on the same line.
     * Returns `undefined` for blank lines (hits another Newline before finding any content).
     */
    private findLastContentTokenBefore(tokens: Token[], endIndex: number): number | undefined {
        for (let i = endIndex - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.kind === TokenKind.Whitespace) {
                continue;
            }
            if (t.kind === TokenKind.Newline) {
                return undefined; // blank line
            }
            return i;
        }
        return undefined;
    }
}
