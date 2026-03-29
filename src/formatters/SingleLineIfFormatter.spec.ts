import { expect } from 'chai';
import { TokenKind } from 'brighterscript';
import { SingleLineIfFormatter } from './SingleLineIfFormatter';

describe('SingleLineIfFormatter', () => {
    let formatter: SingleLineIfFormatter;
    beforeEach(() => {
        formatter = new SingleLineIfFormatter();
    });

    const fakeParser = {
        ast: {
            walk: (_visitor: any, _opts: any) => { /* no-op */ }
        }
    } as any;

    describe('format()', () => {
        it('returns tokens unchanged when mode is falsy', () => {
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[];
            const result = formatter.format(tokens, { singleLineIf: undefined } as any, fakeParser);
            expect(result).to.equal(tokens);
        });
    });

    describe('isStandaloneIf()', () => {
        it('returns false when the if token is not found in the tokens array', () => {
            const ifToken = { kind: TokenKind.If, text: 'if' };
            const stmt = { tokens: { if: ifToken } } as any;
            const tokens = [{ kind: TokenKind.Identifier, text: 'x' }] as any[]; // ifToken not in tokens
            const result = (formatter as any).isStandaloneIf(tokens, stmt);
            expect(result).to.be.false;
        });
    });

    describe('expand()', () => {
        it('returns early when thenToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: undefined } } as any;
            // Should return without modifying tokens
            (formatter as any).expand(tokens, stmt, {} as any);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when thenToken is not found in tokens', () => {
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[]; // thenToken not in tokens
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, {} as any);
            expect(tokens.length).to.equal(1);
        });

        it('inserts a Newline when the token after then is not Whitespace', () => {
            // then immediately followed by a body token (no whitespace)
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const bodyToken = { kind: TokenKind.Identifier, text: 'y' };
            const eofToken = { kind: TokenKind.Eof, text: '' };
            const tokens = [thenToken, bodyToken, eofToken] as any[];
            const stmt = { tokens: { then: thenToken } } as any;
            (formatter as any).expand(tokens, stmt, { compositeKeywords: 'split' } as any);
            // A Newline should be spliced in at index 1
            expect(tokens[1].kind).to.equal(TokenKind.Newline);
        });
    });

    describe('collapse()', () => {
        it('returns early when thenToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: undefined, endIf: {} } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when endIfToken is undefined', () => {
            const tokens = [{ kind: TokenKind.If, text: 'if' }] as any[];
            const stmt = { tokens: { then: {}, endIf: undefined } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when thenToken is not found in tokens', () => {
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const endIfToken = { kind: TokenKind.EndIf, text: 'end if' };
            const tokens = [endIfToken] as any[]; // thenToken not in tokens
            const stmt = { tokens: { then: thenToken, endIf: endIfToken } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(1);
        });

        it('returns early when the token after then is not a Newline (after skipping whitespace)', () => {
            // then is followed by a non-Newline, non-Whitespace token
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const bodyToken = { kind: TokenKind.Identifier, text: 'y' };
            const endIfToken = { kind: TokenKind.EndIf, text: 'end if' };
            const tokens = [thenToken, bodyToken, endIfToken] as any[];
            const stmt = { tokens: { then: thenToken, endIf: endIfToken } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(3); // unchanged
        });

        it('returns early when there is no Newline before endIf (unexpected structure)', () => {
            // then is followed by Newline, then endIf is immediately after body (no Newline before endIf)
            const thenToken = { kind: TokenKind.Then, text: 'then' };
            const newlineToken = { kind: TokenKind.Newline, text: '\n' };
            const bodyToken = { kind: TokenKind.Identifier, text: 'y' }; // body without line terminator
            const endIfToken = { kind: TokenKind.EndIf, text: 'end if' };
            // No Newline between bodyToken and endIfToken
            const tokens = [thenToken, newlineToken, bodyToken, endIfToken] as any[];
            const stmt = { tokens: { then: thenToken, endIf: endIfToken } } as any;
            (formatter as any).collapse(tokens, stmt);
            expect(tokens.length).to.equal(4); // unchanged
        });
    });
});
