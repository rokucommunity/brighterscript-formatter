import type { Token } from 'brighterscript';
import { Lexer, TokenKind, AllowedLocalIdentifiers, Parser, createVisitor, WalkMode, isIfStatement, createToken } from 'brighterscript';
import { SourceNode } from 'source-map';
import type { FormattingOptions } from './FormattingOptions';
import { normalizeOptions } from './FormattingOptions';
import type { IfStatement, AALiteralExpression, AAMemberExpression } from 'brighterscript/dist/parser';

export class Formatter {
    /**
     * Construct a new formatter. The options provided here will be normalized exactly once,
     * and stored on the formatter instance.
     */
    public constructor(formattingOptions?: FormattingOptions) {
        if (formattingOptions) {
            this.formattingOptions = normalizeOptions(formattingOptions);
        }
    }

    /**
     * The formatting options provided in the constructor. Can be undefined if none were provided
     */
    public formattingOptions?: FormattingOptions;

    /**
     * The default number of spaces when indenting with spaces
     */
    public static DEFAULT_INDENT_SPACE_COUNT = 4;

    /**
     * Format the given input.
     * @param inputText the text to format
     * @param formattingOptions options specifying formatting preferences
     */
    public format(inputText: string, formattingOptions?: FormattingOptions) {
        let tokens = this.getFormattedTokens(inputText, formattingOptions);
        //join all tokens back together into a single string
        let outputText = '';
        for (let token of tokens) {
            outputText += token.text;
        }
        return outputText;
    }

    /**
     * Format the given input and return the formatted text as well as a source map
     * @param inputText the text to format
     * @param sourcePath the path to the file being formatted (used for sourcemap generator)
     * @param formattingOptions options specifying formatting preferences
     * @returns an object with property `code` holding the formatted code, and `map` holding the source map.
     */
    public formatWithSourceMap(inputText: string, sourcePath: string, formattingOptions?: FormattingOptions) {
        let tokens = this.getFormattedTokens(inputText, formattingOptions);
        let chunks = [] as Array<string | SourceNode>;
        for (let token of tokens) {
            if (token.range) {
                chunks.push(
                    new SourceNode(
                        //BrighterScript line numbers are 0-based, but source-map expects 1-based
                        token.range.start.line + 1,
                        token.range.start.character,
                        sourcePath,
                        token.text
                    )
                );
            } else {
                chunks.push(token.text);
            }
        }
        return new SourceNode(null, null, sourcePath, chunks).toStringWithSourceMap();
    }

    /**
     * Format the given input.
     * @param inputText the text to format
     * @param formattingOptions options specifying formatting preferences
     */
    public getFormattedTokens(inputText: string, formattingOptions?: FormattingOptions) {
        /**
         * Choose options in this order:
         *  1. The provided options
         *  2. The options from this instance property
         *  3. The default options
         */
        let options = normalizeOptions({
            ...this.formattingOptions,
            ...formattingOptions
        });

        let { tokens } = Lexer.scan(inputText, {
            includeWhitespace: true
        });
        let parser = Parser.parse(
            //strip out whitespace because the parser can't handle that
            tokens.filter(x => x.kind !== TokenKind.Whitespace)
        );

        if (options.formatMultiLineObjectsAndArrays) {
            tokens = this.formatMultiLineObjectsAndArrays(tokens);
        }

        if (options.compositeKeywords) {
            tokens = this.formatCompositeKeywords(tokens, options);
        }

        tokens = this.formatKeywordCase(tokens, options);

        if (options.removeTrailingWhiteSpace) {
            tokens = this.formatTrailingWhiteSpace(tokens, options);
        }

        if (options.formatInteriorWhitespace) {
            tokens = this.formatInteriorWhitespace(tokens, parser, options);
        }

        //dedupe side-by-side Whitespace tokens
        this.dedupeWhitespace(tokens);

        if (options.formatIndent) {

            tokens = this.formatIndentation(tokens, options, parser);
        }
        return tokens;
    }

