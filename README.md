# brighterscript-formatter

A code formatter for [BrighterScript](https://github.com/RokuCommunity/brighterscript), a superset of Roku's BrightScript language


[![Build Status](https://travis-ci.org/RokuCommunity/brighterscript-formatter.svg?branch=master)](https://travis-ci.org/RokuCommunity/brighterscript-formatter)
[![Coverage Status](https://coveralls.io/repos/github/rokucommunity/brighterscript-formatter/badge.svg?branch=master)](https://coveralls.io/github/rokucommunity/brighterscript-formatter?branch=master)
[![npm](https://img.shields.io/npm/v/brighterscript-formatter.svg?branch=master)](https://www.npmjs.com/package/brighterscript-formatter)

## Usage
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

## Source Maps
The formatter also supports source maps, which can be generated alongside of the formatted code by calling `formatWithSourceMap`

### Usage
```javascript

var result = formatter.formatWithSourceMap(unformattedFileContents);
var formattedFileContents = result.code;
var sourceMap = result.map;
```

## Formatting Options

There are many formatting options. Rather than listing them all out here, you should look at the [typescript interface](https://github.com/rokucommunity/brighterscript-formatter/blob/master/src/FormattingOptions.ts#L7).
