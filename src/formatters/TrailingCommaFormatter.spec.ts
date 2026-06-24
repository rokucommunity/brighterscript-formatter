import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { TrailingCommaFormatter } from './TrailingCommaFormatter';

describe('TrailingCommaFormatter', () => {
    let formatter: TrailingCommaFormatter;
    beforeEach(() => {
        formatter = new TrailingCommaFormatter();
    });

    it('returns tokens unchanged when mode is falsy', () => {
        const tokens = [
            { kind: TokenKind.Identifier, text: 'x' }
        ] as any[];
        const result = formatter.format(tokens, { trailingComma: undefined } as any);
        expect(result).to.equal(tokens);
    });

    it('continues when there is no matching closing token for an opening bracket', () => {
        // Unmatched [ — getClosingToken returns undefined → continue at line 34
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Newline, text: '\n' }
            // No RightSquareBracket
        ] as any[];
        // Should not throw and should return tokens unchanged
        const result = formatter.format(tokens, { trailingComma: 'always' } as any);
        expect(result.map((t: any) => t.text).join('')).to.equal('[\n1\n');
    });

    it('findLastContentTokenBefore skips whitespace tokens before content', () => {
        // Line with trailing whitespace: [content, Whitespace, Newline]
        // Scanning backwards from Newline hits Whitespace → continue (line 136/137)
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Whitespace, text: '  ' }, // trailing whitespace on line
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        // With 'always', the formatter should still find '1' as the last content and add comma
        const result = formatter.format(tokens, { trailingComma: 'always' } as any);
        const text = result.map((t: any) => t.text).join('');
        // '1' is the last content, a comma should be inserted after it
        expect(text).to.include(',');
    });

    it('findLastContentTokenBefore returns undefined when all preceding tokens are whitespace', () => {
        // Directly call the private method with tokens where only whitespace precedes endIndex
        const tokens = [
            { kind: TokenKind.Whitespace, text: '   ' }
        ] as any[];
        const result = (formatter as any).findLastContentTokenBefore(tokens, 1);
        expect(result).to.be.undefined;
    });
});