    /**
     * Determines if the current index is the start of a single-line array or AA.
     * Walks forward until we find the equal number of open and close curlies/squares, or a newline
     */
    private isStartofSingleLineArrayOrAA(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
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

    /**
     * Find the matching closing token for open square or open curly
     */
    private getClosingToken(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
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
     * Given a kind like `}` or `]`, walk backwards until we find its match
     */
    private getOpeningToken(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
        let openCount = 0;
        for (let i = currentIndex; i >= 0; i--) {
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

    private isMatchingDoubleArrayOrArrayCurly(tokens: Token[], currentIndex: number) {
        let token = tokens[currentIndex];
        let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, currentIndex, true);
        //don't separate multiple open/close pairs
        if (
            //is open array
            token.kind === TokenKind.LeftSquareBracket &&
            //there is another token on this line
            nextNonWhitespaceToken &&
            //is next token an open array or open object
            (nextNonWhitespaceToken.kind === TokenKind.LeftSquareBracket || nextNonWhitespaceToken.kind === TokenKind.LeftCurlyBrace)
        ) {
            let closingToken = this.getClosingToken(tokens, currentIndex, TokenKind.LeftSquareBracket, TokenKind.RightSquareBracket);
            //look at the previous token
            let previous = closingToken && this.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(closingToken), true);
            /* istanbul ignore else (because I can't figure out how to make this happen but I think it's still necessary) */
            if (previous && (previous.kind === TokenKind.RightSquareBracket || previous.kind === TokenKind.RightCurlyBrace)) {
                return true;
            }
        }
    }

    /**
     * Standardize multi-line objects and arrays by inserting newlines after leading and before trailing.
     */
    private formatMultiLineObjectsAndArrays(tokens: Token[]) {
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

            let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, i, true);
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
                let closingToken = this.getClosingToken(tokens, i, openKind, closeKind);
                /* istanbul ignore next */
                let closingTokenKindex = closingToken ? tokens.indexOf(closingToken) : -1;

                i++;

                //if there's stuff before the closer, move it to a newline
                if (this.getPreviousNonWhitespaceToken(tokens, closingTokenKindex, true)) {
                    tokens.splice(closingTokenKindex, 0, {
                        kind: TokenKind.Newline,
                        text: '\n'
                    } as TokenWithStartIndex);
                }
            }
        }
        return tokens;
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

                let keywordCase: FormattingOptions['keywordCase'];
                let lowerKind = token.kind.toLowerCase();

