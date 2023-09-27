import type { Token } from 'brighterscript';
import { Position, TokenKind } from 'brighterscript';
import { util } from '../util';

interface ImportStatements {
    startIndex: number;
    startLine: number;
    lineTokens: Token[][];
}

export class SortImportsFormatter {

    public format(tokens: Token[]) {
        let nextLineStartTokenIndex = 0;

        let lineObj = util.getLineTokens(nextLineStartTokenIndex, tokens);
        nextLineStartTokenIndex = lineObj.stopIndex + 1;

        let importStatementsToSort: ImportStatements = {
            startIndex: -1,
            startLine: -1,
            lineTokens: []
        };

        while (nextLineStartTokenIndex < tokens.length) {
            if (this.isImportStatement(lineObj.tokens)) {
                importStatementsToSort.lineTokens.push(lineObj.tokens);
                if (importStatementsToSort.startIndex === -1) {
                    importStatementsToSort.startIndex = lineObj.startIndex;
                    importStatementsToSort.startLine = lineObj.tokens[0].range.start.line;
                }
            } else {
                /* istanbul ignore else */
                if (importStatementsToSort.lineTokens.length > 1) {
                    this.sortImportStatements(importStatementsToSort, tokens);
                }
                importStatementsToSort = {
                    startIndex: -1,
                    startLine: -1,
                    lineTokens: []
                };
            }
            lineObj = util.getLineTokens(nextLineStartTokenIndex, tokens);
            nextLineStartTokenIndex = lineObj.stopIndex + 1;
        }

        return tokens;
    }

    private isImportStatement(tokens: Token[]) {
        if (tokens.length === 0) {
            return false;
        }
        return tokens[0].kind === TokenKind.Import;
    }

    private sortImportStatements(importStatements: ImportStatements, tokens: Token[]) {
        importStatements.lineTokens.sort((a, b) => {
            let aText = a.map(x => x.text).join('');
            let bText = b.map(x => x.text).join('');
            return aText.localeCompare(bText);
        });

        const lineTokens = importStatements.lineTokens;

        let line = importStatements.startLine;
        lineTokens.forEach(lineToken => {
            let character = 0;
            lineToken.forEach(token => {
                token.range = {
                    start: Position.create(line, character),
                    end: Position.create(line, character + token.text.length)
                };
                character += token.text.length;
            });
            line++;
        });

        const sortedTokens = lineTokens.flat();
        tokens.splice(importStatements.startIndex, sortedTokens.length, ...sortedTokens);
    }
}
