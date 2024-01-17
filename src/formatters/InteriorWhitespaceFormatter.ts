import type { AALiteralExpression, AAMemberExpression, Parser, Token } from 'brighterscript';
import { createVisitor, WalkMode, TokenKind } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import { TokensBeforeNegativeNumericLiteral, NumericLiteralTokenKinds } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class InteriorWhitespaceFormatter {
    /**
     * Force all Whitespace between tokens to be exactly 1 space wide
     */
    public format(
        tokens: Token[],
        parser: Parser,
        options: FormattingOptions
    ) {
        let addBoth = [
            //assignments
            TokenKind.Equal,
            TokenKind.PlusEqual,
            TokenKind.MinusEqual,
            TokenKind.StarEqual,
            TokenKind.ForwardslashEqual,
            TokenKind.BackslashEqual,
            TokenKind.LeftShiftEqual,
            TokenKind.RightShiftEqual,

            //operators
            TokenKind.Plus,
            TokenKind.Minus,
            TokenKind.Star,
            TokenKind.Forwardslash,
            TokenKind.Backslash,
            TokenKind.Caret,
            TokenKind.LessGreater,
            TokenKind.LessEqual,
            TokenKind.GreaterEqual,
            TokenKind.Greater,
            TokenKind.Less,

            //keywords
            TokenKind.As
        ];
        let addLeft = [
            ...addBoth,
            TokenKind.RightCurlyBrace
        ];
        let addRight = [
            ...addBoth,
            TokenKind.LeftCurlyBrace,
            TokenKind.Comma,
            TokenKind.Colon,
            TokenKind.Import
        ];
        let removeBoth = [];
        let removeLeft = [
            ...removeBoth,
            TokenKind.Comma,
            TokenKind.RightSquareBracket,
            TokenKind.RightParen,
            TokenKind.PlusPlus,
            TokenKind.MinusMinus
        ];
        let removeRight = [
            ...removeBoth,
            TokenKind.LeftSquareBracket,
            TokenKind.LeftParen
        ];

        let isPastFirstTokenOfLine = false;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let nextTokenType: TokenKind | undefined = (tokens[i + 1] ? tokens[i + 1].kind : undefined);
            let previousTokenType: TokenKind | undefined = (tokens[i - 1] ? tokens[i - 1].kind : undefined);

            //reset token indicator on Newline
            if (token.kind === TokenKind.Newline) {
                isPastFirstTokenOfLine = false;
                continue;
            }
            //skip past leading Whitespace
            if (token.kind === TokenKind.Whitespace && isPastFirstTokenOfLine === false) {
                continue;
            }
            isPastFirstTokenOfLine = true;
            if (token.kind === TokenKind.Whitespace) {
                //force token to be exactly 1 space
                token.text = ' ';
            }
            if (token.kind === TokenKind.Dot && i > 0) {
                let whitespaceExistsOnTheLeft = true;
                // eslint-disable-next-line no-unmodified-loop-condition
                while (whitespaceExistsOnTheLeft === true) {
                    if (tokens[i - 1].kind === TokenKind.Whitespace) {
                        this.removeWhitespace(tokens, i - 1);
                        i--;
                    } else {
                        whitespaceExistsOnTheLeft = false;
                    }
                }
                let whitespaceExistsOnTheRight = true;
                // eslint-disable-next-line no-unmodified-loop-condition
                while (whitespaceExistsOnTheRight === true) {
                    if (tokens[i + 1].kind === TokenKind.Whitespace) {
                        this.removeWhitespace(tokens, i + 1);
                    } else {
                        whitespaceExistsOnTheRight = false;
                    }
                }
            }

            //pad any of these token types with a space to the right
            if (addRight.includes(token.kind)) {
                //special case: we want the negative sign to be directly beside a numeric, in certain cases.
                //we can't handle every case, but we can get close
                if (this.looksLikeNegativeNumericLiteral(tokens, i)) {
                    //throw out the space to the right of the minus symbol if present
                    if (i + 1 < tokens.length && tokens[i + 1].kind === TokenKind.Whitespace) {
                        this.removeWhitespace(tokens, i + 1);
                    }
                    //ensure a space token to the right, only if we have more tokens to the right available
                } else if (this.looksLikeNegativeVariable(tokens, i)) {
                    //throw out the space to the right of the minus symbol if present
                    if (i + 1 < tokens.length && tokens[i + 1].kind === TokenKind.Whitespace) {
                        this.removeWhitespace(tokens, i + 1);
                    }
                    //ensure a space token to the right, only if we have more tokens to the right available
                } else if (nextTokenType && ![TokenKind.Whitespace, TokenKind.Newline, TokenKind.Eof].includes(nextTokenType)) {
                    //don't add Whitespace if the next token is the Newline

                    tokens.splice(i + 1, 0, {
                        startIndex: -1,
                        kind: TokenKind.Whitespace,
                        text: ' '
                    } as TokenWithStartIndex);
                }
            }

            //pad any of these tokens with a space to the left
            if (
                addLeft.includes(token.kind) &&
                //don't add left for negative sign preceeded by a square brace or paren
                !(token.kind === TokenKind.Minus && previousTokenType && [TokenKind.LeftSquareBracket, TokenKind.LeftParen].includes(previousTokenType))
            ) {
                //ensure a space token to the left
                if (previousTokenType && previousTokenType !== TokenKind.Whitespace) {
                    tokens.splice(i, 0, {
                        startIndex: -1,
                        kind: TokenKind.Whitespace,
                        text: ' '
                    } as TokenWithStartIndex);
                    //increment i by 1 since we added a token
                    i++;
                }
            }

            //remove any space tokens on the right
            if (removeRight.includes(token.kind)) {
                if (nextTokenType === TokenKind.Whitespace) {
                    //remove the next token, which is the Whitespace token
                    tokens.splice(i + 1, 1);
                }
            }

            //remove any space tokens on the left
            if (removeLeft.includes(token.kind)) {
                if (previousTokenType === TokenKind.Whitespace) {
                    //remove the previous token, which is the Whitespace token
                    tokens.splice(i - 1, 1);
                    //backtrack the index since we just shifted the array
                    i--;
                }
            }
        }

        tokens = this.formatTokenSpacing(tokens, parser, options);
        return tokens;
    }

    /**
    * Format spacing between various tokens that are more specific than `formatInteriorWhitespace`
    */
    private formatTokenSpacing(
        tokens: Token[],
        parser: Parser,
        options: FormattingOptions
    ) {
        let i = 0;
        let token: Token = undefined as any;
        let nextNonWhitespaceToken: Token | undefined;
        const setIndex = (newValue) => {
            i = newValue;
            token = tokens[i];
            nextNonWhitespaceToken = util.getNextNonWhitespaceToken(tokens, i);
        };

        //handle special cases
        for (i; i < tokens.length; i++) {
            setIndex(i);

            //space to left of function parens?
            {
                let parenToken: Token | undefined;
                //look for anonymous functions
                if (token.kind === TokenKind.Function && nextNonWhitespaceToken && nextNonWhitespaceToken.kind === TokenKind.LeftParen) {
                    parenToken = nextNonWhitespaceToken;

                    //look for named functions
                } else if (token.kind === TokenKind.Function && nextNonWhitespaceToken && nextNonWhitespaceToken.kind === TokenKind.Identifier) {
                    //get the next non-Whitespace token, which SHOULD be the paren
                    let parenCandidate = util.getNextNonWhitespaceToken(tokens, tokens.indexOf(nextNonWhitespaceToken));
                    if (parenCandidate && parenCandidate.kind === TokenKind.LeftParen) {
                        parenToken = parenCandidate;
                    }
                }
                //if we found the paren token, handle spacing
                if (parenToken) {
                    //walk backwards, removing any Whitespace tokens found
                    this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(parenToken));
                    if (options.insertSpaceBeforeFunctionParenthesis) {
                        //insert a Whitespace token
                        tokens.splice(tokens.indexOf(parenToken), 0, {
                            kind: TokenKind.Whitespace,
                            text: ' ',
                            startIndex: -1
                        } as TokenWithStartIndex);
                    }
                    //next loop iteration should be after the open paren
                    setIndex(
                        tokens.indexOf(parenToken)
                    );
                }
            }

            //add/remove whitespace around curly braces
            {
                //start of non empty object
                if (
                    //is start of object
                    token.kind === TokenKind.LeftCurlyBrace &&
                    //there is some non-whitespace token to our right
                    util.getNextNonWhitespaceToken(tokens, i, true)?.kind
                ) {
                    let whitespaceToken = tokens[i + 1];

                    //this is never called because formatInteriorWhitespace already handles inserting this space
                    // //ensure there is a whitespace token in that position (make it 0-length for now)
                    // if (whitespaceToken && whitespaceToken.kind !== TokenKind.Whitespace) {
                    //     whitespaceToken = <any>{
                    //         kind: TokenKind.Whitespace,
                    //         startIndex: -1,
                    //         text: ''
                    //     };
                    //     tokens.splice(i, 0, whitespaceToken);
                    // }
                    //insert the space only if so configured
                    whitespaceToken.text = options.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces ? ' ' : '';
                }

                //end of non-empty object
                if (
                    //is end of object
                    token.kind === TokenKind.RightCurlyBrace &&
                    //there is some non-whitespace token to our left
                    util.getPreviousNonWhitespaceToken(tokens, i, true)
                ) {
                    let whitespaceToken = tokens[i - 1];
                    //this is never called because formatInteriorWhitespace already handles inserting this space
                    // //ensure there is a whitespace token in that position (make it 0-length for now)
                    // if (whitespaceToken && whitespaceToken.kind !== TokenKind.Whitespace) {
                    //     whitespaceToken = <any>{
                    //         kind: TokenKind.Whitespace,
                    //         startIndex: -1,
                    //         text: ''
                    //     };
                    //     tokens.splice(i - 1, 0, whitespaceToken);
                    // }
                    //insert the space only if so configured
                    whitespaceToken.text = options.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces ? ' ' : '';
                    //next loop iteration should be after the closing curly brace
                    setIndex(
                        tokens.indexOf(token)
                    );
                }
            }

            //empty curly braces
            if (token.kind === TokenKind.RightCurlyBrace && util.getPreviousNonWhitespaceToken(tokens, i, true)?.kind === TokenKind.LeftCurlyBrace) {
                this.removeWhitespaceTokensBackwards(tokens, i);
                tokens.splice(tokens.indexOf(token), 0, {
                    kind: TokenKind.Whitespace,
                    startIndex: -1,
                    text: options.insertSpaceBetweenEmptyCurlyBraces ? ' ' : ''
                } as TokenWithStartIndex);
                //next loop iteration should be after the closing curly brace
                setIndex(
                    tokens.indexOf(token)
                );
            }

            //empty parenthesis (user doesn't have this option, we will always do this one)
            if (token.kind === TokenKind.LeftParen && nextNonWhitespaceToken && nextNonWhitespaceToken.kind === TokenKind.RightParen) {
                this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(nextNonWhitespaceToken));
                //next loop iteration should be after the closing paren
                setIndex(
                    tokens.indexOf(nextNonWhitespaceToken)
                );
            }
        }

        tokens = this.formatSpaceBetweenAssociativeArrayLiteralKeyAndColon(tokens, parser, options);

        return tokens;
    }

    /**
     * Ensure exactly 1 or 0 spaces between all literal associative array keys and the colon after it
     */
    private formatSpaceBetweenAssociativeArrayLiteralKeyAndColon(tokens: Token[], parser: Parser, options: FormattingOptions) {
        const aaLiterals = [] as AALiteralExpression[];
        parser.ast.walk(createVisitor({
            AALiteralExpression: (expression) => {
                aaLiterals.push(expression);
            }
        }), {
            walkMode: WalkMode.visitAllRecursive
        });

        //find all of the AA literals
        for (let aaLiteral of aaLiterals) {
            for (let element of (aaLiteral.elements as AAMemberExpression[])) {
                //our target elements should have both `key` and `colon` and they should both be on the same line
                if (element.keyToken && element.colonToken && element.keyToken.range.end.line === element.colonToken.range.end.line) {
                    let whitespaceToken: Token;
                    let idx = tokens.indexOf(element.keyToken);
                    let nextToken = tokens[idx + 1];
                    if (nextToken.kind === TokenKind.Whitespace) {
                        whitespaceToken = nextToken;
                    } else {
                        whitespaceToken = <any>{
                            kind: TokenKind.Whitespace,
                            text: ''
                        };
                        tokens.splice(idx + 1, 0, whitespaceToken);
                    }
                    whitespaceToken.text = options.insertSpaceBetweenAssociativeArrayLiteralKeyAndColon === true ? ' ' : '';
                }
            }
        }
        return tokens;
    }

    /**
     * Remove Whitespace tokens backwards until a non-Whitespace token is encountered
     * @param startIndex the index of the non-Whitespace token to start with. This function will start iterating at `startIndex - 1`
     */
    private removeWhitespaceTokensBackwards(tokens: Token[], startIndex: number) {
        let removeCount = 0;
        let i = startIndex - 1;
        while (tokens[i--].kind === TokenKind.Whitespace) {
            removeCount++;
        }
        tokens.splice(startIndex - removeCount, removeCount);
    }

    /**
     * Determine if the current token appears to be the negative sign for a variable identifier token
     */
    private looksLikeNegativeVariable(tokens: Token[], index: number) {
        let thisToken = tokens[index];
        if (thisToken.kind === TokenKind.Minus) {
            let nextToken = util.getNextNonWhitespaceToken(tokens, index);
            let previousToken = util.getPreviousNonWhitespaceToken(tokens, index);
            if (
                nextToken &&
                //next non-Whitespace token is an identifier
                nextToken.kind === TokenKind.Identifier &&
                previousToken &&
                TokensBeforeNegativeNumericLiteral.includes(previousToken.kind)
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remove Whitespace until the next non-Whitespace character.
     * This operates on the array itself
     */
    public removeWhitespace(tokens: Token[], index: number) {
        while (tokens[index] && tokens[index].kind === TokenKind.Whitespace) {
            tokens.splice(index, 1);
        }
    }

    /**
     * Determine if the current token appears to be the negative sign for a numeric literal
     */
    public looksLikeNegativeNumericLiteral(tokens: Token[], index: number) {
        let thisToken = tokens[index];
        if (thisToken.kind === TokenKind.Minus) {
            let nextToken = util.getNextNonWhitespaceToken(tokens, index);
            let previousToken = util.getPreviousNonWhitespaceToken(tokens, index);
            if (
                nextToken &&
                //next non-Whitespace token is a numeric literal
                NumericLiteralTokenKinds.includes(nextToken.kind) &&
                previousToken &&
                TokensBeforeNegativeNumericLiteral.includes(previousToken.kind)
            ) {
                return true;
            }
        }
        return false;
    }
}
