import {
    BrightScriptLexer,
    CompositeKeywordTokenTypes,
    KeywordTokenTypes,
    Token,
    TokenType
} from 'brightscript-parser';
import * as trimRight from 'trim-right';

import { FormattingOptions } from './FormattingOptions';

export class Formatter {
    constructor() { }
    /**
     * The default number of spaces when indenting with spaces
     */
    private static DEFAULT_INDENT_SPACE_COUNT = 4;
    /**
     * Format the given input.
     * @param inputText the text to format
     * @param formattingOptions options specifying formatting preferences
     */
    public format(inputText: string, formattingOptions?: FormattingOptions) {
        let options = this.normalizeOptions(formattingOptions);
        let lexer = new BrightScriptLexer();
        let tokens = lexer.tokenize(inputText);

        //force all composite keywords to have 0 or 1 spaces in between, but no more than 1
        tokens = this.normalizeCompositeKeywords(tokens);

        if (options.compositeKeywords) {
            tokens = this.formatCompositeKeywords(tokens, options);
        }

        tokens = this.formatKeywordCase(tokens, options);

        if (options.removeTrailingWhiteSpace) {
            tokens = this.formatTrailingWhiteSpace(tokens, options);
        }

        if (options.formatInteriorWhitespace) {
            tokens = this.formatInteriorWhitespace(tokens, options);
        }

        //dedupe side-by-side whitespace tokens
        this.dedupeWhitespace(tokens);

        if (options.formatIndent) {
            tokens = this.formatIndentation(tokens, options);
        }

        //join all tokens back together into a single string
        let outputText = '';
        for (let token of tokens) {
            outputText += token.value;
        }
        return outputText;
    }

    /**
     * Remove all whitespace in the composite keyword tokens with a single space
     * @param tokens
     */
    private normalizeCompositeKeywords(tokens: Token[]) {
        let indexOffset = 0;
        for (let token of tokens) {
            token.startIndex += indexOffset;
            //is this a composite token
            if (CompositeKeywordTokenTypes.indexOf(token.tokenType) > -1) {
                let value = token.value;
                //remove all whitespace with a single space
                token.value.replace(/s+/g, ' ');
                let indexDifference = value.length - token.value.length;
                indexOffset -= indexDifference;
            }
        }
        return tokens;
    }

    private dedupeWhitespace(tokens: Token[]) {
        for (let i = 0; i < tokens.length; i++) {
            let currentToken = tokens[i];
            let nextToken = tokens[i + 1] ? tokens[i + 1] : { tokenType: undefined, value: '' };
            if (currentToken.tokenType === TokenType.whitespace && nextToken.tokenType === TokenType.whitespace) {
                currentToken.value += nextToken.value;
                tokens.splice(i + 1, 1);
                //decrement the counter so we process this token again so it can absorb more whitespace tokens
                i--;
            }
        }
    }

    private formatCompositeKeywords(tokens: Token[], options: FormattingOptions) {
        let indexOffset = 0;
        for (let token of tokens) {
            token.startIndex += indexOffset;
            //is this a composite token
            if (CompositeKeywordTokenTypes.indexOf(token.tokenType) > -1) {
                let parts = this.getCompositeKeywordParts(token);
                let tokenValue = token.value;
                if (options.compositeKeywords === 'combine') {
                    token.value = parts[0] + parts[1];
                } else if (options.compositeKeywords === 'split') {
                    // if(options.compositeKeywords === 'split'){
                    token.value = parts[0] + ' ' + parts[1];
                } else {
                    //do nothing
                }
                let offsetDifference = token.value.length - tokenValue.length;
                indexOffset += offsetDifference;
            }
        }
        return tokens;
    }

    private getCompositeKeywordParts(token: Token) {
        let lowerValue = token.value.toLowerCase();
        //split the parts of the token, but retain their case
        if (lowerValue.indexOf('end') === 0) {
            return [token.value.substring(0, 3), token.value.substring(3).trim()];
        } else if (lowerValue.indexOf('#else') === 0) {
            return [token.value.substring(0, 5), token.value.substring(5).trim()];
        } else {
            // if (lowerValue.indexOf('exit') === 0 || lowerValue.indexOf('else') === 0) {
            return [token.value.substring(0, 4), token.value.substring(4).trim()];
        }
    }

