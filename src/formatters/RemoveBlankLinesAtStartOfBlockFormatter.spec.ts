import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { RemoveBlankLinesAtStartOfBlockFormatter } from './RemoveBlankLinesAtStartOfBlockFormatter';

describe('RemoveBlankLinesAtStartOfBlockFormatter', () => {
    let formatter: RemoveBlankLinesAtStartOfBlockFormatter;
    beforeEach(() => {
        formatter = new RemoveBlankLinesAtStartOfBlockFormatter();
    });

    it('continues when a block-opener token has no following Newline', () => {
        // When the block opener (e.g. Function) is at the end of the token stream with
        // no Newline after it, the formatter should continue without crashing (line 37)
        const tokens = [
            { kind: TokenKind.Function, text: 'function' }
            // No Newline or Eof after — newlineIndex will be >= tokens.length
        ] as any[];
        const result = formatter.format(tokens, {} as any);
        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
    });
});
