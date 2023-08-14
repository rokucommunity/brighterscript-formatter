import { expect } from 'chai';
import { lex } from '../testHelpers.spec';
import { SortImportsFormatter } from './SortImportsFormatter';
import type { Token } from 'brighterscript';

describe('SortImportsFormatter', () => {
    let Formatter: SortImportsFormatter;
    beforeEach(() => {
        Formatter = new SortImportsFormatter();
    });

    describe('isImportStatement()', () => {
        [
            { input: `import "file.bs"`, expected: true },
            { input: `Not.An.Import.Statement()`, expected: false },
            // an empty string would lex to a EOF token, so we cover the case of an empty array explicitly
            { input: [] as Token[], expected: false }
        ].forEach(({ input, expected }) => {
            it(`Identifies import statements: ${input}`, () => {
                let tokens = input;
                if (typeof tokens === 'string') {
                    tokens = lex(tokens);
                }

                const isImportStatement = Formatter['isImportStatement'](tokens);

                expect(isImportStatement).to.equal(expected);
            });
        });
    });
});
