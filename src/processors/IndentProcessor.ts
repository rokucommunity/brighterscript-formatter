import type { Token, Parser, IfStatement } from 'brighterscript';
import { isIfStatement, createVisitor, TokenKind, WalkMode } from 'brighterscript';
import type { TokenWithStartIndex } from '../constants';
import { OutdentSpacerTokenKinds, IndentSpacerTokenKinds, CallableKeywordTokenKinds, IgnoreIndentSpacerByParentTokenKind, InterumSpacingTokenKinds, DEFAULT_INDENT_SPACE_COUNT } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class IndentProcessor {
    /**
     * Handle indentation for an array of tokens
     */
    public process(tokens: Token[], options: FormattingOptions, parser: Parser) {
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
        let parentIndentTokenKinds: TokenKind[] = [];

        const getParentIndentTokenKind = () => {
            return parentIndentTokenKinds.length > 0 ? parentIndentTokenKinds[parentIndentTokenKinds.length - 1] : undefined;
        };

        //the list of output tokens
        let outputTokens: Token[] = [];
        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        for (let outerLoopCounter = 0; outerLoopCounter <= tokens.length * 2; outerLoopCounter++) {
            let lineObj = util.getLineTokens(nextLineStartTokenIndex, tokens);

            nextLineStartTokenIndex = lineObj.stopIndex + 1;
            let lineTokens = lineObj.tokens;
            let thisTabCount = tabCount;
            let foundIndentorThisLine = false;
            let foundNonWhitespaceThisLine = false;

            for (let i = 0; i < lineTokens.length; i++) {
                let token = lineTokens[i];
                let previousNonWhitespaceToken = util.getPreviousNonWhitespaceToken(lineTokens, i);
                let nextNonWhitespaceToken = util.getNextNonWhitespaceToken(lineTokens, i);

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

                    // check for specifically mentioned tokens to NOT indent
                    const parentIndentTokenKind = getParentIndentTokenKind();
                    if (parentIndentTokenKind && IgnoreIndentSpacerByParentTokenKind.get(parentIndentTokenKind)?.includes(token.kind)) {
                        // This particular token should not be indented because it is listed in the ignore group for its parent
                        continue;
                    }

                    tabCount++;
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

                    tabCount--;
                    if (foundIndentorThisLine === false) {
                        thisTabCount--;
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
                    : DEFAULT_INDENT_SPACE_COUNT;
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
