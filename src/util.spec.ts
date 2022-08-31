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
});
