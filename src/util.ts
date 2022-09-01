import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';

export class Util {
    /**
     * Get the tokens for the whole line starting at the given index (including the Newline or EOF token at the end)
     * @param startIndex
     * @param tokens
     */
    public getLineTokens(startIndex: number, tokens: Token[]) {
        let outputTokens: Token[] = [];
        let index = startIndex;
        for (index = startIndex; index < tokens.length; index++) {
            let token = tokens[index];
            outputTokens[outputTokens.length] = token;

            if (
                token.kind === TokenKind.Newline ||
                token.kind === TokenKind.Eof
            ) {
                break;
            }
        }
        return {
            startIndex: startIndex,
            stopIndex: index,
            tokens: outputTokens
        };
    }

    /**
     * Get the first token before the index that is NOT Whitespace
     */
    public getPreviousNonWhitespaceToken(tokens: Token[], startIndex: number, stopAtNewline = false) {
        for (let i = startIndex - 1; i > -1; i--) {
            let token = tokens[i];
            if (stopAtNewline && token.kind === TokenKind.Newline) {
                return;
            }
            if (token && token.kind !== TokenKind.Whitespace) {
                return tokens[i];
            }
        }
    }

    /**
     * Get the first token after the index that is NOT Whitespace. Returns undefined if stopAtNewLine===true and found a newline,
     * or if we found the EOF token
     */
    public getNextNonWhitespaceToken(tokens: Token[], index: number, stopAtNewLine = false) {
        if (index < 0) {
            return;
        }
        for (index += 1; index < tokens.length; index++) {
            let token = tokens[index];
            if (stopAtNewLine && token && token.kind === TokenKind.Newline) {
                return;
            }
            if (token && token.kind !== TokenKind.Whitespace) {
                return token;
            }
        }
    }

    /**
     * Find the matching closing token for open square or open curly
     */
    public getClosingToken(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
        let openCount = 0;
        for (let i = currentIndex; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.kind === openKind) {
                openCount++;
            } else if (token.kind === closeKind) {
                openCount--;
            }
            if (openCount === 0) {
                return token;
            }
        }
    }

    /**
     * Helper function used to print the tokens to console
     */
    public printTokens(tokens: Token[]) {
        const text = tokens.map(x => x.text.replace(/ /g, '•').replace(/\t/g, '→')).join('');
        console.log(text);
        return text;
    }

    /**
     * Merge multiple side-by-side whitespace tokens into a single token containing all the whitespace.
     * @param tokens the array of tokens to modify in-place
     * @param leadingOnly stop processing if a non-whitespace token is encountered
     */
    public dedupeWhitespace(tokens: Token[], leadingOnly = false) {
        for (let i = 0; i < tokens.length; i++) {
            let currentToken = tokens[i];
            let nextToken = tokens[i + 1] ? tokens[i + 1] : { kind: undefined, text: '' };
            if (currentToken.kind === TokenKind.Whitespace && nextToken.kind === TokenKind.Whitespace) {
                currentToken.text += nextToken.text;
                tokens.splice(i + 1, 1);
                //decrement the counter so we process this token again so it can absorb more Whitespace tokens
                i--;
            } else if (leadingOnly) {
                return;
            }
        }
    }
}

const util = new Util();
export { util };
