import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';

/**
 * Token kinds that open an indented block.
 * A blank line immediately after the Newline ending these lines will be removed.
 */
const BlockOpenerKinds = new Set([
    TokenKind.Function,
    TokenKind.Sub,
    TokenKind.If,
    TokenKind.For,
    TokenKind.ForEach,
    TokenKind.While,
    TokenKind.Try,
    TokenKind.Else,
    TokenKind.HashIf,
    TokenKind.HashElse,
    TokenKind.HashElseIf
]);

export class RemoveBlankLinesAtStartOfBlockFormatter {
    public format(tokens: Token[], _options: FormattingOptions): Token[] {
        for (let i = 0; i < tokens.length; i++) {
            if (!BlockOpenerKinds.has(tokens[i].kind)) {
                continue;
            }

            // Find the Newline that ends this line
            let newlineIndex = i + 1;
            while (newlineIndex < tokens.length && tokens[newlineIndex].kind !== TokenKind.Newline && tokens[newlineIndex].kind !== TokenKind.Eof) {
                newlineIndex++;
            }
            if (tokens[newlineIndex]?.kind !== TokenKind.Newline) {
                continue;
            }

            // After IndentFormatter, blank lines are bare Newline tokens with no surrounding whitespace.
            // Remove any consecutive bare Newline tokens immediately after the block opener's newline.
            let j = newlineIndex + 1;
            while (j < tokens.length && tokens[j].kind === TokenKind.Newline) {
                tokens.splice(j, 1);
            }
        }
        return tokens;
    }
}
