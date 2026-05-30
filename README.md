# brighterscript-formatter

A code formatter for BrightScript and [BrighterScript](https://github.com/RokuCommunity/brighterscript).

[![build status](https://img.shields.io/github/actions/workflow/status/rokucommunity/brighterscript-formatter/build.yml?branch=master&logo=github)](https://github.com/rokucommunity/brighterscript-formatter/actions?query=branch%3Amaster+workflow%3Abuild)
[![security](https://img.shields.io/github/actions/workflow/status/rokucommunity/brighterscript-formatter/security-audit.yml?branch=master&label=security&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHJlY3QgeD0iMyIgeT0iOCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjciIHJ4PSIxIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik01IDhWNWEzIDMgMCAwIDEgNiAwdjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==)](https://github.com/rokucommunity/brighterscript-formatter/actions/workflows/security-audit.yml)
[![coverage status](https://img.shields.io/coveralls/github/rokucommunity/brighterscript-formatter?logo=coveralls)](https://coveralls.io/github/rokucommunity/brighterscript-formatter?branch=master)
[![monthly downloads](https://img.shields.io/npm/dm/brighterscript-formatter.svg?sanitize=true&logo=npm&logoColor=&label=npm)](https://npmcharts.com/compare/brighterscript-formatter?minimal=true)
[![npm version](https://img.shields.io/npm/v/brighterscript-formatter.svg?logo=npm&label=npm)](https://www.npmjs.com/package/brighterscript-formatter)
[![license](https://img.shields.io/github/license/rokucommunity/brighterscript-formatter.svg)](LICENSE)
[![Slack](https://img.shields.io/badge/Slack-RokuCommunity-4A154B?logo=slack)](https://join.slack.com/t/rokudevelopers/shared_invite/zt-4vw7rg6v-NH46oY7hTktpRIBM_zGvwA)

## Installation
### npm
```bash
npm install brighterscript-formatter -g
```

## Usage
### CLI
**:exclamation: WARNING**: be sure to commit your files before using the `--write` flag, as that will overwrite your files
```bash


bsfmt <files...> [<options>]

# help
bsfmt --help

# format one
bsfmt source/main.brs --write

# check many
bsfmt "source/**/*.brs" --check

# skip loading from bsfmt.json
bsfmt "source/**/*.brs" --no-bsfmt

#path to custom bsfmt.json
bsfmt "source/**/*.brs" --bsfmt-path "../common/bsfmt.json"
```

## bsfmt.json

The CLI reads formatting options from an optional `./bsfmt.json` (see formatting options section) which should look like:

```json
{
    "indentStyle": "spaces",
    "indentSpaceCount": 2
}
```


## Excluding files
bsfmt supports excluding files as well. Consider this example. It will include all files, and then exclude the files found in `roku_modules`
```bash
bsfmt "source/**/*.brs" "!**/roku_modules/*.*"
```


### CLI Options
| Option | Type | Default | Description |
|-|-|-|-|
| cwd | `string`| `process.cwd()` | The current working directory that should be used when running this runner |
| write |`boolean` |  `false`  | Rewrites all processed in place. It is recommended to commit your files before using this option. |
| check |`boolean` |  `false`  | List any unformatted files and return a nonzero eror code if any were found |
| absolute |`boolean` |  `false`  | Print absolute file paths instead of relative paths. |
| noBsfmt |`boolean` | `false`   | Don't read a bsfmt.json file |
| bsfmtPath |`string` | `undefined`   | Use a specified path to bsfmt.json instead of the default |
||||
All boolean, string, and integer [`bsfmt.json`](#bsfmtjson-options) options are supported as well. Complex options such as `keywordCaseOverride` or `typeCaseOverride` are not currently supported via the CLI and should be provided in the `bsfmt.json` or through the node API. Feel free to [open an issue](https://github.com/rokucommunity/brighterscript-formatter/issues/new) if you would like to see support for these options via the CLI.



## bsfmt.json options
| Option | Type | Default | Description |
|-|-|-|-|
|indentStyle| `"tabs", "spaces"`|`"spaces"`| The type of whitespace to use when indenting the beginning of lines. Has no effect if `formatIndent` is false |
|indentSpaceCount| `number` | `4` | The number of spaces to use when indentStyle is 'spaces'. Default is 4. Has no effect if `formatIndent` is false or if `indentStype` is set to `"tabs"`|
|formatIndent| `boolean` | `true` | If true, the code is indented. If false, the existing indentation is left intact. |
|keywordCase| `"lower", "upper", "title", "original"` | `"lower"` |  Replaces all keywords with the upper or lower case settings specified (excluding types...see `typeCase`). If set to `'original'`, they are not modified at all.|
|typeCase| `"lower", "upper", "title", "original"` | Value from `keywordCase` | Replaces all type keywords (`function`, `integer`, `string`, etc...) with the upper or lower case settings specified. If set to `"original"`, they are not modified at all. If falsey (or omitted), it defaults to the value in `keywordCase`|
|compositeKeywords| `"split", "combine", "original"`| `"split"` | Forces all composite keywords (i.e. `elseif`, `endwhile`, etc...) to be consistent. If `"split"`, they are split into their alternatives (`else if`, `end while`). If `"combine"`', they are combined (`elseif`, `endwhile`). If `"original"` or falsey, they are not modified. |
|removeTrailingWhiteSpace|`boolean`|`true`| Remove (or don't remove) trailing whitespace at the end of each line |
|[keywordCaseOverride](#keywordCaseOverride)| `object`| `undefined`| Provides a way to override keyword case at the individual TokenType level|
|[typeCaseOverride](#typeCaseOverride)|`object`|`undefined`| Provides a way to override type keyword case at the individual TokenType level.Types are defined as keywords that are preceeded by an `as` token.|
|formatInteriorWhitespace|`boolean`|`true`| All whitespace between items is reduced to exactly 1 space character and certain keywords and operators are padded with whitespace.  This is a catchall property that will also disable the following rules: `insertSpaceBeforeFunctionParenthesis`, `insertSpaceBetweenEmptyCurlyBraces` `insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces`|
|insertSpaceBeforeFunctionParenthesis|`boolean`|`false`| If true, a space is inserted to the left of an opening function declaration parenthesis. (i.e. `function main ()` or `function ()`). If false, all spacing is removed (i.e. `function main()` or `function()`).|
|insertSpaceBetweenEmptyCurlyBraces|`boolean`|`false`| If true, empty curly braces will contain exactly 1 whitespace char (i.e. `{ }`). If false, there will be zero whitespace chars between empty curly braces (i.e. `{}`) |
|insertSpaceAfterConditionalCompileSymbol|`boolean`|`false`| If true, ensure exactly 1 space between `#` and the keyword (i.e. `# if true`). If false, remove all whitespace between `#` and the keyword (i.e. `#if true`)|
|insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces|`boolean`|`true`| If true, ensure exactly 1 space after leading and before trailing curly braces. If false, REMOVE all whitespace after leading and before trailing curly braces (excluding beginning-of-line indentation spacing)|
|insertSpaceBetweenAssociativeArrayLiteralKeyAndColon|`boolean`|`false`| If true, ensure exactly 1 space between an associative array literal key and its colon. If false, all space between the key and its colon will be removed |
|formatSingleLineCommentType|`"singlequote", "rem", "original"`| `"original"` | Forces all single-line comments to use the same style. If 'singlequote' or falsey, all comments are preceeded by a single quote. This is the default. If `"rem"`, all comments are preceeded by `rem`. If `"original"`, the comment type is unchanged|
|formatMultiLineObjectsAndArrays|`boolean`| `true`|For multi-line objects and arrays, move everything after the `{` or `[` and everything before the `}` or `]` onto a new line.`|
|trailingComma| `"always", "allButLast", "never", "original"` | `"original"` | Controls commas on items of multi-line arrays and associative arrays. `"always"`: every item gets a trailing comma (including the last). `"allButLast"`: every item except the last gets a comma (conventional style). `"never"`: all item commas are removed. `"original"`: commas are not modified. Has no effect on single-line arrays or AAs.|
|maxConsecutiveEmptyLines|`number`|`undefined`| Collapse runs of consecutive blank lines down to at most this many. For example, `1` collapses three blank lines in a row into one. When omitted, blank lines are not modified.|
|singleLineIf|`"inline", "inlineNoElseIf", "inlineNoElse", "block", "original"`|`"original"`| Controls how `if` statements are formatted. `"inline"`: collapse to inline form whenever the body fits on one line, including ifs with `else` and `else if` chains. `"inlineNoElseIf"`: collapse to inline form, but ifs with an `else if` chain stay in block form. `"inlineNoElse"`: only collapse simple `if/then` ifs that have no `else` at all. `"block"`: always use multi-line block form (expand inline ifs to `if/then/end if`). `"original"`: leave each if as written.|
|inlineArrayAndObject|`"always", "never", "fitsLine", "original"`|`"original"`| Controls how arrays and associative arrays are formatted across lines. `"always"`: collapse multi-line literals to one line (regardless of length). `"never"`: expand single-line literals to multi-line. `"fitsLine"`: collapse only when the resulting line fits within `maxLineLength`; falls back to `"always"` when `maxLineLength` is unset. `"original"`: leave each literal as written. Literals containing line comments, `bs:disable-line` directives, conditional-compile directives, regex literals, or items whose value spans multiple physical lines are never collapsed.|
|maxLineLength|`number`|`undefined`| Target maximum line length, in characters. Currently consumed by `inlineArrayAndObject: "fitsLine"` to decide whether collapsing keeps a line within budget. Reserved for future length-aware rules.|
|blockSpacing|`"before", "after", "between", "always", "original", { default?, function?, sub?, if?, for?, while?, try? }`|`"original"`| Controls blank-line spacing around block constructs. String form applies the same policy to every supported block. `"before"` ensures a blank line above the block. `"after"` ensures a blank line below the block. `"between"` ensures both. `"always"` adds inner-body padding too (blank line at start and end of body). `"original"` leaves spacing alone. Inline ifs (and inline else branches) are not blocks and are skipped. Leading line comments immediately above an opener are treated as part of the block — the blank line lands above the comment, not between comment and opener. Trailing comments immediately after a closer attach to the closer. Spacing is suppressed when the construct is the first or last thing in its parent's body. Object form allows per-construct overrides; constructs not listed fall back to `default` (or `"original"` if `default` is also omitted). `if` covers the entire if/else if/else chain. `for` covers `for` and `for each`. `try` covers the entire try/catch construct. Example: `{ default: "between", function: "always" }`.|
|alignAssignments|`boolean`|`false`| If true, align the `=` sign in consecutive simple assignment statements by padding the left-hand side with spaces. Alignment resets after a blank line or a non-assignment statement.|
|sortImports|`boolean`| `false`|Sort imports alphabetically.|

### keywordCaseOverride
For more flexibility in how to format the case of keywords, you can specify the case preference for each individual keyword. Here's an example:

```js
{
    //by default, force all keywords to lower case
    "keywordCase": "lower",
    //override these specific keywords to upper case
    "keywordCaseOverride": {
        "and": "upper",
        "or": "upper"
    }
}
```

The full list of keywords detected by this option can be found [here](https://github.com/rokucommunity/brighterscript-formatter/blob/095f9dc5ec418d46d3ea6197712f5d11f71d922f/src/Formatter.ts#L1145).

### typeCaseOverride
For more flexibility in how to format the case of types, you can specify the case preference for each individual type. Here's an example:

```js
{
    //by default, force all types to lower case
    "typeCase": "lower",
    //override these specific type tokens to upper case
    "typeCaseOverride": {
        "string": "upper",
        "boolean": "upper"
    },
}
```

A type is any token found directly after an `as` keyword.

## Library

### General usage

```javascript
import { Formatter } from 'brighterscript-formatter';

//create a new instance of the formatter
var formatter = new Formatter();

//retrieve the raw BrighterScript/BrightScript file contents (probably from fs.readFile)
var unformattedFileContents = getFileAsStringSomehow();

var formattingOptions = {};
//get a formatted version of the BrighterScript/BrightScript file
var formattedFileContents = formatter.format(unformattedFileContents, formattingOptions);
```

### Source Maps

The formatter also supports source maps, which can be generated alongside of the formatted code by calling `formatWithSourceMap`

```javascript
var result = formatter.formatWithSourceMap(unformattedFileContents);
var formattedFileContents = result.code;
var sourceMap = result.map;
```

## Accepted security advisories

Dependencies flagged by `npm audit` that we have reviewed and chosen not to upgrade are tracked in [audit-ci.jsonc](https://github.com/RokuCommunity/brighterscript-formatter/blob/master/audit-ci.jsonc). Each entry includes the advisory ID, the date it was added, and the reason it does not apply to this project.
