import { expect } from 'chai';
import { util } from './util';
import { Lexer, TokenKind } from 'brighterscript';

describe('util', () => {
    describe('getNextNonWhitespaceToken', () => {
        it('returns undefined when index is out of bounds', () => {
            expect(util.getNextNonWhitespaceToken([], -1)).to.be.undefined;
        });
    });

    describe('printTokens', () => {
        expect(
            util.printTokens(
                Lexer.scan(`    print hello`, { includeWhitespace: true }).tokens
            )
        ).to.eql(`••••print•hello`);
    });

    describe('dedupeWhitespace', () => {
        it('dedupes Whitespace', () => {
            const tokens = [{
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 0
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 1
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 2
            }];
            util.dedupeWhitespace(tokens as any);
            expect(tokens).to.be.lengthOf(1);
        });
    });

    describe('getNextNonWhitespaceTokenIndex', () => {
        it('returns undefined when index is out of bounds', () => {
            expect(util.getNextNonWhitespaceTokenIndex([], -1)).to.be.undefined;
        });

        it('returns undefined when stopAtNewLine is true and found a newline', () => {
            const tokens = [{
                kind: TokenKind.Identifier,
                text: 'hello',
                startIndex: 0
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 0
            }, {
                kind: TokenKind.Newline,
                text: '\n',
                startIndex: 0
            }];
            expect(util.getNextNonWhitespaceTokenIndex(tokens as any, 0, true)).to.be.undefined;
        });

        it('returns the index of the next non-whitespace token', () => {
            const tokens = [{
                kind: TokenKind.Identifier,
                text: 'hello',
                startIndex: 0
            }, {
                kind: TokenKind.Whitespace,
                text: ' ',
                startIndex: 0
            }, {
                kind: TokenKind.Identifier,
                text: 'world',
                startIndex: 0
            }, {
                kind: TokenKind.Newline,
                text: '\n',
                startIndex: 0
            }];
            expect(util.getNextNonWhitespaceTokenIndex(tokens as any, 0, true)).to.equal(2);
        });
    });
});