                //a token is a type if it's preceeded by an `as` token
                if (this.isType(tokens, token)) {
                    //options.typeCase is always set to options.keywordCase when not provided
                    keywordCase = options.typeCase;
                    //if this is an overridden type keyword, use that override instead
                    if (options.typeCaseOverride && options.typeCaseOverride[lowerKind] !== undefined) {
                        keywordCase = options.typeCaseOverride[lowerKind];
                    }
                } else {
                    keywordCase = options.keywordCase;
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
                    default:
                        //do nothing
                        break;

                }
            }
        }
        return tokens;
    }

    private formatIndentation(tokens: Token[], options: FormattingOptions, parser: Parser) {
        let tabCount = 0;

        const ifStatements = new Map<Token, IfStatement>();

        //create a map of all if statements for easier lookups
        parser.ast.walk(createVisitor({
            IfStatement: (statement) => {
                ifStatements.set(statement.tokens.if, statement);
            }
        }), {
            walkMode: WalkMode.visitAllRecursive
        });

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


            for (let i = 0; i < lineTokens.length; i++) {
                let token = lineTokens[i];
                let previousNonWhitespaceToken = this.getPreviousNonWhitespaceToken(lineTokens, i);
                let nextNonWhitespaceToken = this.getNextNonWhitespaceToken(lineTokens, i);

                //if the previous token was `else` and this token is `if`, skip this token. (we used to have a single token for `elseif` but it got split out in an update of brighterscript)
                if (previousNonWhitespaceToken?.kind === TokenKind.Else && token.kind === TokenKind.If) {
                    continue;
                }

                //keep track of whether we found a non-Whitespace (or Newline) character
                if (![TokenKind.Whitespace, TokenKind.Newline].includes(token.kind)) {
                    foundNonWhitespaceThisLine = true;
                }

                if (
                    //if this is an indentor token
                    IndentSpacerTokenKinds.includes(token.kind) &&
                    //is not being used as a key in an AA literal
                    nextNonWhitespaceToken && nextNonWhitespaceToken.kind !== TokenKind.Colon
                ) {
                    //skip indent for 'function'|'sub' used as type (preceeded by `as` keyword)
                    if (
                        CallableKeywordTokenKinds.includes(token.kind) &&
                        //the previous token will be Whitespace, so verify that previousPrevious is 'as'
                        previousNonWhitespaceToken?.kind === TokenKind.As
                    ) {
                        continue;
                    }

                    //skip indent for single-line if statements
                    let ifStatement = ifStatements.get(token);
                    const endIfToken = this.getEndIfToken(ifStatement);
                    if (
                        ifStatement &&
                        (
                            //does not have an end if
                            !endIfToken ||
                            //end if is on same line as if
                            ifStatement.tokens.if.range.end.line === endIfToken.range.end.line
                        )
                    ) {
                        //if there's an `else`, skip past it since it'll cause de-indent otherwise
                        if (ifStatement.tokens.else) {
                            i = tokens.indexOf(ifStatement.tokens.else);
                        }

                        continue;
                    }

                    tabCount++;
                    foundIndentorThisLine = true;

                    //don't double indent if this is `[[...\n...]]` or `[{...\n...}]`
                    if (
                        //is open square
                        token.kind === TokenKind.LeftSquareBracket &&
                        //next is an open curly or square
                        (nextNonWhitespaceToken.kind === TokenKind.LeftCurlyBrace || nextNonWhitespaceToken.kind === TokenKind.LeftSquareBracket) &&
                        //both tokens are on the same line
                        token.range.start.line === nextNonWhitespaceToken.range.start.line
                    ) {
                        //find the closer
                        let closer = this.getClosingToken(tokens, tokens.indexOf(token), TokenKind.LeftSquareBracket, TokenKind.RightSquareBracket);
                        let expectedClosingPreviousKind = nextNonWhitespaceToken.kind === TokenKind.LeftSquareBracket ? TokenKind.RightSquareBracket : TokenKind.RightCurlyBrace;
                        let closingPrevious = closer && this.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(closer), true);
                        /* istanbul ignore else (because I can't figure out how to make this happen but I think it's still necessary) */
                        if (closingPrevious && closingPrevious.kind === expectedClosingPreviousKind) {
                            //skip the next token
                            i++;
                        }
                    }
                } else if (
                    //this is an outdentor token
                    OutdentSpacerTokenKinds.includes(token.kind) &&
                    //is not being used as a key in an AA literal
                    nextNonWhitespaceToken && nextNonWhitespaceToken.kind !== TokenKind.Colon &&
                    //is not a method call
                    !(
                        //certain symbols may appear next to an open paren, so exclude those
                        ![TokenKind.RightSquareBracket].includes(token.kind) &&
                        //open paren means method call
                        nextNonWhitespaceToken.kind === TokenKind.LeftParen
                    )
                ) {
                    //do not un-indent if this is a `next` or `endclass` token preceeded by a period
                    if (
                        [TokenKind.Next, TokenKind.EndClass, TokenKind.Namespace, TokenKind.EndNamespace].includes(token.kind) &&
                        previousNonWhitespaceToken && previousNonWhitespaceToken.kind === TokenKind.Dot
                    ) {
                        continue;
                    }

                    tabCount--;
                    if (foundIndentorThisLine === false) {
                        thisTabCount--;
                    }

                    //don't double un-indent if this is `[[...\n...]]` or `[{...\n...}]`
                    if (
                        //is closing curly or square
                        (token.kind === TokenKind.RightCurlyBrace || token.kind === TokenKind.RightSquareBracket) &&
                        //next is closing square
                        nextNonWhitespaceToken.kind === TokenKind.RightSquareBracket &&
                        //both tokens are on the same line
                        token.range.start.line === nextNonWhitespaceToken.range.start.line
                    ) {
                        let opener = this.getOpeningToken(
                            tokens,
                            tokens.indexOf(nextNonWhitespaceToken),
                            TokenKind.LeftSquareBracket,
                            TokenKind.RightSquareBracket
                        );
                        let openerNext = opener && this.getNextNonWhitespaceToken(tokens, tokens.indexOf(opener), true);
                        if (openerNext && (openerNext.kind === TokenKind.LeftCurlyBrace || openerNext.kind === TokenKind.LeftSquareBracket)) {
                            //skip the next token
                            i += 1;
                            continue;
                        }
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
                lineTokens.unshift({
                    startIndex: -1,
                    kind: TokenKind.Whitespace,
                    text: ''
                } as TokenWithStartIndex);
            }

            //replace the Whitespace with the formatted Whitespace
            lineTokens[0].text = leadingWhitespace;

            //if this is a line filled only with Whitespace, throw out the Whitespace
            if (foundNonWhitespaceThisLine === false) {
                //only keep the traling Newline
                lineTokens = [lineTokens.pop()!];
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
     * if and elseIf statements are chained within the if statement. So we need to walk all the if stataments' elseBranch chains until we find the final one.
     * Then return the endIf token if it exists
     */
    private getEndIfToken(ifStatement: IfStatement | undefined) {
        if (isIfStatement(ifStatement)) {
            while (true) {
                if (isIfStatement(ifStatement.elseBranch)) {
                    ifStatement = ifStatement.elseBranch;
                } else {
                    break;
                }
            }
            return ifStatement.tokens.endIf;
        }
    }

    /**
     * Force all Whitespace between tokens to be exactly 1 space wide
     */
    private formatInteriorWhitespace(
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
            nextNonWhitespaceToken = this.getNextNonWhitespaceToken(tokens, i);
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
                    let parenCandidate = this.getNextNonWhitespaceToken(tokens, tokens.indexOf(nextNonWhitespaceToken));
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
                    this.getNextNonWhitespaceToken(tokens, i, true)?.kind
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
                    this.getPreviousNonWhitespaceToken(tokens, i, true)
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
            if (token.kind === TokenKind.RightCurlyBrace && this.getPreviousNonWhitespaceToken(tokens, i, true)?.kind === TokenKind.LeftCurlyBrace) {
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
     * Get the first token after the index that is NOT Whitespace. Returns undefined if stopAtNewLine===true and found a newline,
     * or if we found the EOF token
     */
    private getNextNonWhitespaceToken(tokens: Token[], index: number, stopAtNewLine = false) {
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
     * Get the first token before the index that is NOT Whitespace
     */
    private getPreviousNonWhitespaceToken(tokens: Token[], startIndex: number, stopAtNewline = false) {
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
                    whitespaceTokenCandidate.text = whitespaceTokenCandidate.text.trimRight();
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

interface TokenWithStartIndex extends Token {
    startIndex: number;
}

export const CompositeKeywords = [
    TokenKind.EndFunction,
    TokenKind.EndIf,
    TokenKind.EndSub,
    TokenKind.EndWhile,
    TokenKind.ExitWhile,
    TokenKind.ExitFor,
    TokenKind.EndFor,
    TokenKind.HashElseIf,
    TokenKind.HashEndIf,
    TokenKind.EndClass,
    TokenKind.EndNamespace,
    TokenKind.EndTry
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
    TokenKind.Next,
    TokenKind.Not,
    TokenKind.HashIf,
    TokenKind.HashElse,
    TokenKind.HashConst,
    TokenKind.Class,
    TokenKind.Namespace,
    TokenKind.Import,
    TokenKind.Try,
    TokenKind.Catch,
    TokenKind.Throw
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
    TokenKind.Namespace,
    TokenKind.Try
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
    TokenKind.EndNamespace,
    TokenKind.EndTry
];
/**
 * The list of tokens that should cause an outdent followed by an immediate indent
 */
export let InterumSpacingTokenKinds = [
    TokenKind.Else,
    TokenKind.HashElse,
    TokenKind.HashElseIf,
    TokenKind.Catch
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
    TokenKind.Comma,
    TokenKind.LeftSquareBracket,
    TokenKind.LeftParen
];

export const TypeTokens = [
    TokenKind.Boolean,
    TokenKind.Double,
    TokenKind.Dynamic,
    TokenKind.Float,
    TokenKind.Function,
    TokenKind.Integer,
    TokenKind.Invalid,
    TokenKind.LongInteger,
    TokenKind.Object,
    TokenKind.String,
    TokenKind.Void
];

export const CompositeKeywordStartingWords = ['end', 'exit', 'else', '#end', '#else'];

export const AllowedClassIdentifierKinds = [TokenKind.Identifier, ...AllowedLocalIdentifiers];
