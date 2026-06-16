import type { Token, Parser, IfStatement } from 'brighterscript';
import { isIfStatement, createVisitor, TokenKind, WalkMode } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import { OutdentSpacerTokenKinds, IndentSpacerTokenKinds, CallableKeywordTokenKinds, IgnoreIndentSpacerByParentTokenKind, InterumSpacingTokenKinds, DEFAULT_INDENT_SPACE_COUNT, IndentGroupingTokenKinds, OutdentGroupingTokenKinds } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class IndentFormatter {
    /**
     * Handle indentation for an array of tokens
     */
    public format(tokens: Token[], options: FormattingOptions, parser: Parser) {
        // The text used for each tab
        let tabText = options.indentStyle === 'tabs' ? '\t' : ' '.repeat(options.indentSpaceCount ?? DEFAULT_INDENT_SPACE_COUNT);

        //the tab count as it flows through the program. Starting point for each line's tabCount calculation.
        let globalTabCount = 0;

        //get a map of all if statements for easier lookups
        const ifStatements = this.getAllIfStatements(parser);

        let parentIndentTokenKinds: TokenKind[] = [];

        this.multiLineFuncDeclarationOpeners = [];
        //the list of output tokens
        let result: Token[] = [];

        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        for (let lineTokens of this.splitTokensByLine(tokens)) {
            const { currentLineOffset, nextLineOffset } = this.processLine(lineTokens, tokens, ifStatements, parentIndentTokenKinds);

            //uncomment the next line to debug indent/outdent issues
            // console.log(currentLineOffset.toString().padStart(3, ' '), nextLineOffset.toString().padStart(3, ' '), lineTokens.map(x => x.text).join('').replace(/\r?\n/, '').replace(/^\s*/, ''));

            //compute the current line's tab count (default to 0 if we somehow went negative)
            let currentLineTabCount = Math.max(globalTabCount + currentLineOffset, 0);

            //update the offset for the next line (default to 0 if we somehow went negative)
            globalTabCount = Math.max(globalTabCount + nextLineOffset, 0);

            this.ensureTokenIndentation(lineTokens, currentLineTabCount, tabText);
            this.trimWhitespaceOnlyLines(lineTokens);

            //push these tokens to the result list
            result.push(...lineTokens);
        }
        return result;
    }

    private multiLineFuncDeclarationOpeners: Token[] = [];

    private processLine(
        lineTokens: Token[],
        tokens: Token[],
        ifStatements: Map<Token, IfStatement>,
        parentIndentTokenKinds: TokenKind[]
    ): { currentLineOffset: number; nextLineOffset: number } {
        const getParentIndentTokenKind = () => {
            const parentIndentTokenKind = parentIndentTokenKinds.length > 0 ? parentIndentTokenKinds[parentIndentTokenKinds.length - 1] : undefined;
            return parentIndentTokenKind;
        };

        let currentLineOffset = 0;
        let nextLineOffset = 0;
        let foundIndentorThisLine = false;
        let firstNonWhitespaceToken: Token | null = null;

        for (let i = 0; i < lineTokens.length; i++) {
            let token = lineTokens[i];
            if (token.kind !== TokenKind.Whitespace && !firstNonWhitespaceToken) {
                firstNonWhitespaceToken = token;
            }
            let previousNonWhitespaceToken = util.getPreviousNonWhitespaceToken(lineTokens, i);
            let nextNonWhitespaceToken = util.getNextNonWhitespaceToken(lineTokens, i);

            if (previousNonWhitespaceToken?.kind === TokenKind.Continue &&
                (token.kind === TokenKind.For || token.kind === TokenKind.While)) {
                continue;
            }

            //if the previous token was `else` and this token is `if`, skip this token. (we used to have a single token for `elseif` but it got split out in an update of brighterscript)
            if (previousNonWhitespaceToken?.kind === TokenKind.Else && token.kind === TokenKind.If) {
                continue;
            }

            if (
                //if this is an indentor token
                IndentSpacerTokenKinds.includes(token.kind) &&
                //is not being used as a key in an AA literal
                (nextNonWhitespaceToken && nextNonWhitespaceToken.kind !== TokenKind.Colon)
            ) {
                //skip indent for 'function'|'sub' used as type (preceeded by `as` keyword)
                if (
                    CallableKeywordTokenKinds.includes(token.kind) &&
                    //the previous token will be Whitespace, so verify that previousPrevious is 'as'
                    previousNonWhitespaceToken?.kind === TokenKind.As
                ) {
                    continue;
                }

                //skip indent for 'function'|'sub' used as type in type statement (line begins with "type <name =")
                if (
                    CallableKeywordTokenKinds.includes(token.kind) &&
                    // the previous token will be Whitespace, so verify that previous non-whitespace tokens
                    // are "type <name> = "
                    previousNonWhitespaceToken?.kind === TokenKind.Equal &&
                    util.getPreviousNonWhitespaceToken(lineTokens, i - 3)?.kind === TokenKind.Identifier &&
                    util.getPreviousNonWhitespaceToken(lineTokens, i - 5)?.text.toLowerCase() === 'type' &&
                    firstNonWhitespaceToken === util.getPreviousNonWhitespaceToken(lineTokens, i - 5)
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

                // check for specifically mentioned tokens to NOT indent
                const parentIndentTokenKind = getParentIndentTokenKind();
                const parentIndentTokenKindsContainsSubOrFunction = parentIndentTokenKinds.includes(TokenKind.Sub) || parentIndentTokenKinds.includes(TokenKind.Function);

                const tokenKindIsClass = token.kind === TokenKind.Class;
                const tokenKindIsEnum = token.kind === TokenKind.Enum;
                const tokenKindIsInterface = token.kind === TokenKind.Interface;
                const tokenKindIsNamespace = token.kind === TokenKind.Namespace;
                const tokenKindIsTry = token.kind === TokenKind.Try;

                // dont indent if parent is sub or function and this is a class, enum, interface, namespace, or try
                const preventIndent = parentIndentTokenKindsContainsSubOrFunction && (tokenKindIsClass || tokenKindIsEnum || tokenKindIsInterface || tokenKindIsNamespace || tokenKindIsTry);
                if (preventIndent) {
                    if (tokenKindIsTry && (lineTokens.length === 2 || lineTokens.length === 3)) {
                        nextLineOffset++;
                    }
                    continue;
                }

                if (parentIndentTokenKind && IgnoreIndentSpacerByParentTokenKind.get(parentIndentTokenKind)?.includes(token.kind)) {
                    // This particular token should not be indented because it is listed in the ignore group for its parent
                    continue;
                }

                const isOpenFunctionDeclarationParamList = this.isStartOfOpenFunctionDeclarationParamList(lineTokens, i);

                if (isOpenFunctionDeclarationParamList) {
                    this.multiLineFuncDeclarationOpeners.push(token);
                } else {
                    nextLineOffset++;
                    foundIndentorThisLine = true;
                }
                parentIndentTokenKinds.push(token.kind);

                //don't double indent if this is `[[...\n...]]` or `[{...\n...}]`
                let numUnmatchedOpenTokens = this.getNumberOfUnmatchedOpenTokensOnOneLine(tokens, tokens.indexOf(token));
                if (numUnmatchedOpenTokens > 0 && CallableKeywordTokenKinds.includes(token.kind) &&
                    this.isStartOfOpenFunctionDeclarationParamList(lineTokens, i + 1)) {
                    // this is a function declaration "function(", do not skip the next token
                    numUnmatchedOpenTokens--;
                }
                if (numUnmatchedOpenTokens > 1) {
                    //skip the next token for each unmatched open token on the same line
                    i += (numUnmatchedOpenTokens - 1);
                }

            } else if (this.isOutdentToken(token, nextNonWhitespaceToken)) {
                //do not un-indent if this is a `next` or `endclass` token preceeded by a period
                if (
                    [TokenKind.Next, TokenKind.EndClass, TokenKind.Namespace, TokenKind.EndNamespace, TokenKind.Catch, TokenKind.EndTry].includes(token.kind) &&
                    previousNonWhitespaceToken && previousNonWhitespaceToken.kind === TokenKind.Dot
                ) {
                    continue;
                }

                nextLineOffset--;
                if (foundIndentorThisLine === false) {
                    currentLineOffset--;
                }
                parentIndentTokenKinds.pop();

                if (token.kind === TokenKind.RightParen) {
                    let opener = this.getOpeningToken(
                        tokens,
                        tokens.indexOf(token),
                        [TokenKind.LeftParen],
                        TokenKind.RightParen
                    );
                    if (this.multiLineFuncDeclarationOpeners.includes(opener!)) {
                        // indent function body
                        nextLineOffset++;
                        this.multiLineFuncDeclarationOpeners = this.multiLineFuncDeclarationOpeners.filter(x => x !== opener);
                    }
                }

                //don't double un-indent if this is `[[...\n...]]` or `[{...\n...}]`
                const numUnmatchedCloseTokens = this.getNumberOfUnmatchedCloseTokensOnOneLine(tokens, tokens.indexOf(token));
                if (numUnmatchedCloseTokens > 1) {
                    //skip the next token for each unmatched close token on the same line
                    i += (numUnmatchedCloseTokens - 1);
                }

                //this is an interum token
            } else if (InterumSpacingTokenKinds.includes(token.kind)) {
                //these need outdented, but don't change the tabCount
                currentLineOffset--;
            }
        }
        return {
            currentLineOffset: currentLineOffset,
            nextLineOffset: nextLineOffset
        };
    }

    private getConsecutiveTokensByTypeOnOneLine(tokens: Token[], currentIndex: number, targetTokenKinds: TokenKind[]): Token[] {
        const currentToken = tokens[currentIndex];

        const isApplicableTokenKind = targetTokenKinds.includes(currentToken.kind);
        if (!isApplicableTokenKind) {
            return [];
        }

        let nextNonWhitespaceTokenIndex = util.getNextNonWhitespaceTokenIndex(tokens, currentIndex);
        let targetTokens = [currentToken];

        while (typeof nextNonWhitespaceTokenIndex === 'number') {
            const nextNonWhitespaceToken = tokens[nextNonWhitespaceTokenIndex];

            const isNextTokenAnOpenToken = targetTokenKinds.includes(nextNonWhitespaceToken.kind);

            if (isNextTokenAnOpenToken && currentToken.range.start.line === nextNonWhitespaceToken.range.start.line) {
                targetTokens.push(nextNonWhitespaceToken);
                nextNonWhitespaceTokenIndex = util.getNextNonWhitespaceTokenIndex(tokens, nextNonWhitespaceTokenIndex);
            } else {
                break;
            }
        }
        return targetTokens;
    }

    private getConsecutiveOpenTokensOnOneLine(tokens: Token[], currentIndex: number): Token[] {
        return this.getConsecutiveTokensByTypeOnOneLine(tokens, currentIndex, [...IndentGroupingTokenKinds, ...CallableKeywordTokenKinds]);
    }

    private getConsecutiveCloseTokensOnOneLine(tokens: Token[], currentIndex: number): Token[] {
        return this.getConsecutiveTokensByTypeOnOneLine(tokens, currentIndex, [...OutdentGroupingTokenKinds, TokenKind.EndSub, TokenKind.EndFunction]);
    }

    private getMatchingClosingTokens(allTokens: Token[], openTokens: Token[], currentIndex: number): (Token | null)[] {
        const closingTokens: (Token | null)[] = [];
        for (let openToken of openTokens) {
            const expectedClosingTokenKind = this.getExpectedClosingToken(openToken);
            if (!expectedClosingTokenKind) {
                continue;
            }
            const closingToken = util.getClosingToken(allTokens, allTokens.indexOf(openToken), openToken.kind, expectedClosingTokenKind);
            if (closingToken) {
                closingTokens.push(closingToken);
            } else {
                closingTokens.push(null);
            }
        }
        return closingTokens;
    }

    private getMatchingOpeningTokens(allTokens: Token[], closeTokens: Token[], currentIndex: number): (Token | null)[] {
        const openingTokens: (Token | null)[] = [];
        for (let closeToken of closeTokens) {
            const expectedClosingTokenKinds = this.getExpectedOpeningTokens(closeToken);
            if (expectedClosingTokenKinds.length < 1) {
                continue;
            }
            const openingToken = this.getOpeningToken(allTokens, allTokens.indexOf(closeToken), expectedClosingTokenKinds, closeToken.kind);
            if (openingToken) {
                openingTokens.push(openingToken);
            } else {
                openingTokens.push(null);
            }
        }
        return openingTokens;
    }

    private getNumberOfUnmatchedOpenTokensOnOneLine(tokens: Token[], currentIndex: number): number {
        const openTokens = this.getConsecutiveOpenTokensOnOneLine(tokens, currentIndex);
        const closingTokens = this.getMatchingClosingTokens(tokens, openTokens, currentIndex);
        const closeTokensOnSameLine = closingTokens.filter(token => token !== null && token.range.start.line === tokens[currentIndex].range.start.line);
        return openTokens.length - closeTokensOnSameLine.length;
    }

    private getNumberOfUnmatchedCloseTokensOnOneLine(tokens: Token[], currentIndex: number): number {
        const closeTokens = this.getConsecutiveCloseTokensOnOneLine(tokens, currentIndex);
        const openingTokens = this.getMatchingOpeningTokens(tokens, closeTokens, currentIndex);
        const closeTokensOnSameLine = openingTokens.filter(token => token !== null && token.range.start.line === tokens[currentIndex].range.start.line);
        return closeTokens.length - closeTokensOnSameLine.length;
    }

    /**
     * Gets an array of all possible closing token kinds for a given opening token
     */
    private getExpectedClosingToken(openToken: Token): TokenKind | undefined {
        if (openToken.kind === TokenKind.LeftCurlyBrace) {
            return TokenKind.RightCurlyBrace;
        } else if (openToken.kind === TokenKind.LeftSquareBracket) {
            return TokenKind.RightSquareBracket;
        } else if (openToken.kind === TokenKind.QuestionLeftSquare) {
            return TokenKind.RightSquareBracket;
        } else if (openToken.kind === TokenKind.LeftParen) {
            return TokenKind.RightParen;
        } else if (openToken.kind === TokenKind.Sub) {
            return TokenKind.EndSub;
        } else if (openToken.kind === TokenKind.Function) {
            return TokenKind.EndFunction;
        }
    }

    /**
     * Gets an array of all possible opening token kinds for a given closing token
     */
    private getExpectedOpeningTokens(closeToken: Token): TokenKind[] {
        if (closeToken.kind === TokenKind.RightCurlyBrace) {
            return [TokenKind.LeftCurlyBrace];
        } else if (closeToken.kind === TokenKind.RightSquareBracket) {
            return [TokenKind.LeftSquareBracket, TokenKind.QuestionLeftSquare];
        } else if (closeToken.kind === TokenKind.RightParen) {
            return [TokenKind.LeftParen, TokenKind.QuestionLeftParen];
        } else if (closeToken.kind === TokenKind.EndSub) {
            return [TokenKind.Sub];
        } else if (closeToken.kind === TokenKind.EndFunction) {
            return [TokenKind.Function];
        }
        return [];
    }

    private isStartOfOpenFunctionDeclarationParamList(lineTokens: Token[], currentIndex: number): boolean {
        const currentToken = lineTokens[currentIndex];
        if (currentToken.kind !== TokenKind.LeftParen) {
            return false;
        }
        const previousNonWhitespaceToken = util.getPreviousNonWhitespaceToken(lineTokens, currentIndex);
        if (!previousNonWhitespaceToken) {
            return false;
        }
        let isFunctionDeclarationParamList = false;
        if (CallableKeywordTokenKinds.includes(previousNonWhitespaceToken.kind)) {
            // this is "function(" or "sub("
            isFunctionDeclarationParamList = true;
        } else if (previousNonWhitespaceToken.kind === TokenKind.Identifier) {
            const previousPreviousNonWhitespaceToken = util.getPreviousNonWhitespaceToken(lineTokens, lineTokens.indexOf(previousNonWhitespaceToken), true);
            if (!previousPreviousNonWhitespaceToken) {
                return false;
            }
            if (CallableKeywordTokenKinds.includes(previousPreviousNonWhitespaceToken.kind)) {
                // this is "function someName(" or "sub someName("
                isFunctionDeclarationParamList = true;
            }
        }
        if (isFunctionDeclarationParamList) {
            let closingToken = this.getMatchingClosingTokens(lineTokens, [lineTokens[currentIndex]], currentIndex)[0];
            if (!closingToken) {
                return true;
            }
        }
        return false;
    }

    /**
     * Ensure the list of tokens contains the correct number of tabs
     * @param tokens the array of tokens to be modified in-place
     * @param tabCount the number of tabs to indent the tokens by
     * @param tabText the string to use for each tab. For tabs, this is "\t", for spaces it would be something like "    " or "  "
     */
    private ensureTokenIndentation(tokens: Token[], tabCount: number, tabText = '    '): Token[] {
        //do nothing if we have an empty tokens list
        if (!tokens || tokens.length === 0) {
            return tokens;
        }

        //merge all duplicate whitespace tokens into a single token
        util.dedupeWhitespace(tokens, true);

        //ensure there's a leading whitespace token if we're going to be adding whitespace
        if (tokens[0].kind !== TokenKind.Whitespace && tabCount > 0) {
            tokens.unshift({
                startIndex: -1,
                kind: TokenKind.Whitespace,
                text: ''
            } as TokenWithStartIndex);
        }

        if (tokens[0].kind === TokenKind.Whitespace) {
            tabCount = tabCount >= 0 ? tabCount : 0;
            //replace a whitespace's token text with the current indentation whitespace
            tokens[0].text = tabText.repeat(tabCount);
        }
        return tokens;
    }

    /**
     * Removing leading whitespace from whitespace-only lines.
     * This should only be called once the line has been whitespace-deduped
     */
    private trimWhitespaceOnlyLines(tokens: Token[]) {
        //if the first token is whitespace, and the next is EOL or EOF
        if (
            tokens[0].kind === TokenKind.Whitespace &&
            tokens.length === 2 &&
            (tokens[1].kind === TokenKind.Newline || tokens[1].kind === TokenKind.Eof)
        ) {
            tokens.splice(0, 1);
        }
        return tokens;
    }

    /**
     * Find all if statements in this file
     */
    private getAllIfStatements(parser: Parser) {

        const ifStatements = new Map<Token, IfStatement>();

        parser.ast.walk(createVisitor({
            IfStatement: (statement) => {
                ifStatements.set(statement.tokens.if, statement);
            }
        }), {
            walkMode: WalkMode.visitAllRecursive
        });
        return ifStatements;
    }

    /**
     * Split the tokens by newline (including the newline or EOF as the last token in that array)
     */
    private splitTokensByLine(tokens: Token[]) {
        const result: Array<Token[]> = [];
        let line: Token[] = [];
        for (let token of tokens) {
            line.push(token);
            if (
                token.kind === TokenKind.Newline ||
                token.kind === TokenKind.Eof
            ) {
                result.push(line);
                line = [];
            }
        }
        return result;
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
     * Given a kind like `}` or `]`, walk backwards until we find its match
     */
    public getOpeningToken(tokens: Token[], currentIndex: number, openKinds: TokenKind[], closeKind: TokenKind) {
        let openCount = 0;
        for (let i = currentIndex; i >= 0; i--) {
            let token = tokens[i];
            if (openKinds.includes(token.kind)) {
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
     * Determines if this is an outdent token
     */
    public isOutdentToken(token: Token, nextNonWhitespaceToken?: Token) {
        //this is a temporary fix for broken indentation for brighterscript ternary operations.
        const isSymbol = [TokenKind.RightCurlyBrace, TokenKind.RightSquareBracket, TokenKind.RightParen].includes(token.kind);
        if (
            //this is an outdentor token
            OutdentSpacerTokenKinds.includes(token.kind) &&
            nextNonWhitespaceToken &&
            (
                //is not a letter
                isSymbol ||
                //is not a symbol and is not being used as a key in an AA literal
                (
                    !isSymbol &&
                    nextNonWhitespaceToken.kind !== TokenKind.Colon
                )
            ) &&
            //is not a method call
            !(
                //certain symbols may appear next to an open paren, so exclude those
                ![TokenKind.RightSquareBracket].includes(token.kind) &&
                //open paren means method call
                nextNonWhitespaceToken.kind === TokenKind.LeftParen
            )
        ) {
            return true;
        } else {
            return false;
        }
    }
}
