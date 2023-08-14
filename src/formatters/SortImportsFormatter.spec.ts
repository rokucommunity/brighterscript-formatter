import { expectTokens, lex } from '../testHelpers.spec';
import { SortImportsFormatter } from './SortImportsFormatter';

describe('SortImportsFormatter', () => {
    let Formatter: SortImportsFormatter;
    beforeEach(() => {
        Formatter = new SortImportsFormatter();
    });

    describe('format()', () => {
        it('sorts consecutive imports', () => {
            // There's an edge case where the file only contains imports and nothing else: In that
            // case, the file is not sorted.
            const input = `import "a"\nimport "c"\nimport "b"\n\n`;
            const expected = `import "a"\nimport "b"\nimport "c"\n\n`;

            let tokens = lex(input);
            tokens = Formatter.format(tokens);

            const expectedTokens = lex(expected);
            expectTokens(tokens, expectedTokens);
        });

        it('sorts consecutive imports with comments', () => {
            const input = `import "d"\nimport "c"\n'comment\nimport "b"\nimport "a"\n\n`;
            const expected = `import "c"\nimport "d"\n'comment\nimport "a"\nimport "b"\n\n`;

            let tokens = lex(input);
            tokens = Formatter.format(tokens);

            const expectedTokens = lex(expected);
            expectTokens(tokens, expectedTokens);
        });
    });
});
