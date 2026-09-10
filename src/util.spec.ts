import { expect } from 'chai';
import { util } from './util';
import { Lexer, TokenKind } from 'brighterscript';

describe('util', () => {
    describe('toForwardSlashes', () => {
        it('converts backslashes to forward slashes', () => {
            expect(util.toForwardSlashes('a\\b\\c.brs')).to.equal('a/b/c.brs');
        });

        it('leaves forward slashes alone', () => {
            expect(util.toForwardSlashes('a/b/c.brs')).to.equal('a/b/c.brs');
        });

        it('handles mixed separators', () => {
            expect(util.toForwardSlashes('a\\b/c\\d.brs')).to.equal('a/b/c/d.brs');
        });

        it('collapses runs of separators', () => {
            expect(util.toForwardSlashes('a\\\\b//c.brs')).to.equal('a/b/c.brs');
        });

        it('preserves a windows drive letter', () => {
            expect(util.toForwardSlashes('C:\\projects\\lib.brs')).to.equal('C:/projects/lib.brs');
        });

        it('returns an empty string unchanged', () => {
            expect(util.toForwardSlashes('')).to.equal('');
        });
    });

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
