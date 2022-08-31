import type { Token } from 'brighterscript';
import { createToken, TokenKind } from 'brighterscript';
import { CompositeKeywords } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class CompositeKeywordFormatter {
    /**
     * Handle indentation for an array of tokens
     */
    public process(tokens: Token[], options: FormattingOptions) {
        let indexOffset = 0;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            (token as any).startIndex += indexOffset;
            let previousNonWhitespaceToken = util.getPreviousNonWhitespaceToken(tokens, i);
            let nextNonWhitespaceToken = util.getNextNonWhitespaceToken(tokens, i);
            if (
                //is this a composite token
                CompositeKeywords.includes(token.kind) &&
                //is not being used as a key in an AA literal
                (!nextNonWhitespaceToken || nextNonWhitespaceToken.kind !== TokenKind.Colon) &&
                //is not being used as an object key
                previousNonWhitespaceToken?.kind !== TokenKind.Dot
            ) {
                let parts = this.getCompositeKeywordParts(token);
                let tokenValue = token.text;
                //remove separating Whitespace
                if (options.compositeKeywords === 'combine') {
                    token.text = parts[0] + parts[1];

                    //separate with exactly 1 space
                } else if (options.compositeKeywords === 'split') {
                    token.text = parts[0] + ' ' + parts[1];

                } else {
                    //do nothing
                }
                let offsetDifference = token.text.length - tokenValue.length;
                indexOffset += offsetDifference;

                //`else if` is a special case
            } else if (token.kind === TokenKind.Else && nextNonWhitespaceToken && nextNonWhitespaceToken.kind === TokenKind.If) {
                const nextToken = tokens[i + 1];

                //remove separating Whitespace
                if (options.compositeKeywords === 'combine') {
                    //if there is a whitespace token between the `else` and `if`
                    if (nextToken.kind === TokenKind.Whitespace) {
                        //remove the whitespace token
                        tokens.splice(i + 1, 1);
                    }

                    //separate with exactly 1 space
                } else if (options.compositeKeywords === 'split') {
                    if (nextToken.kind !== TokenKind.Whitespace) {
                        tokens.splice(i + 1, 0, createToken(TokenKind.Whitespace, ' '));
                    } else {
                        nextToken.text = ' ';
                    }
                }
            }
        }
        return tokens;
    }

    private getCompositeKeywordParts(token: Token) {
        let lowerValue = token.text.toLowerCase();
        //split the parts of the token, but retain their case
        if (lowerValue.startsWith('end')) {
            return [token.text.substring(0, 3), token.text.substring(3).trim()];
        } else if (lowerValue.startsWith('#else')) {
            return [token.text.substring(0, 5), token.text.substring(5).trim()];
        } else {
            return [token.text.substring(0, 4), token.text.substring(4).trim()];
        }
    }
}
