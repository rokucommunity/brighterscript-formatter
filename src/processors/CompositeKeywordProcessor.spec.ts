import { expect } from 'chai';
import { CompositeKeywordProcessor } from './CompositeKeywordProcessor';

describe('CompositeKeywordProcessor', () => {
    let processor: CompositeKeywordProcessor;
    beforeEach(() => {
        processor = new CompositeKeywordProcessor();
    });

    describe('getCompositeKeywordParts', () => {
        it('works', () => {
            let parts;
            parts = processor['getCompositeKeywordParts']({ text: 'endif' } as any);
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = processor['getCompositeKeywordParts']({ text: 'end if' } as any);
            expect(parts[0]).to.equal('end');
            expect(parts[1]).to.equal('if');

            parts = processor['getCompositeKeywordParts']({ text: 'elseif' } as any);
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

            parts = processor['getCompositeKeywordParts']({ text: 'else if' } as any);
            expect(parts[0]).to.equal('else');
            expect(parts[1]).to.equal('if');

            parts = processor['getCompositeKeywordParts']({ text: '#else if' } as any);
            expect(parts[0]).to.equal('#else');
            expect(parts[1]).to.equal('if');
        });
    });
});

