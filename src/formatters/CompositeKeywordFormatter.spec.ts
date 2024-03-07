import { expect } from 'chai';
import { CompositeKeywordFormatter } from './CompositeKeywordFormatter';

describe('CompositeKeywordFormatter', () => {
    let Formatter: CompositeKeywordFormatter;
    beforeEach(() => {
        Formatter = new CompositeKeywordFormatter();
    });

    describe('getCompositeKeywordParts', () => {
        it('works', () => {
            let parts;
            parts = Formatter['getCompositeKeywordParts']({ text: 'endif' } as any);
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: 'end if' } as any);
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: 'elseif' } as any);
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: 'else if' } as any);
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

        });

        it('works with conditional compile parts', () => {
            let parts;

            parts = Formatter['getCompositeKeywordParts']({ text: '#else if' } as any);
            expect(parts[0]).to.equal('#else');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: '#\t else if' } as any);
            expect(parts[0]).to.equal('#\t else');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: '#end if' } as any);
            expect(parts[0]).to.equal('#end');
            expect(parts[1]).to.equal('if');

            parts = Formatter['getCompositeKeywordParts']({ text: '#\t end if' } as any);
            expect(parts[0]).to.equal('#\t end');
            expect(parts[1]).to.equal('if');
        });
    });
});
