import * as trimRight from 'trim-right';
import { Lexer, Token, TokenKind } from 'brighterscript';

import { FormattingOptions } from './FormattingOptions';

export class Formatter {
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
        let { tokens } = Lexer.scan(inputText, {
            includeWhitespace: true
        });

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

        //dedupe side-by-side Whitespace tokens
        this.dedupeWhitespace(tokens);

        if (options.formatIndent) {
            tokens = this.formatIndentation(tokens, options);
        }

        //join all tokens back together into a single string
        let outputText = '';
        for (let token of tokens) {
            outputText += token.text;
        }
        return outputText;
    }

    private dedupeWhitespace(tokens: Token[]) {
        for (let i = 0; i < tokens.length; i++) {
            let currentToken = tokens[i];
            let nextToken = tokens[i + 1] ? tokens[i + 1] : { kind: undefined, text: '' };
            if (currentToken.kind === TokenKind.Whitespace && nextToken.kind === TokenKind.Whitespace) {
                currentToken.text += nextToken.text;
                tokens.splice(i + 1, 1);
                //decrement the counter so we process this token again so it can absorb more Whitespace tokens
                i--;
            }
        }
    }

    private formatCompositeKeywords(tokens: Token[], options: FormattingOptions) {
        let indexOffset = 0;
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            (token as any).startIndex += indexOffset;
            let previousNonWhitespaceToken = this.getPreviousNonWhitespaceToken(tokens, i);
            let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, i);

            if (
                //is this a composite token
                CompositeKeywords.includes(token.kind) &&
                //is not being used as a key in an AA literal
                nextNonWhitespaceToken && nextNonWhitespaceToken.kind !== TokenKind.Colon &&
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

    /**
     * Determine if the token is a type keyword (meaing preceeded by `as` token)
     * @param token
     */
    private isType(tokens: Token[], token: Token) {
        let previousToken = this.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(token));
        if (previousToken && previousToken.text.toLowerCase() === 'as') {
            return true;
        } else {
            return false;
        }
    }

    private formatKeywordCase(tokens: Token[], options: FormattingOptions) {
        for (let token of tokens) {

            //if this token is a keyword
            if (Keywords.includes(token.kind)) {
                //a token is a type if it's preceeded by an `as` token
                let isType = this.isType(tokens, token);

                let keywordCase: FormattingOptions['keywordCase'];

                if (isType) {
                    keywordCase = options.typeCase;
                } else {
                    keywordCase = options.keywordCase;
                    let lowerKind = token.kind.toLowerCase();
                    //if this is an overridable keyword, use that override instead
                    if (options.keywordCaseOverride && options.keywordCaseOverride[lowerKind] !== undefined) {
                        keywordCase = options.keywordCaseOverride[lowerKind];
                    }
                }
                switch (keywordCase) {
                    case 'lower':
                        token.text = token.text.toLowerCase();
                        break;
                    case 'upper':
                        token.text = token.text.toUpperCase();
                        break;
                    case 'title':
                        let lowerValue = token.text.toLowerCase();

                        //format the first letter (conditional compile composite-keywords start with hash)
                        let charIndex = token.text.startsWith('#') ? 1 : 0;
                        token.text = this.upperCaseLetter(token.text, charIndex);

                        //if this is a composite keyword, format the first letter of the second word
                        if (CompositeKeywords.includes(token.kind)) {
                            let spaceCharCount = (/\s+/.exec(lowerValue) ?? []).length;

                            let firstWordLength = CompositeKeywordStartingWords.find(x => lowerValue.startsWith(x))!.length;

                            let nextWordFirstCharIndex = firstWordLength + spaceCharCount;
                            token.text = this.upperCaseLetter(token.text, nextWordFirstCharIndex);
                        }
                        break;
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
        let tabCount = 0;

        let nextLineStartTokenIndex = 0;
        //the list of output tokens
        let outputTokens: Token[] = [];
        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        for (let outerLoopCounter = 0; outerLoopCounter <= tokens.length * 2; outerLoopCounter++) {
            let lineObj = this.getLineTokens(nextLineStartTokenIndex, tokens);

            nextLineStartTokenIndex = lineObj.stopIndex + 1;
            let lineTokens = lineObj.tokens;
            let thisTabCount = tabCount;
            let foundIndentorThisLine = false;
            let foundNonWhitespaceThisLine = false;

            //if this is a single-line if statement, do nothing with indentation
            if (this.isSingleLineIfStatement(lineTokens, tokens)) {
                foundNonWhitespaceThisLine = true;
                // //if this line has a return statement, outdent
                // if (this.tokenIndexOf(TokenKind.return, lineTokens) > -1) {
                //     tabCount--;
                // } else {
                //     //do nothing with single-line if statement indentation
                // }
            } else {
                for (let i = 0; i < lineTokens.length; i++) {
                    let token = lineTokens[i];
                    let previousNonWhitespaceToken = this.getPreviousNonWhitespaceToken(lineTokens, i);
                    let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(lineTokens, i);

                    //keep track of whether we found a non-Whitespace (or Newline) character
                    if (![TokenKind.Whitespace, TokenKind.Newline].includes(token.kind)) {
                        foundNonWhitespaceThisLine = true;
                    }

                    if (
                        //if this is an indentor token
                        IndentSpacerTokenKinds.includes(token.kind) &&
                        //is not being used as a key in an AA literal
                        nextNonWhitespaceToken.kind !== TokenKind.Colon
                    ) {
                        //skip indent for 'function'|'sub' used as type (preceeded by `as` keyword)
                        if (
                            CallableKeywordTokenKinds.includes(token.kind) &&
                            //the previous token will be Whitespace, so verify that previousPrevious is 'as'
                            previousNonWhitespaceToken?.kind === TokenKind.As
                        ) {
                            continue;
                        }
                        tabCount++;
                        foundIndentorThisLine = true;

                        //don't double indent if square curly on same line
                        if (
                            //if this is an open square
                            token.kind === TokenKind.LeftSquareBracket &&
                            //the next token is an open curly
                            nextNonWhitespaceToken.kind === TokenKind.LeftCurlyBrace &&
                            //both tokens are on the same line
                            token.range.start.line === nextNonWhitespaceToken.range.start.line
                        ) {
                            //skip the next token
                            i++;
                        }
                    } else if (
                        //this is an outdentor token
                        OutdentSpacerTokenKinds.includes(token.kind) &&
                        //is not being used as a key in an AA literal
                        nextNonWhitespaceToken.kind !== TokenKind.Colon &&
                        //is not a method call
                        nextNonWhitespaceToken.kind !== TokenKind.LeftParen
                    ) {
                        tabCount--;
                        if (foundIndentorThisLine === false) {
                            thisTabCount--;
                        }

                        //don't double un-indent if this is a close curly and the next item is a close square
                        if (
                            //is closing curly
                            token.kind === TokenKind.RightCurlyBrace &&
                            //is closing square
                            nextNonWhitespaceToken.kind === TokenKind.RightSquareBracket &&
                            //both tokens are on the same line
                            token.range.start.line === nextNonWhitespaceToken.range.start.line
                        ) {
                            //skip the next token
                            i++;
                        }

                        //this is an interum token
                    } else if (InterumSpacingTokenKinds.includes(token.kind)) {
                        //these need outdented, but don't change the tabCount
                        thisTabCount--;
                    }
                    //  else if (token.kind === TokenKind.return && foundIndentorThisLine) {
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
            //create a Whitespace token if there isn't one
            if (lineTokens[0] && lineTokens[0].kind !== TokenKind.Whitespace) {
                lineTokens.unshift(<any>{
                    startIndex: -1,
                    kind: TokenKind.Whitespace,
                    text: ''
                });
            }

            //replace the Whitespace with the formatted Whitespace
            lineTokens[0].text = leadingWhitespace;

            //if this is a line filled only with Whitespace, throw out the Whitespace
            if (foundNonWhitespaceThisLine === false) {
                //only keep the traling Newline
                lineTokens = [lineTokens.pop() as Token];
            }

            //add this list of tokens
            outputTokens.push.apply(outputTokens, lineTokens);
            let lastLineToken = lineTokens[lineTokens.length - 1];
            //if we have found the end of file
            if (
                lastLineToken && lastLineToken.kind === TokenKind.Eof
            ) {
                break;
            }
            /* istanbul ignore next */
            if (outerLoopCounter === tokens.length * 2) {
                throw new Error('Something went terribly wrong');
            }
        }
        return outputTokens;
    }

    /**
     * Force all Whitespace between tokens to be exactly 1 space wide
     */
    private formatInteriorWhitespace(
        tokens: Token[],
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
            TokenKind.Less
        ];
        let addLeft = [
            ...addBoth,
            TokenKind.RightCurlyBrace
        ];
        let addRight = [
            ...addBoth,
            TokenKind.LeftCurlyBrace,
            TokenKind.Comma,
            TokenKind.Colon
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
            let nextTokenType: TokenKind = <any>(tokens[i + 1] ? tokens[i + 1].kind : undefined);
            let previousTokenType: TokenKind = <any>(tokens[i - 1] ? tokens[i - 1].kind : undefined);

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
            //force token to be exactly 1 space
            if (token.kind === TokenKind.Whitespace) {
                token.text = ' ';
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
                } else if (![TokenKind.Whitespace, TokenKind.Newline, TokenKind.Eof].includes(nextTokenType)) {
                    //don't add Whitespace if the next token is the Newline

                    tokens.splice(i + 1, 0, <any>{
                        startIndex: -1,
                        kind: TokenKind.Whitespace,
                        text: ' '
                    });
                }
            }

            //pad any of these tokens with a space to the left
            if (addLeft.includes(token.kind)) {
                //ensure a space token to the left
                if (previousTokenType && previousTokenType !== TokenKind.Whitespace) {
                    tokens.splice(i, 0, <any>{
                        startIndex: -1,
                        kind: TokenKind.Whitespace,
                        text: ' '
                    });
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

        //handle special cases
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, i);

            //space to left of function parens?
            {
                let parenToken: Token | undefined;
                //look for anonymous functions
                if (token.kind === TokenKind.Function && nextNonWhitespaceToken.kind === TokenKind.LeftParen) {
                    parenToken = nextNonWhitespaceToken;

                    //look for named functions
                } else if (token.kind === TokenKind.Function && nextNonWhitespaceToken.kind === TokenKind.Identifier) {
                    //get the next non-Whitespace token, which SHOULD be the paren
                    let parenCandidate = this.getNextNonWhitespaceToken(tokens, tokens.indexOf(nextNonWhitespaceToken));
                    if (parenCandidate.kind === TokenKind.LeftParen) {
                        parenToken = parenCandidate;
                    }
                }
                //if we found the paren token, handle spacing
                if (parenToken) {
                    //walk backwards, removing any Whitespace tokens found
                    this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(parenToken));
                    if (options.insertSpaceBeforeFunctionParenthesis) {
                        //insert a Whitespace token
                        tokens.splice(tokens.indexOf(parenToken), 0, <any>{
                            kind: TokenKind.Whitespace,
                            text: ' ',
                            startIndex: -1
                        });
                    }
                    //next loop iteration should be after the open paren
                    i = tokens.indexOf(parenToken);
                }
            }

            //empty curly braces
            if (token.kind === TokenKind.LeftCurlyBrace && nextNonWhitespaceToken.kind === TokenKind.RightCurlyBrace) {
                this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(nextNonWhitespaceToken));
                if (options.insertSpaceBetweenEmptyCurlyBraces) {
                    tokens.splice(tokens.indexOf(nextNonWhitespaceToken), 0, <any>{
                        kind: TokenKind.Whitespace,
                        startIndex: -1,
                        text: ' '
                    });
                    //next loop iteration should be after the closing curly brace
                    i = tokens.indexOf(nextNonWhitespaceToken);
                }
            }

            //empty parenthesis (user doesn't have this option, we will always do this one)
            if (token.kind === TokenKind.LeftParen && nextNonWhitespaceToken.kind === TokenKind.RightParen) {
                this.removeWhitespaceTokensBackwards(tokens, tokens.indexOf(nextNonWhitespaceToken));
                //next loop iteration should be after the closing paren
                i = tokens.indexOf(nextNonWhitespaceToken);
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
     * Remove Whitespace until the next non-Whitespace character.
     * This operates on the array itself
     */
    private removeWhitespace(tokens: Token[], index: number) {
        while (tokens[index] && tokens[index].kind === TokenKind.Whitespace) {
            tokens.splice(index, 1);
            index++;
        }
    }

    /**
     * Determine if the current token appears to be the negative sign for a numeric leteral
     */
    private looksLikeNegativeNumericLiteral(tokens: Token[], index: number) {
        let thisToken = tokens[index];
        if (thisToken.kind === TokenKind.Minus) {
            let nextToken = this.getNextNonWhitespaceToken(tokens, index);
            let previousToken = this.getPreviousNonWhitespaceToken(tokens, index);
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

    /**
     * Get the first token after the index that is NOT Whitespace
     */
    private getNextNonWhitespaceToken(tokens: Token[], index: number) {
        for (index += 1; index < tokens.length; index++) {
            if (tokens[index] && tokens[index].kind !== TokenKind.Whitespace) {
                return tokens[index];
            }
        }
        //if we got here, we ran out of tokens. Return the EOF token
        return tokens[tokens.length - 1];
    }

    /**
     * Get the first token before the index that is NOT Whitespace
     */
    private getPreviousNonWhitespaceToken(tokens: Token[], startIndex: number) {
        for (let i = startIndex - 1; i > -1; i--) {
            if (tokens[i] && tokens[i].kind !== TokenKind.Whitespace) {
                return tokens[i];
            }
        }
    }

    /**
     * Remove all trailing Whitespace
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
            //the last token is Newline or EOF, so the next-to-last token is where the trailing Whitespace would reside
            let potentialWhitespaceTokenIndex = lineTokens.length - 2;

            let whitespaceTokenCandidate = lineTokens[potentialWhitespaceTokenIndex];

            //empty lines won't have any tokens
            if (whitespaceTokenCandidate) {
                //if the final token is Whitespace, throw it away
                if (whitespaceTokenCandidate.kind === TokenKind.Whitespace) {
                    lineTokens.splice(potentialWhitespaceTokenIndex, 1);

                    //if the final token is a comment, trim the Whitespace from the righthand side
                } else if (
                    whitespaceTokenCandidate.kind === TokenKind.Comment
                ) {
                    whitespaceTokenCandidate.text = trimRight(
                        whitespaceTokenCandidate.text
                    );
                }
            }

            //add this line to the output
            outputTokens.push.apply(outputTokens, lineTokens);

            //if we have found the end of file, quit the loop
            if (
                lineTokens[lineTokens.length - 1].kind === TokenKind.Eof
            ) {
                break;
            }
        }
        return outputTokens;
    }

    /**
     * Find the next index of the token with the specified TokenKind
     */
    private firstTokenIndexOf(tokenType: TokenKind, tokens: Token[]) {
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.kind === tokenType) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get the tokens for the whole line starting at the given index (including the Newline or EOF token at the end)
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

    private normalizeOptions(options: FormattingOptions | undefined = {}) {
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
            insertSpaceBetweenEmptyCurlyBraces: false,

            //override defaults with the provided values
            ...options
        };

        if (!fullOptions.typeCase) {
            fullOptions.typeCase = fullOptions.keywordCase as any;
        }

        //force all keyword case override values to lower case
        let keywordCaseOverride = {};
        for (let key in fullOptions.keywordCaseOverride) {
            let value = fullOptions.keywordCaseOverride[key]
                ? fullOptions.keywordCaseOverride[key]!.toLowerCase()
                : 'original';

            keywordCaseOverride[key.toLowerCase()] = value;
        }
        fullOptions.keywordCaseOverride = keywordCaseOverride;

        let typeCaseOverride = {};
        for (let key in fullOptions.typeCaseOverride) {
            let value = fullOptions.typeCaseOverride[key]
                ? fullOptions.typeCaseOverride[key]!.toLowerCase()
                : 'original';

            typeCaseOverride[key.toLowerCase()] = value;
        }
        fullOptions.typeCaseOverride = typeCaseOverride;


        return fullOptions;
    }

    private isSingleLineIfStatement(lineTokens: Token[], allTokens: Token[]) {
        let ifIndex = this.firstTokenIndexOf(TokenKind.If, lineTokens);
        if (ifIndex === -1) {
            return false;
        }
        let thenIndex = this.firstTokenIndexOf(TokenKind.Then, lineTokens);
        let elseIndex = this.firstTokenIndexOf(TokenKind.Else, lineTokens);
        //if there's an else on this line, assume this is a one-line if statement
        if (elseIndex > -1) {
            return true;
        }
        //if there's no then, then it can't be a one line statement
        if (thenIndex === -1) {
            return false;
        }
        //if there's a comment at the end, this is a multi-line if statement
        if (this.firstTokenIndexOf(TokenKind.Comment, lineTokens) > -1 || this.firstTokenIndexOf(TokenKind.Comment, lineTokens) > -1) {
            return false;
        }

        //see if there is anything after the "then". If so, assume it's a one-line if statement
        for (let i = thenIndex + 1; i < lineTokens.length; i++) {
            let token = lineTokens[i];
            if (
                token.kind === TokenKind.Whitespace ||
                token.kind === TokenKind.Newline
            ) {
                //do nothing with Whitespace and newlines
            } else {
                //we encountered a non Whitespace and non Newline token, so this line must be a single-line if statement
                return true;
            }
        }
        return false;
    }

    /**
     * Convert the character at the specified index to upper case
     */
    public upperCaseLetter(text: string, index: number) {
        //out of bounds index should be a noop
        if (index < 0 || index > text.length) {
            return text;
        }
        text =
            //add the beginning text
            text.substring(0, index) +
            //uppercase the letter
            text.substring(index, index + 1).toUpperCase() +
            //rest of word
            text.substring(index + 1).toLowerCase();
        return text;
    }
}

export const CompositeKeywords = [
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.ExitWhile,
    TokenKind.ExitFor,
    TokenKind.EndFor,
    TokenKind.ElseIf,
    TokenKind.HashElseIf,
    TokenKind.HashEndIf,
    TokenKind.EndClass,
    TokenKind.EndNamespace
];

export const BasicKeywords = [
    TokenKind.And,
    TokenKind.Eval,
    TokenKind.If,
    TokenKind.Then,
    TokenKind.Else,
    TokenKind.For,
    TokenKind.To,
    TokenKind.Step,
    TokenKind.Exit,
    TokenKind.Each,
    TokenKind.While,
    TokenKind.Function,
    TokenKind.Sub,
    TokenKind.As,
    TokenKind.Return,
    TokenKind.Print,
    TokenKind.Goto,
    TokenKind.Dim,
    TokenKind.Stop,
    TokenKind.Void,
    TokenKind.Boolean,
    TokenKind.Integer,
    TokenKind.LongInteger,
    TokenKind.Float,
    TokenKind.Double,
    TokenKind.String,
    TokenKind.Object,
    TokenKind.Interface,
    TokenKind.Invalid,
    TokenKind.Dynamic,
    TokenKind.Or,
    TokenKind.Let,
    // TokenKind.LineNum,
    TokenKind.Next,
    TokenKind.Not,
    // TokenKind.Run,
    TokenKind.HashIf,
    TokenKind.HashElse,
    TokenKind.Class,
    TokenKind.Namespace,
    TokenKind.Import
];

export let Keywords: TokenKind[] = [];
Array.prototype.push.apply(Keywords, CompositeKeywords);
Array.prototype.push.apply(Keywords, BasicKeywords);

/**
 * The list of tokens that should cause an indent
 */
export let IndentSpacerTokenKinds = [
    TokenKind.Sub,
    TokenKind.For,
    TokenKind.ForEach,
    TokenKind.Function,
    TokenKind.If,
    TokenKind.LeftCurlyBrace,
    TokenKind.LeftSquareBracket,
    TokenKind.While,
    TokenKind.HashIf,
    TokenKind.Class,
    TokenKind.Namespace
];
/**
 * The list of tokens that should cause an outdent
 */
export let OutdentSpacerTokenKinds = [
    TokenKind.RightCurlyBrace,
    TokenKind.RightSquareBracket,
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.EndFor,
    TokenKind.Next,
    TokenKind.HashEndIf,
    TokenKind.EndClass,
    TokenKind.EndNamespace
];
/**
 * The list of tokens that should cause an outdent followed by an immediate indent
 */
export let InterumSpacingTokenKinds = [
    TokenKind.Else,
    TokenKind.ElseIf,
    TokenKind.HashElse,
    TokenKind.HashElseIf
];

export let CallableKeywordTokenKinds = [
    TokenKind.Function,
    TokenKind.Sub
];

export let NumericLiteralTokenKinds = [
    TokenKind.IntegerLiteral,
    TokenKind.FloatLiteral,
    TokenKind.DoubleLiteral,
    TokenKind.LongIntegerLiteral
];


/**
 * Anytime one of these tokens are found before a minus sign,
 * we can safely assume the minus sign is associated with a negative numeric literal
 */
export let TokensBeforeNegativeNumericLiteral = [
    TokenKind.Plus,
    TokenKind.Minus,
    TokenKind.Star,
    TokenKind.Forwardslash,
    TokenKind.Backslash,
    TokenKind.PlusEqual,
    TokenKind.ForwardslashEqual,
    TokenKind.MinusEqual,
    TokenKind.StarEqual,
    TokenKind.BackslashEqual,
    TokenKind.Equal,
    TokenKind.LessGreater,
    TokenKind.Greater,
    TokenKind.GreaterEqual,
    TokenKind.Less,
    TokenKind.LessEqual,
    TokenKind.LeftShift,
    TokenKind.RightShift,
    TokenKind.Return,
    TokenKind.To,
    TokenKind.Step,
    TokenKind.Colon,
    TokenKind.Semicolon,
    TokenKind.Comma
];

export const CompositeKeywordStartingWords = ['end', 'exit', 'else', '#end', '#else'];
