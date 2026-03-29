import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { InlineArrayAndObjectFormatter } from './InlineArrayAndObjectFormatter';

describe('InlineArrayAndObjectFormatter', () => {
    let formatter: InlineArrayAndObjectFormatter;
    beforeEach(() => {
        formatter = new InlineArrayAndObjectFormatter();
    });

    it('returns tokens unchanged when threshold is falsy', () => {
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObjectThreshold: 0 } as any);
        expect(result).to.equal(tokens);
    });

    it('continues when there is no matching closing token for an opening bracket', () => {
        // Unmatched [ — getClosingToken returns undefined → continue at line 30/31
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Newline, text: '\n' }
            // No closing bracket
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObjectThreshold: 100 } as any);
        // Should not throw; tokens returned as-is
        expect(result.map((t: any) => t.text).join('')).to.equal('[\n1\n');
    });

    it('hasNestedMultiLine continues when there is no closing token for a nested bracket', () => {
        // Nested [ with no closing bracket inside a multiline outer [
        // The outer [ IS multiline, hasNestedMultiLine is called, the inner [ has no closer → continue (line 90/91)
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.LeftSquareBracket, text: '[' }, // nested, no closing bracket
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' } // closes the outer [
        ] as any[];
        // Should not throw; since hasNestedMultiLine can't find a closer for the inner [
        // it continues and eventually returns false (no confirmed multi-line nested)
        const result = formatter.format(tokens, { inlineArrayAndObjectThreshold: 100 } as any);
        expect(result).to.be.an('array');
    });
});
