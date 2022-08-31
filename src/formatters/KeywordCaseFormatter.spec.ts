import { expect } from 'chai';
import { KeywordCaseFormatter } from './KeywordCaseFormatter';

describe('KeywordCaseFormatter', () => {
    let Formatter: KeywordCaseFormatter;
    beforeEach(() => {
        Formatter = new KeywordCaseFormatter();
    });

    describe('upperCaseLetter()', () => {
        it('works for beginning of word', () => {
            expect(Formatter['upperCaseLetter']('hello', 0)).to.equal('Hello');
        });
        it('works for middle of word', () => {
            expect(Formatter['upperCaseLetter']('hello', 2)).to.equal('heLlo');
        });
        it('works for end of word', () => {
            expect(Formatter['upperCaseLetter']('hello', 4)).to.equal('hellO');
        });
        it('handles out-of-bounds indexes', () => {
            expect(Formatter['upperCaseLetter']('hello', -1)).to.equal('hello');
            expect(Formatter['upperCaseLetter']('hello', 5)).to.equal('hello');
        });
    });
});
