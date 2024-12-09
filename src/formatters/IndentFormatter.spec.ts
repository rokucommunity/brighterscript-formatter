import { expect } from 'chai';
import { expectTokens, lex } from '../testHelpers.spec';
import { IndentFormatter } from './IndentFormatter';

describe('IndentFormatter', () => {
    let formatter: IndentFormatter;

    beforeEach(() => {
        formatter = new IndentFormatter();
    });

    describe('ensureTokenIndentation', () => {
        it('does nothing for empty or invalid tokens', () => {
            expect(
                formatter['ensureTokenIndentation'](null as any, 0)
            ).to.eql(null);
            expect(
                formatter['ensureTokenIndentation']([], 0)
            ).to.eql([]);
        });

        it('handles negative tab size', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(`\tspeak()`), -2),
                ['', 'speak', '(', ')']
            );
        });

        it('does not add whitespace token if no indentation is needed', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(`speak()`), 0),
                ['speak', '(', ')']
            );
        });

        it('dedupes side-by-side whitespace tokens into one', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(` \t speak()`), 1),
                ['    ', 'speak', '(', ')']
            );
        });

        it('adds whitespace when missing', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(`speak()`), 1),
                ['    ', 'speak', '(', ')']
            );
        });

        it('adds correct indentation when missing', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(`speak()`), 3),
                ['            ', 'speak', '(', ')']
            );
        });

        it('uses supplied indentation char when provided', () => {
            expectTokens(
                formatter['ensureTokenIndentation'](lex(`speak()`), 3, '\t'),
                ['\t\t\t', 'speak', '(', ')']
            );
        });
    });

    describe('trimWhitespaceOnlyLines', () => {
        it('trims whitespace-only lines', () => {
            expectTokens(
                formatter['trimWhitespaceOnlyLines'](lex(` `)),
                []
            );
        });

        it('leaves non-whitespace-only lines intact', () => {
            expectTokens(
                formatter['trimWhitespaceOnlyLines'](lex(` speak()`)),
                [' ', 'speak', '(', ')']
            );
        });
    });
});
