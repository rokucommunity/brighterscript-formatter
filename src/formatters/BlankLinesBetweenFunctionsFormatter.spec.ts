import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { BlankLinesBetweenFunctionsFormatter } from './BlankLinesBetweenFunctionsFormatter';

describe('BlankLinesBetweenFunctionsFormatter', () => {
    let formatter: BlankLinesBetweenFunctionsFormatter;
    beforeEach(() => {
        formatter = new BlankLinesBetweenFunctionsFormatter();
    });

    it('adds blank line between functions with tokens between end function and newline', () => {
        // Covers the while loop body (endLineNewlineIndex++) by having Whitespace+Comment
        // tokens between EndFunction and its Newline
        const tokens = [
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Whitespace, text: ' ' },
            { kind: TokenKind.Comment, text: '\' comment' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Function, text: 'function' },
            { kind: TokenKind.Whitespace, text: ' ' },
            { kind: TokenKind.Identifier, text: 'b' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Eof, text: '' }
        ] as any[];
        const result = formatter.format(tokens, { blankLinesBetweenFunctions: 1 } as any);
        const text = result.map((t: any) => t.text).join('');
        expect(text).to.include('\n\n');
    });

    it('handles whitespace-only tokens in blank lines between functions', () => {
        // Covers the whitespace-in-blank-lines branch (lines 38-40)
        const tokens = [
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Whitespace, text: '    ' }, // whitespace-only line
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Function, text: 'function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Eof, text: '' }
        ] as any[];
        const result = formatter.format(tokens, { blankLinesBetweenFunctions: 1 } as any);
        // The whitespace-only line should be replaced with exactly one blank line
        const text = result.map((t: any) => t.text).join('');
        expect(text).to.equal('end function\n\nfunction\n');
    });

    it('does not add blank lines when end function is followed by non-function content', () => {
        // Covers the continue at line 49 (next token is not a function/sub)
        const tokens = [
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Newline, text: '\n' },
            { kind: TokenKind.Newline, text: '\n' }, // blank line
            { kind: TokenKind.Identifier, text: 'x' },
            { kind: TokenKind.Eof, text: '' }
        ] as any[];
        const original = tokens.map((t: any) => t.text).join('');
        const result = formatter.format(tokens, { blankLinesBetweenFunctions: 1 } as any);
        const text = result.map((t: any) => t.text).join('');
        expect(text).to.equal(original);
    });

    it('continues when end function line has no Newline or Eof (optional chaining returns undefined)', () => {
        // When the while loop scans past the end of the tokens array,
        // tokens[endLineNewlineIndex] is undefined, and ?.kind short-circuits to undefined
        const tokens = [
            { kind: TokenKind.EndFunction, text: 'end function' },
            { kind: TokenKind.Whitespace, text: '  ' }
            // No Newline, no Eof — loop runs until endLineNewlineIndex >= tokens.length
        ] as any[];
        const result = formatter.format(tokens, { blankLinesBetweenFunctions: 1 } as any);
        // Tokens unchanged since there's no Newline-terminated line
        expect(result.map((t: any) => t.text).join('')).to.equal('end function  ');
    });
});
