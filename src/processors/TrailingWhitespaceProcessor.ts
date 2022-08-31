import type { Token } from 'brighterscript';
import { TokenKind } from 'brighterscript';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class TrailingWhitespaceProcessor {
    /**
     * Remove all trailing Whitespace
     */
    public process(
        tokens: Token[],
        options: FormattingOptions
    ) {
        let nextLineStartTokenIndex = 0;
        //the list of output tokens
        let outputTokens: Token[] = [];

        //set the loop to run for a max of double the number of tokens we found so we don't end up with an infinite loop
        for (let outerLoopCounter = 0; outerLoopCounter <= tokens.length * 2; outerLoopCounter++) {
            let lineObj = util.getLineTokens(nextLineStartTokenIndex, tokens);

            nextLineStartTokenIndex = lineObj.stopIndex + 1;
            let lineTokens = lineObj.tokens;
            //the last token is Newline or EOF, so the next-to-last token is where the trailing Whitespace would reside
            let potentialWhitespaceTokenIndex = lineTokens.length - 2;

            let whitespaceTokenCandidate = lineTokens[potentialWhitespaceTokenIndex];

            //empty lines won't have any tokens
            if (whitespaceTokenCandidate) {
                //if the final token is Whitespace, throw it away
                if (whitespaceTokenCandidate.kind === TokenKind.Whitespace) {
                    lineTokens.splice(potentialWhitespaceTokenIndex, 1);

                    //if the final token is a comment, trim the Whitespace from the righthand side
                } else if (
                    whitespaceTokenCandidate.kind === TokenKind.Comment
                ) {
                    whitespaceTokenCandidate.text = whitespaceTokenCandidate.text.trimRight();
                }
            }

            //add this line to the output
            outputTokens.push.apply(outputTokens, lineTokens);

            //if we have found the end of file, quit the loop
            if (
                lineTokens[lineTokens.length - 1].kind === TokenKind.Eof
            ) {
                break;
            }
        }
        return outputTokens;
    }
}
