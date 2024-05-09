import type { Token, Parser, IfStatement } from 'brighterscript';
import { isIfStatement, createVisitor, TokenKind, WalkMode } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import { OutdentSpacerTokenKinds, IndentSpacerTokenKinds, CallableKeywordTokenKinds, IgnoreIndentSpacerByParentTokenKind, InterumSpacingTokenKinds, DEFAULT_INDENT_SPACE_COUNT } from '../constants';
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

    private processLine(
        lineTokens: Token[],
        tokens: Token[],
        ifStatements: Map<Token, IfStatement>,
        parentIndentTokenKinds: TokenKind[]
    ): { currentLineOffset: number; nextLineOffset: number } {
        const getParentIndentTokenKind = () => {
            return parentIndentTokenKinds.length > 0 ? parentIndentTokenKinds[parentIndentTokenKinds.length - 1] : undefined;
        };

        let currentLineOffset = 0;
        let nextLineOffset = 0;
        let foundIndentorThisLine = false;
        let outdentCount = 0;

        for (let i = 0; i < lineTokens.length; i++) {
            let token = lineTokens[i];
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

                // check for specifically mentioned tokens to NOT indent
                const parentIndentTokenKind = getParentIndentTokenKind();
                if (parentIndentTokenKind && IgnoreIndentSpacerByParentTokenKind.get(parentIndentTokenKind)?.includes(token.kind)) {
                    // This particular token should not be indented because it is listed in the ignore group for its parent
                    continue;
                }

                nextLineOffset++;
                foundIndentorThisLine = true;
                parentIndentTokenKinds.push(token.kind);


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
                    let closer = util.getClosingToken(tokens, tokens.indexOf(token), TokenKind.LeftSquareBracket, TokenKind.RightSquareBracket);
                    let expectedClosingPreviousKind = nextNonWhitespaceToken.kind === TokenKind.LeftSquareBracket ? TokenKind.RightSquareBracket : TokenKind.RightCurlyBrace;
                    let closingPrevious = closer && util.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(closer), true);
                    /* istanbul ignore else (because I can't figure out how to make this happen but I think it's still necessary) */
                    if (closingPrevious && closingPrevious.kind === expectedClosingPreviousKind) {
                        //skip the next token
                        i++;
                    }
                }
            } else if (this.isOutdentToken(token, nextNonWhitespaceToken)) {
                //do not un-indent if this is a `next` or `endclass` token preceeded by a period
                if (
                    [TokenKind.Next, TokenKind.EndClass, TokenKind.Namespace, TokenKind.EndNamespace].includes(token.kind) &&
                    previousNonWhitespaceToken && previousNonWhitespaceToken.kind === TokenKind.Dot
                ) {
                    continue;
                }

                nextLineOffset--;
                if (OutdentSpacerTokenKinds.includes(token.kind)) {
                    outdentCount++;
                }

                if (foundIndentorThisLine === false) {
                    currentLineOffset--;
                }
                parentIndentTokenKinds.pop();

                //don't double un-indent if this is `[[...\n...]]` or `[{...\n...}]`
                if (
                    //is closing curly or square
                    (token.kind === TokenKind.RightCurlyBrace || token.kind === TokenKind.RightSquareBracket) &&
                    //next is closing square
                    nextNonWhitespaceToken && nextNonWhitespaceToken.kind === TokenKind.RightSquareBracket &&
                    //both tokens are on the same line
                    token.range.start.line === nextNonWhitespaceToken.range.start.line
                ) {
                    let opener = this.getOpeningToken(
                        tokens,
                        tokens.indexOf(nextNonWhitespaceToken),
                        TokenKind.LeftSquareBracket,
                        TokenKind.RightSquareBracket
                    );
                    let openerNext = opener && util.getNextNonWhitespaceToken(tokens, tokens.indexOf(opener), true);
                    if (openerNext && (openerNext.kind === TokenKind.LeftCurlyBrace || openerNext.kind === TokenKind.LeftSquareBracket)) {
                        //skip the next token
                        i += 1;
                        continue;
                    }
                }

                //this is an interum token
            } else if (InterumSpacingTokenKinds.includes(token.kind)) {
                //these need outdented, but don't change the tabCount
                currentLineOffset--;
            }
            //  else if (token.kind === TokenKind.return && foundIndentorThisLine) {
            //     //a return statement on the same line as an indentor means we don't want to indent
            //     tabCount--;
            // }
        }

        //check if next multiple indents are followed by multiple outdents and update indentation accordingly
        if (nextLineOffset > 1) {
            nextLineOffset = this.lookaheadSameLineMultiOutdents(tokens, lineTokens[lineTokens.length - 1], nextLineOffset, currentLineOffset);
        } else if (outdentCount > 0) {
            //if multiple outdents on same line then outdent only once
            if (currentLineOffset < 0) {
                currentLineOffset = -1;
            }

            if (nextLineOffset < 0) {
                //look back to get offset of last closing token pair
                nextLineOffset = this.getNextLineOffset(tokens, lineTokens);
            }
        }

        return {
            currentLineOffset: currentLineOffset,
            nextLineOffset: nextLineOffset
        };
    }

    /**
     * Lookback to find the matching opening token and then calculates outdents
     * @param tokens the array of tokens in a file
     * @param lineTokens token of curent line
     */
    private getNextLineOffset(tokens: Token[], lineTokens: Token[]): number {
        let nextLineOffset = -1;

        let lineLastToken = util.getPreviousNonWhitespaceToken(lineTokens, lineTokens.length - 1);
        let curLineLastToken = lineLastToken !== undefined ? lineLastToken : lineTokens[lineTokens.length - 1];

        let closeKind = curLineLastToken.kind;
        let openKind = this.getOpeningTokenKind(closeKind);

        if ((curLineLastToken.kind === TokenKind.RightCurlyBrace) || (curLineLastToken.kind === TokenKind.RightSquareBracket)) {
            let openCount = 0;
            let isWhiteSpaceToken = (lineTokens[0].kind === TokenKind.Whitespace) || (lineTokens[0].kind === TokenKind.Newline);
            let lineFirstToken = isWhiteSpaceToken ? util.getNextNonWhitespaceToken(lineTokens, 0) : lineTokens[0];
            let curLineStart = lineFirstToken?.range.start.character ? lineFirstToken?.range.start.character : 0;

            let openerFound = false;
            let currentIndex = lineTokens.indexOf(curLineLastToken);

            let lines = this.splitTokensByLine(tokens);

            for (let lineIndex = curLineLastToken.range.start.line; lineIndex >= 0; lineIndex--) {
                let lineToken = lines[lineIndex];

                if (lineToken.length === 1 && lineToken[0].kind === TokenKind.Newline) {
                    continue;
                }
                isWhiteSpaceToken = (lineToken[0].kind === TokenKind.Whitespace) || (lineToken[0].kind === TokenKind.Newline);
                let firstToken = isWhiteSpaceToken ? util.getNextNonWhitespaceToken(lineToken, 0) : lineToken[0];
                let lineStartPosition = firstToken ? firstToken.range.start.character : 0;

                let lineTokenIndex = currentIndex > -1 ? currentIndex : lineToken.length - 1;
                currentIndex = -1;

                for (let i = lineTokenIndex; i >= 0; i--) {
                    let token = lineToken[i];
                    if (token.kind === TokenKind.Whitespace) {
                        continue;
                    }

                    if (token.kind === openKind) {
                        openCount++;
                    } else if (token.kind === closeKind) {
                        openCount--;
                    }

                    if (openCount === 0) {
                        openerFound = true;
                        break;
                    }
                }

                if (lineStartPosition < curLineStart) {
                    nextLineOffset--;
                    curLineStart = lineStartPosition;
                }

                if (openerFound) {
                    break;
                }
            }
        }
        return nextLineOffset;
    }

    /**
     * Lookahead if next line with oudents are same as indents on current line
     * @param tokens the array of tokens in a file
     * @param curLineToken token of curent line
     * @param nextLineOffset the number of tabs to indent the next line
     * @param currentLineOffset the number of tabs to indent the current line
     */
    private lookaheadSameLineMultiOutdents(tokens: Token[], curLineToken: Token, nextLineOffset: number, currentLineOffset: number): number {
        let outdentCount = 0;
        let tokenLineNum = 0;
        let currentLineTokenIndex = tokens.indexOf(curLineToken);

        for (let i = currentLineTokenIndex + 1; i < tokens.length; i++) {
            let token = tokens[i];
            if (token.kind !== TokenKind.Whitespace) {
                let openingTokenKind = this.getOpeningTokenKind(token.kind);
                //next line with outdents
                if (OutdentSpacerTokenKinds.includes(token.kind) && openingTokenKind) {
                    let opener = this.getOpeningToken(tokens, i, openingTokenKind, token.kind);
                    if (opener && opener.range.start.line === curLineToken.range.start.line) {
                        if (tokenLineNum === 0) {
                            tokenLineNum = token.range.start.line;
                        }

                        if (token.range.start.line === tokenLineNum) {
                            outdentCount++;
                        }
                    }
                }
                if (tokenLineNum > 0 && token.range.start.line !== tokenLineNum) {
                    break;
                }
            }
        }

        //if outdents on next line with outdents = indents on current line then indent next line by one tab only
        if (outdentCount > 0) {
            if (outdentCount === nextLineOffset) {
                nextLineOffset = currentLineOffset + 1;
            }
        }
        return nextLineOffset;
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
    public getOpeningToken(tokens: Token[], currentIndex: number, openKind: TokenKind, closeKind: TokenKind) {
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

    /**
     * Returns opening token kind of the tokenkind passed
     */
    public getOpeningTokenKind(tokenKind: TokenKind) {
        if (tokenKind === TokenKind.RightCurlyBrace) {
            return TokenKind.LeftCurlyBrace;
        } else if (tokenKind === TokenKind.RightParen) {
            return TokenKind.LeftParen;
        } else if (tokenKind === TokenKind.RightSquareBracket) {
            return TokenKind.LeftSquareBracket;
        } else if (tokenKind === TokenKind.EndIf) {
            return TokenKind.If;
        } else if (tokenKind === TokenKind.EndFunction) {
            return TokenKind.Function;
        } else if (tokenKind === TokenKind.EndSub) {
            return TokenKind.Sub;
        }
        return undefined;
    }

    /**
     * Determines if this is an outdent token
     */
    public isOutdentToken(token: Token, nextNonWhitespaceToken?: Token) {
        //this is a temporary fix for broken indentation for brighterscript ternary operations.
        const isSymbol = [TokenKind.RightCurlyBrace, TokenKind.RightSquareBracket].includes(token.kind);
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
