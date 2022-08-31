import { Lexer, Parser, TokenKind } from 'brighterscript';
import { SourceNode } from 'source-map';
import { DEFAULT_INDENT_SPACE_COUNT } from './constants';
import type { FormattingOptions } from './FormattingOptions';
import { normalizeOptions } from './FormattingOptions';
import { CompositeKeywordProcessor } from './processors/CompositeKeywordProcessor';
import { IndentProcessor } from './processors/IndentProcessor';
import { InteriorWhitespaceProcessor } from './processors/InteriorWhitespaceProcessor';
import { KeywordCaseProcessor } from './processors/KeywordCaseProcessor';
import { MultiLineItemProcessor } from './processors/MultiLineItemProcessor';
import { TrailingWhitespaceProcessor } from './processors/TrailingWhitespaceProcessor';
import { util } from './util';

export class Formatter {
    /**
     * Construct a new formatter. The options provided here will be normalized exactly once,
     * and stored on the formatter instance.
     */
    public constructor(formattingOptions?: FormattingOptions) {
        if (formattingOptions) {
            this.formattingOptions = normalizeOptions(formattingOptions);
        }
    }

    /**
     * The formatting options provided in the constructor. Can be undefined if none were provided
     */
    public formattingOptions?: FormattingOptions;

    /**
     * The default number of spaces when indenting with spaces
     */
    public static DEFAULT_INDENT_SPACE_COUNT = DEFAULT_INDENT_SPACE_COUNT;

    private indentProcessor = new IndentProcessor();

    private multiLineItemProcessor = new MultiLineItemProcessor();

    private compositeKeywordProcessor = new CompositeKeywordProcessor();

    private keywordCaseProcessor = new KeywordCaseProcessor();

    private trailingWhitespaceProcessor = new TrailingWhitespaceProcessor();

    private interiorWhitespaceProcessor = new InteriorWhitespaceProcessor();

    /**
     * Format the given input.
     * @param inputText the text to format
     * @param formattingOptions options specifying formatting preferences
     */
    public format(inputText: string, formattingOptions?: FormattingOptions) {
        let tokens = this.getFormattedTokens(inputText, formattingOptions);
        //join all tokens back together into a single string
        return tokens.map(x => x.text).join('');
    }

    /**
     * Format the given input and return the formatted text as well as a source map
     * @param inputText the text to format
     * @param sourcePath the path to the file being formatted (used for sourcemap generator)
     * @param formattingOptions options specifying formatting preferences
     * @returns an object with property `code` holding the formatted code, and `map` holding the source map.
     */
    public formatWithSourceMap(inputText: string, sourcePath: string, formattingOptions?: FormattingOptions) {
        let tokens = this.getFormattedTokens(inputText, formattingOptions);
        let chunks = [] as Array<string | SourceNode>;
        for (let token of tokens) {
            if (token.range) {
                chunks.push(
                    new SourceNode(
                        //BrighterScript line numbers are 0-based, but source-map expects 1-based
                        token.range.start.line + 1,
                        token.range.start.character,
                        sourcePath,
                        token.text
                    )
                );
            } else {
                chunks.push(token.text);
            }
        }
        return new SourceNode(null, null, sourcePath, chunks).toStringWithSourceMap();
    }

    /**
     * Format the given input.
     * @param inputText the text to format
     * @param formattingOptions options specifying formatting preferences
     */
    public getFormattedTokens(inputText: string, formattingOptions?: FormattingOptions) {
        /**
         * Choose options in this order:
         *  1. The provided options
         *  2. The options from this instance property
         *  3. The default options
         */
        let options = normalizeOptions({
            ...this.formattingOptions,
            ...formattingOptions
        });

        let { tokens } = Lexer.scan(inputText, {
            includeWhitespace: true
        });
        let parser = Parser.parse(
            //strip out whitespace because the parser can't handle that
            tokens.filter(x => x.kind !== TokenKind.Whitespace)
        );

        if (options.formatMultiLineObjectsAndArrays) {
            tokens = this.multiLineItemProcessor.process(tokens);
        }

        if (options.compositeKeywords) {
            tokens = this.compositeKeywordProcessor.process(tokens, options);
        }

        tokens = this.keywordCaseProcessor.process(tokens, options);

        if (options.removeTrailingWhiteSpace) {
            tokens = this.trailingWhitespaceProcessor.process(tokens, options);
        }

        if (options.formatInteriorWhitespace) {
            tokens = this.interiorWhitespaceProcessor.process(tokens, parser, options);
        }

        //dedupe side-by-side Whitespace tokens
        util.dedupeWhitespace(tokens);

        if (options.formatIndent) {
            tokens = this.indentProcessor.process(tokens, options, parser);
        }
        return tokens;
    }

    /**
     * Convert the character at the specified index to upper case
     * @deprecated
     */
    //TODO this was moved, and has been left here for backwards compatibility reasons. Remove in the next major release.
    // eslint-disable-next-line @typescript-eslint/dot-notation
    public upperCaseLetter = KeywordCaseProcessor.prototype['upperCaseLetter'];
}
