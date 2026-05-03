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
import { MaxConsecutiveEmptyLinesFormatter } from './formatters/MaxConsecutiveEmptyLinesFormatter';
import { TrailingCommaFormatter } from './formatters/TrailingCommaFormatter';
import { BlankLinesBetweenFunctionsFormatter } from './formatters/BlankLinesBetweenFunctionsFormatter';
import { SingleLineIfFormatter } from './formatters/SingleLineIfFormatter';
import { InlineArrayAndObjectFormatter } from './formatters/InlineArrayAndObjectFormatter';
import { RemoveBlankLinesAtStartOfBlockFormatter } from './formatters/RemoveBlankLinesAtStartOfBlockFormatter';
import { AlignAssignmentsFormatter } from './formatters/AlignAssignmentsFormatter';

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
        sortImports: new SortImportsFormatter(),
        maxConsecutiveEmptyLines: new MaxConsecutiveEmptyLinesFormatter(),
        trailingComma: new TrailingCommaFormatter(),
        blankLinesBetweenFunctions: new BlankLinesBetweenFunctionsFormatter(),
        singleLineIf: new SingleLineIfFormatter(),
        inlineArrayAndObject: new InlineArrayAndObjectFormatter(),
        removeBlankLinesAtStartOfBlock: new RemoveBlankLinesAtStartOfBlockFormatter(),
        alignAssignments: new AlignAssignmentsFormatter()
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

        // Must run before formatMultiLineObjectsAndArrays so that arrays/AAs that fit
        // within the threshold are already single-line and won't be re-expanded.
        if (options.inlineArrayAndObjectThreshold) {
            tokens = this.formatters.inlineArrayAndObject.format(tokens, options);
        }

        if (options.formatMultiLineObjectsAndArrays) {
            tokens = this.formatters.multiLineItem.format(tokens);
        }

        if (options.compositeKeywords) {
            tokens = this.formatters.compositeKeyword.format(tokens, options);
        }

        if (options.singleLineIf && options.singleLineIf !== 'original') {
            tokens = this.formatters.singleLineIf.format(tokens, options, parser);
            // IndentFormatter uses the parser's AST to detect inline if statements and skip
            // indenting their bodies. After expanding an inline if we must re-parse so the
            // updated multi-line structure is reflected and IndentFormatter indents correctly.
            parser = Parser.parse(
                tokens.filter(x => x.kind !== TokenKind.Whitespace),
                { mode: ParseMode.BrighterScript }
            );
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

        // Runs after interior-whitespace formatting so the token stream already has
        // normalized spacing (e.g. no trailing whitespace before the closing bracket).
        if (options.trailingComma && options.trailingComma !== 'original') {
            tokens = this.formatters.trailingComma.format(tokens, options);
        }

        //dedupe side-by-side Whitespace tokens
        util.dedupeWhitespace(tokens);

        if (options.formatIndent) {
            tokens = this.formatters.indent.format(tokens, options, parser);
        }

        // The following formatters operate on blank lines and must run after IndentFormatter
        // because IndentFormatter.trimWhitespaceOnlyLines reduces blank lines to bare Newline
        // tokens, which is the representation these formatters rely on.

        if (options.maxConsecutiveEmptyLines !== undefined) {
            tokens = this.formatters.maxConsecutiveEmptyLines.format(tokens, options);
        }

        if (options.blankLinesBetweenFunctions !== undefined) {
            tokens = this.formatters.blankLinesBetweenFunctions.format(tokens, options);
        }

        if (options.removeBlankLinesAtStartOfBlock) {
            tokens = this.formatters.removeBlankLinesAtStartOfBlock.format(tokens, options);
        }

        // Runs after IndentFormatter so that indentation whitespace is already in place
        // and the alignment padding is added on top of the correct base indent.
        if (options.alignAssignments) {
            tokens = this.formatters.alignAssignments.format(tokens, options);
        }

        return tokens;
    }

    /**
     * Convert the character at the specified index to upper case
     * @deprecated
     */
    //TODO this was moved, and has been left here for backwards compatibility reasons. Remove in the next major release.
    // eslint-disable-next-line @typescript-eslint/dot-notation
    public upperCaseLetter = KeywordCaseFormatter.prototype['upperCaseLetter'];
}
