import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import { util } from '../util';

export class MultiLineItemFormatter {
    /**
     * Handle indentation for an array of tokens
     */
    public process(tokens: Token[]) {
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let openKind: TokenKind | undefined;
            let closeKind: TokenKind | undefined;

            if (token.kind === TokenKind.LeftCurlyBrace) {
                openKind = TokenKind.LeftCurlyBrace;
                closeKind = TokenKind.RightCurlyBrace;
            } else if (token.kind === TokenKind.LeftSquareBracket) {
                openKind = TokenKind.LeftSquareBracket;
                closeKind = TokenKind.RightSquareBracket;
            }

            let nextNonWhitespaceToken = util.getNextNonWhitespaceToken(tokens, i, true);
            //move contents to new line if this is a multi-line array or AA
            if (
                //is open curly or open square
                openKind && closeKind &&
                //is a multi-line array or AA
                !this.isStartofSingleLineArrayOrAA(tokens, i, openKind, closeKind) &&
                //there is extra stuff on this line that is not the end of the file
                nextNonWhitespaceToken && nextNonWhitespaceToken.kind !== TokenKind.Eof &&
                //is NOT array like `[[ ...\n ]]`, or `[{ ...\n }]`)
                !this.isMatchingDoubleArrayOrArrayCurly(tokens, i)
            ) {
                tokens.splice(i + 1, 0, {
                    kind: TokenKind.Newline,
                    text: '\n'
                } as TokenWithStartIndex);
                let closingToken = util.getClosingToken(tokens, i, openKind, closeKind);
                /* istanbul ignore next */
                let closingTokenKindex = closingToken ? tokens.indexOf(closingToken) : -1;

                i++;

                //if there's stuff before the closer, move it to a newline
                if (util.getPreviousNonWhitespaceToken(tokens, closingTokenKindex, true)) {
                    tokens.splice(closingTokenKindex, 0, {
                        kind: TokenKind.Newline,
                        text: '\n'
                    } as TokenWithStartIndex);
                }
            }
        }
        return tokens;
    }

    /**
     * Determines if the current index is the start of a single-line array or AA.
     * Walks forward until we find the equal number of open and close curlies/squares, or a newline
     */
    public isStartofSingleLineArrayOrAA(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
        let openCount = 0;
        for (let i = currentIndex; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.kind === openKind) {
                openCount++;
            } else if (token.kind === closeKind) {
                openCount--;
            }
            if (openCount === 0) {
                return true;
            } else if (token.kind === TokenKind.Newline) {
                return false;
            }
        }
        return false;
    }

    public isMatchingDoubleArrayOrArrayCurly(tokens: Token[], currentIndex: number) {
        let token = tokens[currentIndex];
        let nextNonWhitespaceToken = util.getNextNonWhitespaceToken(tokens, currentIndex, true);
        //don't separate multiple open/close pairs
        if (
            //is open array
            token.kind === TokenKind.LeftSquareBracket &&
            //there is another token on this line
            nextNonWhitespaceToken &&
            //is next token an open array or open object
            (nextNonWhitespaceToken.kind === TokenKind.LeftSquareBracket || nextNonWhitespaceToken.kind === TokenKind.LeftCurlyBrace)
        ) {
            let closingToken = util.getClosingToken(tokens, currentIndex, TokenKind.LeftSquareBracket, TokenKind.RightSquareBracket);
            //look at the previous token
            let previous = closingToken && util.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(closingToken), true);
            /* istanbul ignore else (because I can't figure out how to make this happen but I think it's still necessary) */
            if (previous && (previous.kind === TokenKind.RightSquareBracket || previous.kind === TokenKind.RightCurlyBrace)) {
                return true;
            }
        }
    }
}
