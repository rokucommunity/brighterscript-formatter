import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { AlignAssignmentsFormatter } from './AlignAssignmentsFormatter';

describe('AlignAssignmentsFormatter', () => {
    let formatter: AlignAssignmentsFormatter;
    beforeEach(() => {
        formatter = new AlignAssignmentsFormatter();
    });

    it('handles a token stream that does not end with Newline or Eof', () => {
        // When the final segment has no Newline/Eof terminator, splitByLine still
        // pushes the remaining tokens into lines (line 90 of AlignAssignmentsFormatter)
        const tokens = [
            { kind: TokenKind.Identifier, text: 'x' },
            { kind: TokenKind.Whitespace, text: ' ' },
            { kind: TokenKind.Equal, text: '=' },
            { kind: TokenKind.Whitespace, text: ' ' },
            { kind: TokenKind.IntegerLiteral, text: '1' }
            // No Newline or Eof at end
        ] as any[];
        // Should not throw and should return the tokens
        const result = formatter.format(tokens, { alignAssignments: true } as any);
        expect(result).to.be.an('array');
        expect(result.length).to.be.greaterThan(0);
    });
});
