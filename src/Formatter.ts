import type { Token } from 'brighterscript';
import { Lexer, ParseMode, Parser, TokenKind } from 'brighterscript';
import { SourceNode } from 'source-map';
import { DEFAULT_INDENT_SPACE_COUNT } from './constants';
import type { FormattingOptions } from './FormattingOptions';
import { normalizeOptions } from './FormattingOptions';
import { CompositeKeywordFormatter } from './formatters/CompositeKeywordFormatter';
import { IndentFormatter } from './formatters/IndentFormatter';
import { InteriorWhitespaceFormatter } from './formatters/InteriorWhitespaceFormatter';
import { KeywordCaseFormatter } from './formatters/KeywordCaseFormatter';
import { MultiLineItemFormatter } from './formatters/MultiLineItemFormatter';
import { TrailingWhitespaceFormatter } from './formatters/TrailingWhitespaceFormatter';
import { util } from './util';
import { SortImportsFormatter } from './formatters/SortImportsFormatter';

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

    private formatters = {
        indent: new IndentFormatter(),
        multiLineItem: new MultiLineItemFormatter(),
        compositeKeyword: new CompositeKeywordFormatter(),
        keywordCase: new KeywordCaseFormatter(),
        trailingWhitespace: new TrailingWhitespaceFormatter(),
        interiorWhitespace: new InteriorWhitespaceFormatter(),
        sortImports: new SortImportsFormatter()
    };

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
            tokens.filter(x => x.kind !== TokenKind.Whitespace),
            //parse all files in brightERscript mode (all .brs is valid .bs anyway, right?)
            {
                mode: ParseMode.BrighterScript
            }
        );

        tokens = this.includeCommentTokens(tokens);

        if (options.formatMultiLineObjectsAndArrays) {
            tokens = this.formatters.multiLineItem.format(tokens);
        }

        if (options.compositeKeywords) {
            tokens = this.formatters.compositeKeyword.format(tokens, options);
        }

        tokens = this.formatters.keywordCase.format(tokens, options);

        if (options.removeTrailingWhiteSpace) {
            tokens = this.formatters.trailingWhitespace.format(tokens, options);
        }

        if (options.formatInteriorWhitespace) {
            tokens = this.formatters.interiorWhitespace.format(tokens, parser, options);
        }

        if (options.sortImports) {
            tokens = this.formatters.sortImports.format(tokens);
        }

        //dedupe side-by-side Whitespace tokens
        util.dedupeWhitespace(tokens);

        if (options.formatIndent) {
            tokens = this.formatters.indent.format(tokens, options, parser);
        }
        return tokens;
    }

    private includeCommentTokens(tokens: Token[]) {
        //bring out comments as their own tokens
        let whiteSpaceTokens = [] as Array<Token>;
        const tokensWithComments = [] as Array<Token>;
        for (const token of tokens) {
            if (token.kind === TokenKind.Newline || token.kind === TokenKind.Whitespace) {
                whiteSpaceTokens.push(token);
                continue;
            }
            if (token.leadingTrivia.find(x => x.kind === TokenKind.Comment)) {
                tokensWithComments.push(...token.leadingTrivia);
                whiteSpaceTokens = [];
            }
            tokensWithComments.push(...whiteSpaceTokens);
            tokensWithComments.push(token);
            whiteSpaceTokens = [];
        }
        tokensWithComments.push(...whiteSpaceTokens);
        return tokensWithComments;
    }

    /**
     * Convert the character at the specified index to upper case
     * @deprecated
     */
    //TODO this was moved, and has been left here for backwards compatibility reasons. Remove in the next major release.
    // eslint-disable-next-line @typescript-eslint/dot-notation
    public upperCaseLetter = KeywordCaseFormatter.prototype['upperCaseLetter'];
}
