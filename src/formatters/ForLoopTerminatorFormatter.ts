import type { Parser, Token } from 'brighterscript';
import { createVisitor, TokenKind, WalkMode } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';

export class ForLoopTerminatorFormatter {
    /**
     * Mutate every `for`/`for each` loop terminator token in place to match the
     * configured style. Bogus `next` / `end for` tokens (those not actually closing
     * a loop) are left alone because the parser never associates them with a loop.
     */
    public format(tokens: Token[], options: FormattingOptions, parser: Parser) {
        const mode = options.forLoopTerminator;
        if (!mode || mode === 'original') {
            return tokens;
        }

        for (const terminator of this.collectLoopTerminators(parser)) {
            if (mode === 'next' && terminator.kind === TokenKind.EndFor) {
                terminator.kind = TokenKind.Next;
                terminator.text = 'next';
            } else if (mode === 'endfor' && terminator.kind === TokenKind.Next) {
                terminator.kind = TokenKind.EndFor;
                //write the split form; CompositeKeywordFormatter will collapse to `endfor` if requested
                terminator.text = 'end for';
            }
        }
        return tokens;
    }

    private collectLoopTerminators(parser: Parser) {
        const terminators: Token[] = [];
        parser.ast.walk(createVisitor({
            ForStatement: (statement) => {
                if (statement.endForToken) {
                    terminators.push(statement.endForToken);
                }
            },
            ForEachStatement: (statement) => {
                if (statement.tokens.endFor) {
                    terminators.push(statement.tokens.endFor);
                }
            }
        }), {
            walkMode: WalkMode.visitAllRecursive
        });
        return terminators;
    }
}
