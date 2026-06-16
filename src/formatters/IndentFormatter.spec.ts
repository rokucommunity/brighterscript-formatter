import { expect } from 'chai';
import { expectTokens, lex } from '../testHelpers.spec';
import { IndentFormatter } from './IndentFormatter';
import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';

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

    describe('getMatchingOpeningTokens', () => {
        it('returns null for tokens with no expected opening tokens', () => {
            const tokes = lex(`some random tokens`);
            expect(
                formatter['getMatchingOpeningTokens'](tokes, [tokes[0]], 0)
            ).to.eql([]);
        });
    });

    describe('getMatchingClosingTokens', () => {
        it('returns null for tokens with no expected closing tokens', () => {
            const tokes = lex(`some random tokens`);
            expect(
                formatter['getMatchingClosingTokens'](tokes, [tokes[0]], 0)
            ).to.eql([]);
        });
    });

    describe('getExpectedOpeningTokens', () => {
        it('returns correct possible opening tokens', () => {
            expect(
                formatter['getExpectedOpeningTokens']({ kind: TokenKind.RightParen } as Token)
            ).to.eql([TokenKind.LeftParen, TokenKind.QuestionLeftParen]);

            expect(
                formatter['getExpectedOpeningTokens']({ kind: TokenKind.RightSquareBracket } as Token)
            ).to.eql([TokenKind.LeftSquareBracket, TokenKind.QuestionLeftSquare]);

            expect(
                formatter['getExpectedOpeningTokens']({ kind: TokenKind.EndSub } as Token)
            ).to.eql([TokenKind.Sub]);

            expect(
                formatter['getExpectedOpeningTokens']({ kind: TokenKind.Identifier } as Token)
            ).to.eql([]);
        });
    });
});
