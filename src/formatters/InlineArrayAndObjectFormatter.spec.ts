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

    it('hasNestedMultiLine continues when nested { has no matching }', () => {
        // The outer [ IS multiline. Inside, there is a { with no matching } in the tokens.
        // getClosingToken returns undefined for { → the continue branch (bid 12 b0) is covered.
        // hasNestedMultiLine returns false, so the outer [ gets collapsed.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.LeftCurlyBrace, text: '{' }, // no matching }
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObjectThreshold: 100 } as any);
        expect(result).to.be.an('array');
    });

    it('hasNestedMultiLine returns false when nested bracket is single-line', () => {
        // Outer [ is multiline. Inner [ has a matching ] with no newline inside.
        // tokens.slice().some(Newline) returns false → bid 13 b1 covered.
        // hasNestedMultiLine returns false, outer [ gets collapsed.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' }, // outer [
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.LeftSquareBracket, text: '[' }, // inner [ (single-line)
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.RightSquareBracket, text: ']' }, // closes inner [
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' } // closes outer [
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObjectThreshold: 100 } as any);
        expect(result).to.be.an('array');
    });
});