    /**
     * Determine if the token is a type keyword (meaing preceeded by `as` token)
     * @param token
     */
    private isType(tokens: Token[], token: Token) {
        let previousToken = this.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(token));
        if (previousToken && previousToken.value.toLowerCase() === 'as') {
            return true;
        } else {
            return false;
        }
    }

    private formatKeywordCase(tokens: Token[], options: FormattingOptions) {
        for (let token of tokens) {

            //if this token is a keyword
            if (KeywordTokenTypes.indexOf(token.tokenType) > -1) {
                //a token is a type if it's preceeded by an `as` token
                let isType = this.isType(tokens, token);

                let keywordCase: FormattingOptions['keywordCase'];

                if (isType) {
                    keywordCase = options.typeCase;
                } else {
                    keywordCase = options.keywordCase;
                    //if this is an overridable keyword, use that override instead
                    if (options.keywordCaseOverride && options.keywordCaseOverride[token.tokenType] !== undefined) {
                        keywordCase = options.keywordCaseOverride[token.tokenType];
                    }
                }
                switch (keywordCase) {
                    case 'lower':
                        token.value = token.value.toLowerCase();
                        break;
                    case 'upper':
                        token.value = token.value.toUpperCase();
                        break;
                    case 'title':
                        let lowerValue = token.value.toLowerCase();
                        if (CompositeKeywordTokenTypes.indexOf(token.tokenType) === -1) {
                            token.value =
                                token.value.substring(0, 1).toUpperCase() +
                                token.value.substring(1).toLowerCase();
                        } else {
                            let spaceCharCount = (lowerValue.match(/\s+/) || []).length;
                            let firstWordLength: number = 0;
                            if (lowerValue.indexOf('end') === 0) {
                                firstWordLength = 3;
                            } else {
                                //if (lowerValue.indexOf('exit') > -1 || lowerValue.indexOf('else') > -1)
                                firstWordLength = 4;
                            }
                            token.value =
                                //first character
                                token.value.substring(0, 1).toUpperCase() +
                                //rest of first word
                                token.value.substring(1, firstWordLength).toLowerCase() +
                                //add back the whitespace
                                token.value.substring(
                                    firstWordLength,
                                    firstWordLength + spaceCharCount
                                ) +
                                //first character of second word
                                token.value
                                    .substring(
                                        firstWordLength + spaceCharCount,
                                        firstWordLength + spaceCharCount + 1
                                    )
                                    .toUpperCase() +
                                //rest of second word
                                token.value
                                    .substring(firstWordLength + spaceCharCount + 1)
                                    .toLowerCase();
                        }
                    case 'original':
                    case null:
                    case undefined:
                    default:
                        //do nothing
                        break;

                }
            }
        }
        return tokens;
    }

    private formatIndentation(tokens: Token[], options: FormattingOptions) {
        let indentTokens = [
            TokenType.sub,
            TokenType.for,
            TokenType.function,
            TokenType.if,
            TokenType.openCurlyBraceSymbol,
            TokenType.openSquareBraceSymbol,
            TokenType.while,
            TokenType.condIf
        ];
        let outdentTokens = [
            TokenType.closeCurlyBraceSymbol,
            TokenType.closeSquareBraceSymbol,
            TokenType.endFunction,
            TokenType.endIf,
            TokenType.endSub,
            TokenType.endWhile,
            TokenType.endFor,
            TokenType.next,
            TokenType.condEndIf
        ];
        let interumTokens = [
            TokenType.else,
            TokenType.elseIf,
            TokenType.condElse,
            TokenType.condElseIf
        ];
        let tabCount = 0;

        let nextLineStartTokenIndex = 0;
        //the list of output tokens
        let outputTokens: Token[] = [];
        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        outer: for (let outerLoopCounter = 0; outerLoopCounter <= tokens.length * 2; outerLoopCounter++) {
            let lineObj = this.getLineTokens(nextLineStartTokenIndex, tokens);

            nextLineStartTokenIndex = lineObj.stopIndex + 1;
            let lineTokens = lineObj.tokens;
            let thisTabCount = tabCount;
            let foundIndentorThisLine = false;

            //if this is a single-line if statement, do nothing with indentation
            if (this.isSingleLineIfStatement(lineTokens, tokens)) {
                // //if this line has a return statement, outdent
                // if (this.tokenIndexOf(TokenType.return, lineTokens) > -1) {
                //     tabCount--;
                // } else {
                //     //do nothing with single-line if statement indentation
                // }
            } else {
                inner: for (let i = 0; i < lineTokens.length; i++) {
                    let token = lineTokens[i];
                    let previousNonWhitespaceToken = this.getPreviousNonWhitespaceToken(lineTokens, i);

                    //if this is an indentor token,
                    if (indentTokens.indexOf(token.tokenType) > -1) {
                        //skip indent for 'function'|'sub' used as type (preceeded by `as` keyword)
                        if (
                            (token.tokenType === TokenType.function || token.tokenType === TokenType.sub) &&
                            //the previous token will be whitespace, so verify that previousPrevious is 'as'
                            previousNonWhitespaceToken && previousNonWhitespaceToken.value.toLowerCase() === 'as'
                        ) {
                            continue inner;
                        }
                        tabCount++;
                        foundIndentorThisLine = true;

                        //this is an outdentor token
                    } else if (outdentTokens.indexOf(token.tokenType) > -1) {
                        tabCount--;
                        if (foundIndentorThisLine === false) {
                            thisTabCount--;
                        }

                        //this is an interum token
                    } else if (interumTokens.indexOf(token.tokenType) > -1) {
                        //these need outdented, but don't change the tabCount
                        thisTabCount--;
                    }
                    //  else if (token.tokenType === TokenType.return && foundIndentorThisLine) {
                    //     //a return statement on the same line as an indentor means we don't want to indent
                    //     tabCount--;
                    // }
                }
            }
            //if the tab counts are less than zero, something is wrong. However, at least try to do formatting as best we can by resetting to 0
            thisTabCount = thisTabCount < 0 ? 0 : thisTabCount;
            tabCount = tabCount < 0 ? 0 : tabCount;

            let leadingWhitespace: string;

            if (options.indentStyle === 'spaces') {
                let indentSpaceCount = options.indentSpaceCount
                    ? options.indentSpaceCount
                    : Formatter.DEFAULT_INDENT_SPACE_COUNT;
                let spaceCount = thisTabCount * indentSpaceCount;
                leadingWhitespace = Array(spaceCount + 1).join(' ');
            } else {
                leadingWhitespace = Array(thisTabCount + 1).join('\t');
            }
            //create a whitespace token if there isn't one
            if (lineTokens[0] && lineTokens[0].tokenType !== TokenType.whitespace) {
                lineTokens.unshift({
                    startIndex: -1,
                    tokenType: TokenType.whitespace,
                    value: ''
                });
            }

            //replace the whitespace with the formatted whitespace
            lineTokens[0].value = leadingWhitespace;

            //add this list of tokens
            outputTokens.push.apply(outputTokens, lineTokens);
            //if we have found the end of file
            if (
                lineTokens[lineTokens.length - 1].tokenType === TokenType.END_OF_FILE
            ) {
                break outer;
            }
            /* istanbul ignore next */
            if (outerLoopCounter === tokens.length * 2) {
                throw new Error('Something went terribly wrong');
            }
        }
        return outputTokens;
    }

    /**
     * Force all whitespace between tokens to be exactly 1 space wide
     */
    private formatInteriorWhitespace(
        tokens: Token[],
        options: FormattingOptions
    ) {
        let addBoth = [
            //assignments
            TokenType.equalSymbol,
            TokenType.additionAssignmentSymbol,
            TokenType.subtractionAssignmentSymbol,
            TokenType.multiplicationAssignmentSymbol,
            TokenType.divisionAssignmentSymbol,
            TokenType.integerDivisionAssignmentSymbol,
            TokenType.lessThanLessThanEqualSymbol,
            TokenType.greaterThanGreaterThanEqualSymbol,

            //operators
            TokenType.plusSymbol,
            TokenType.minusSymbol,
            TokenType.asteriskSymbol,
            TokenType.forwardSlashSymbol,
            TokenType.backSlashSymbol,
            TokenType.carotSymbol,
            TokenType.notEqual,
            TokenType.lessThanOrEqual,
            TokenType.greaterThanOrEqual,
            TokenType.greaterThanSymbol,
            TokenType.lessThanSymbol,
        ];
        let addLeft = [
            ...addBoth,
            TokenType.closeCurlyBraceSymbol
        ];
        let addRight = [
            ...addBoth,
            TokenType.openCurlyBraceSymbol,
            TokenType.commaSymbol,
            TokenType.colonSymbol
        ];
        let removeBoth = [];
        let removeLeft = [
            ...removeBoth,
            TokenType.closeSquareBraceSymbol,
            TokenType.closeParenSymbol
        ];
        let removeRight = [
            ...removeBoth,
            TokenType.openSquareBraceSymbol,
            TokenType.openParenSymbol
        ];

        let isPastFirstTokenOfLine = false;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let nextTokenType: TokenType = <any>(tokens[i + 1] ? tokens[i + 1].tokenType : undefined);
            let previousTokenType: TokenType = <any>(tokens[i - 1] ? tokens[i - 1].tokenType : undefined);

            //reset token indicator on newline
            if (token.tokenType === TokenType.newline) {
                isPastFirstTokenOfLine = false;
                continue;
            }
            //skip past leading whitespace
            if (token.tokenType === TokenType.whitespace && isPastFirstTokenOfLine === false) {
                continue;
            }
            isPastFirstTokenOfLine = true;
            //force token to be exactly 1 space
            if (token.tokenType === TokenType.whitespace) {
                token.value = ' ';
            }

            //pad any of these token types with a space to the right
            if (addRight.indexOf(token.tokenType) > -1) {
                //special case: we want the negative sign to be directly beside a numeric, in certain cases.
                //we can't handle every case, but we can get close
                if (this.looksLikeNegativeNumericLiteral(tokens, i)) {
                    //throw out the space to the right of the minus symbol if present
                    if (i + 1 < tokens.length && tokens[i + 1].tokenType === TokenType.whitespace) {
                        this.removeWhitespace(tokens, i + 1);
                    }
                    //ensure a space token to the right, only if we have more tokens to the right available
                } else if ([TokenType.whitespace, TokenType.newline, TokenType.END_OF_FILE].indexOf(nextTokenType) === -1) {
                    //don't add whitespace if the next token is the newline

                    tokens.splice(i + 1, 0, {
                        startIndex: -1,
                        tokenType: TokenType.whitespace,
                        value: ' '
                    });
                }
            }

            //pad any of these tokens with a space to the left
            if (addLeft.indexOf(token.tokenType) > -1) {
                //ensure a space token to the left
                if (previousTokenType && previousTokenType !== TokenType.whitespace) {
                    tokens.splice(i, 0, {
                        startIndex: -1,
                        tokenType: TokenType.whitespace,
                        value: ' '
                    });
                    //increment i by 1 since we added a token
                    i++;
                }
            }

            //remove any space tokens on the right
            if (removeRight.indexOf(token.tokenType) > -1) {
                if (nextTokenType === TokenType.whitespace) {
                    //remove the next token, which is the whitespace token
                    tokens.splice(i + 1, 1);
                }
            }

            //remove any space tokens on the left
            if (removeLeft.indexOf(token.tokenType) > -1) {
                if (previousTokenType === TokenType.whitespace) {
                    //remove the previous token, which is the whitespace token
                    tokens.splice(i - 1, 1);
                    //backtrack the index since we just shifted the array
                    i--;
                }
            }
        }

        //handle special cases
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, i);

            //space to left of function parens?
            {
                let parenToken: Token | undefined;
                //look for anonymous functions
                if (token.tokenType === TokenType.function && nextNonWhitespaceToken.tokenType === TokenType.openParenSymbol) {
                    parenToken = nextNonWhitespaceToken;

                    //look for named functions
                } else if (token.tokenType === TokenType.function && nextNonWhitespaceToken.tokenType === TokenType.identifier) {
                    //get the next non-whitespace token, which SHOULD be the paren
                    let parenCandidate = this.getNextNonWhitespaceToken(tokens, tokens.indexOf(nextNonWhitespaceToken));
                    if (parenCandidate.tokenType === TokenType.openParenSymbol) {
                        parenToken = parenCandidate;
                    }
                }
                //if we found the paren token, handle spacing
                if (parenToken) {
                    //walk backwards, removing any whitespace tokens found
                    this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(parenToken));
                    if (options.insertSpaceBeforeFunctionParenthesis) {
                        //insert a whitespace token
                        tokens.splice(tokens.indexOf(parenToken), 0, {
                            tokenType: TokenType.whitespace,
                            value: ' ',
                            startIndex: -1
                        });
                    }
                    //next loop iteration should be after the open paren
                    i = tokens.indexOf(parenToken);
                }
            }

            //empty curly braces
            if (token.tokenType === TokenType.openCurlyBraceSymbol && nextNonWhitespaceToken.tokenType === TokenType.closeCurlyBraceSymbol) {
                this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(nextNonWhitespaceToken));
                if (options.insertSpaceBetweenEmptyCurlyBraces) {
                    tokens.splice(tokens.indexOf(nextNonWhitespaceToken), 0, {
                        tokenType: TokenType.whitespace,
                        startIndex: -1,
                        value: ' '
                    });
                    //next loop iteration should be after the closing curly brace
                    i = tokens.indexOf(nextNonWhitespaceToken);
                }
            }

            //empty parenthesis (user doesn't have this option, we will always do this one)
            if (token.tokenType === TokenType.openParenSymbol && nextNonWhitespaceToken.tokenType === TokenType.closeParenSymbol) {
                this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(nextNonWhitespaceToken));
                //next loop iteration should be after the closing paren
                i = tokens.indexOf(nextNonWhitespaceToken);
            }

        }
        return tokens;
    }

    /**
     * Remove whitespace tokens backwards until a non-whitespace token is encountered
     * @param startIndex the index of the non-whitespace token to start with. This function will start iterating at `startIndex - 1`
     */
    private removeWhitespaceTokensBackwards(tokens: Token[], startIndex: number) {
        let removeCount = 0;
        let i = startIndex - 1;
        while (tokens[i--].tokenType === TokenType.whitespace) {
            removeCount++;
        }
        tokens.splice(startIndex - removeCount, removeCount);
    }

    /**
     * Remove whitespace until the next non-whitespace character.
     * This operates on the array itself
     */
    private removeWhitespace(tokens: Token[], index: number) {
        while (tokens[index] && tokens[index].tokenType === TokenType.whitespace) {
            tokens.splice(index, 1);
            index++;
        }
    }

    /**
     * Anytime one of these tokens are found before a minus sign,
     * we can safely assume the minus sign is associated with a negative numeric literal
     */
    private static tokensBeforeNegativeNumericLiteral = [
        TokenType.plusSymbol,
        TokenType.minusSymbol,
        TokenType.asteriskSymbol,
        TokenType.forwardSlashSymbol,
        TokenType.backSlashSymbol,
        TokenType.additionAssignmentSymbol,
        TokenType.divisionAssignmentSymbol,
        TokenType.subtractionAssignmentSymbol,
        TokenType.multiplicationAssignmentSymbol,
        TokenType.integerDivisionAssignmentSymbol,
        TokenType.equalSymbol,
        TokenType.notEqual,
        TokenType.greaterThanSymbol,
        TokenType.greaterThanOrEqual,
        TokenType.lessThanSymbol,
        TokenType.lessThanOrEqual,
        TokenType.lessThanLessThanEqualSymbol,
        TokenType.greaterThanGreaterThanEqualSymbol,
        TokenType.return,
        TokenType.to,
        TokenType.step,
        TokenType.colonSymbol,
        TokenType.semicolonSymbol
    ];

    /**
     * Determine if the current token appears to be the negative sign for a numeric leteral
     */
    private looksLikeNegativeNumericLiteral(tokens: Token[], index: number) {
        let thisToken = tokens[index];
        if (thisToken.tokenType === TokenType.minusSymbol) {
            let nextToken = this.getNextNonWhitespaceToken(tokens, index);
            let previousToken = this.getPreviousNonWhitespaceToken(tokens, index);
            if (
                //next non-whitespace token is a numeric literal
                nextToken && nextToken.tokenType === TokenType.numberLiteral &&
                previousToken && Formatter.tokensBeforeNegativeNumericLiteral.indexOf(previousToken.tokenType) > -1
            ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the first token after the index that is NOT whitespace
     */
    private getNextNonWhitespaceToken(tokens: Token[], index: number) {
        for (index = index + 1; index < tokens.length; index++) {
            if (tokens[index] && tokens[index].tokenType !== TokenType.whitespace) {
                return tokens[index];
            }
        }
        //if we got here, we ran out of tokens. Return the EOF token
        return tokens[tokens.length - 1];
    }

    /**
     * Get the first token before the index that is NOT whitespace
     */
    private getPreviousNonWhitespaceToken(tokens: Token[], startIndex: number) {
        for (let i = startIndex - 1; i > -1; i--) {
            if (tokens[i] && tokens[i].tokenType !== TokenType.whitespace) {
                return tokens[i];
            }
        }
    }

    /**
     * Remove all trailing whitespace
     */
    private formatTrailingWhiteSpace(
        tokens: Token[],
        options: FormattingOptions
    ) {
        let nextLineStartTokenIndex = 0;
        //the list of output tokens
        let outputTokens: Token[] = [];

        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        for (let outerLoopCounter = 0; outerLoopCounter <= tokens.length * 2; outerLoopCounter++) {
            let lineObj = this.getLineTokens(nextLineStartTokenIndex, tokens);

            nextLineStartTokenIndex = lineObj.stopIndex + 1;
            let lineTokens = lineObj.tokens;
            //the last token is newline or EOF, so the next-to-last token is where the trailing whitespace would reside
            let potentialWhitespaceTokenIndex = lineTokens.length - 2;

            let whitespaceTokenCandidate = lineTokens[potentialWhitespaceTokenIndex];

            //empty lines won't have any tokens
            if (whitespaceTokenCandidate) {
                //if the final token is whitespace, throw it away
                if (whitespaceTokenCandidate.tokenType === TokenType.whitespace) {
                    lineTokens.splice(potentialWhitespaceTokenIndex, 1);

                    //if the final token is a comment, trim the whitespace from the righthand side
                } else if (
                    whitespaceTokenCandidate.tokenType === TokenType.quoteComment ||
                    whitespaceTokenCandidate.tokenType === TokenType.remComment
                ) {
                    whitespaceTokenCandidate.value = trimRight(
                        whitespaceTokenCandidate.value
                    );
                }
            }

            //add this line to the output
            outputTokens.push.apply(outputTokens, lineTokens);

            //if we have found the end of file, quit the loop
            if (
                lineTokens[lineTokens.length - 1].tokenType === TokenType.END_OF_FILE
            ) {
                break;
            }
        }
        return outputTokens;
    }

    private tokenIndexOf(tokenType: TokenType, tokens: Token[]) {
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.tokenType === tokenType) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get the tokens for the whole line starting at the given index (including the newline or EOF token at the end)
     * @param startIndex
     * @param tokens
     */
    private getLineTokens(startIndex: number, tokens: Token[]) {
        let outputTokens: Token[] = [];
        let index = startIndex;
        for (index = startIndex; index < tokens.length; index++) {
            let token = tokens[index];
            outputTokens[outputTokens.length] = token;

            if (
                token.tokenType === TokenType.newline ||
                token.tokenType === TokenType.END_OF_FILE
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

    private normalizeOptions(options: FormattingOptions | undefined) {
        let fullOptions: FormattingOptions = {
            indentStyle: 'spaces',
            indentSpaceCount: Formatter.DEFAULT_INDENT_SPACE_COUNT,
            formatIndent: true,
            keywordCase: 'lower',
            compositeKeywords: 'split',
            removeTrailingWhiteSpace: true,
            keywordCaseOverride: {},
            formatInteriorWhitespace: true,
            insertSpaceBeforeFunctionParenthesis: false,
            insertSpaceBetweenEmptyCurlyBraces: false
        };
        if (options) {
            for (let attrname in options) {
                fullOptions[attrname] = options[attrname];
            }
        }
        if (!fullOptions.typeCase) {
            fullOptions.typeCase = fullOptions.keywordCase as any;
        }
        return fullOptions;
    }

    private isSingleLineIfStatement(lineTokens: Token[], allTokens: Token[]) {
        let ifIndex = this.tokenIndexOf(TokenType.if, lineTokens);
        if (ifIndex === -1) {
            return false;
        }
        let thenIndex = this.tokenIndexOf(TokenType.then, lineTokens);
        let elseIndex = this.tokenIndexOf(TokenType.else, lineTokens);
        //if there's an else on this line, assume this is a one-line if statement
        if (elseIndex > -1) {
            return true;
        }
        //if there's no then, then it can't be a one line statement
        if (thenIndex === -1) {
            return false;
        }
        //if there's a comment at the end, this is a multi-line if statement
        if (this.tokenIndexOf(TokenType.remComment, lineTokens) > -1 || this.tokenIndexOf(TokenType.quoteComment, lineTokens) > -1) {
            return false;
        }

        //see if there is anything after the "then". If so, assume it's a one-line if statement
        for (let i = thenIndex + 1; i < lineTokens.length; i++) {
            let token = lineTokens[i];
            if (
                token.tokenType === TokenType.whitespace ||
                token.tokenType === TokenType.newline
            ) {
                //do nothing with whitespace and newlines
            } else {
                //we encountered a non whitespace and non newline token, so this line must be a single-line if statement
                return true;
            }
        }
        return false;
    }
}
