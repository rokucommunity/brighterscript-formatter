import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { InlineArrayAndObjectFormatter } from './InlineArrayAndObjectFormatter';

describe('InlineArrayAndObjectFormatter', () => {
    let formatter: InlineArrayAndObjectFormatter;
    beforeEach(() => {
        formatter = new InlineArrayAndObjectFormatter();
    });

    it('returns tokens unchanged when mode is original', () => {
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObject: 'original' } as any);
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
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
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
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
        expect(result).to.be.an('array');
    });

    it('expand: continues when an opening bracket has no closer', () => {
        // Hits the !closingToken branch in expandAll.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.IntegerLiteral, text: '1' },
            { kind: TokenKind.Comma, text: ',' },
            { kind: TokenKind.Whitespace, text: ' ' },
            { kind: TokenKind.IntegerLiteral, text: '2' }
            // no closing ]
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObject: 'never' } as any);
        expect(result).to.be.an('array');
    });

    it('findMatchingFunctionEnd handles nested function expressions (depth >= 2)', () => {
        // Multi-line literal containing a function whose body itself defines a function
        // — exercises the depth-not-zero branch after depth--.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Function, text: 'function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Function, text: 'function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
        expect(result).to.be.an('array');
    });

    it('findMatchingFunctionEnd matches Sub and EndSub tokens', () => {
        // A literal containing a multi-line sub expression — the isInlineable check
        // should detect the multi-line range and refuse to collapse.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Sub, text: 'sub' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.EndSub, text: 'end sub' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
        expect(result).to.be.an('array');
    });

    it('findMatchingFunctionEnd returns -1 when function has no end', () => {
        // A literal containing an unterminated function expression — findMatchingFunctionEnd
        // returns -1 and isInlineable continues past it without rejection.
        const tokens = [
            { kind: TokenKind.LeftSquareBracket, text: '[' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Function, text: 'function' },
            // no `end function`
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.RightSquareBracket, text: ']' }
        ] as any[];
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
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
        const result = formatter.format(tokens, { inlineArrayAndObject: 'always' } as any);
        expect(result).to.be.an('array');
    });
});
