import type { Token } from 'brighterscript';
import { CompositeKeywords, CompositeKeywordStartingWords, Keywords } from '../constants';
import type { FormattingOptions } from '../FormattingOptions';
import { util } from '../util';

export class KeywordCaseFormatter {
    /**
     * Handle indentation for an array of tokens
     */
    public format(tokens: Token[], options: FormattingOptions) {
        for (let token of tokens) {

            //if this token is a keyword
            if (Keywords.includes(token.kind)) {

                let keywordCase: FormattingOptions['keywordCase'];
                let lowerKind = token.kind.toLowerCase();

                //a token is a type if it's preceeded by an `as` token
                if (this.isType(tokens, token)) {
                    //options.typeCase is always set to options.keywordCase when not provided
                    keywordCase = options.typeCase;
                    //if this is an overridden type keyword, use that override instead
                    if (options.typeCaseOverride && options.typeCaseOverride[lowerKind] !== undefined) {
                        keywordCase = options.typeCaseOverride[lowerKind];
                    }
                } else {
                    keywordCase = options.keywordCase;
                    //if this is an overridable keyword, use that override instead
                    if (options.keywordCaseOverride && options.keywordCaseOverride[lowerKind] !== undefined) {
                        keywordCase = options.keywordCaseOverride[lowerKind];
                    }
                }
                switch (keywordCase) {
                    case 'lower':
                        token.text = token.text.toLowerCase();
                        break;
                    case 'upper':
                        token.text = token.text.toUpperCase();
                        break;
                    case 'title':
                        let lowerValue = token.text.toLowerCase();

                        //format the first letter (conditional compile composite-keywords start with hash)
                        let charIndex = token.text.startsWith('#') ? 1 : 0;
                        token.text = this.upperCaseLetter(token.text, charIndex);

                        //if this is a composite keyword, format the first letter of the second word
                        if (CompositeKeywords.includes(token.kind)) {
                            let spaceCharCount = (/\s+/.exec(lowerValue) ?? []).length;

                            let firstWordLength = CompositeKeywordStartingWords.find(x => lowerValue.startsWith(x))!.length;

                            let nextWordFirstCharIndex = firstWordLength + spaceCharCount;
                            token.text = this.upperCaseLetter(token.text, nextWordFirstCharIndex);
                        }
                        break;
                    case 'original':
                    default:
                        //do nothing
                        break;

                }
            }
        }
        return tokens;
    }

    /**
     * Convert the character at the specified index to upper case
     */
    private upperCaseLetter(text: string, index: number) {
        //out of bounds index should be a noop
        if (index < 0 || index > text.length) {
            return text;
        }
        text =
            //add the beginning text
            text.substring(0, index) +
            //uppercase the letter
            text.substring(index, index + 1).toUpperCase() +
            //rest of word
            text.substring(index + 1).toLowerCase();
        return text;
    }

    /**
     * Determine if the token is a type keyword (meaing preceeded by `as` token)
     * @param token
     */
    public isType(tokens: Token[], token: Token) {
        let previousToken = util.getPreviousNonWhitespaceToken(tokens, tokens.indexOf(token));
        if (previousToken && previousToken.text.toLowerCase() === 'as') {
            return true;
        } else {
            return false;
        }
    }
}
