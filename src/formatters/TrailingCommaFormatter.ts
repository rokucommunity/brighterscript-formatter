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

            // Only process multi-line arrays/AAs (ones that contain a Newline between brackets)
            const closingToken = util.getClosingToken(tokens, i, openKind, closeKind);
            if (!closingToken) {
                continue;
            }
            const closeIndex = tokens.indexOf(closingToken);
            const isMultiLine = tokens.slice(i, closeIndex).some(t => t.kind === TokenKind.Newline);
            if (!isMultiLine) {
                continue;
            }

            // Find the last non-whitespace, non-newline token before the closing bracket
            const lastItemToken = this.getPreviousContentToken(tokens, closeIndex);
            if (!lastItemToken) {
                continue;
            }
            const lastItemIndex = tokens.indexOf(lastItemToken);

            // Skip empty collections
            if (lastItemToken.kind === openKind) {
                continue;
            }

            if (mode === 'always') {
                if (lastItemToken.kind !== TokenKind.Comma) {
                    // Insert a comma after the last item token
                    tokens.splice(lastItemIndex + 1, 0, {
                        kind: TokenKind.Comma,
                        text: ','
                    } as TokenWithStartIndex);
                }
            } else if (mode === 'never') {
                if (lastItemToken.kind === TokenKind.Comma) {
                    tokens.splice(lastItemIndex, 1);
                }
            }
        }
        return tokens;
    }

    /** Like getPreviousNonWhitespaceToken but also skips Newline tokens */
    private getPreviousContentToken(tokens: Token[], startIndex: number): Token | undefined {
        for (let i = startIndex - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.kind !== TokenKind.Whitespace && t.kind !== TokenKind.Newline) {
                return t;
            }
        }
    }
}
