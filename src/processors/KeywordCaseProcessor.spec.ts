import { expect } from 'chai';
import { KeywordCaseProcessor } from './KeywordCaseProcessor';

describe('KeywordCaseProcessor', () => {
    let processor: KeywordCaseProcessor;
    beforeEach(() => {
        processor = new KeywordCaseProcessor();
    });

    describe('upperCaseLetter()', () => {
        it('works for beginning of word', () => {
            expect(processor['upperCaseLetter']('hello', 0)).to.equal('Hello');
        });
        it('works for middle of word', () => {
            expect(processor['upperCaseLetter']('hello', 2)).to.equal('heLlo');
        });
        it('works for end of word', () => {
            expect(processor['upperCaseLetter']('hello', 4)).to.equal('hellO');
        });
        it('handles out-of-bounds indexes', () => {
            expect(processor['upperCaseLetter']('hello', -1)).to.equal('hello');
            expect(processor['upperCaseLetter']('hello', 5)).to.equal('hello');
        });
    });
});
