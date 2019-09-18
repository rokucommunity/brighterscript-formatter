# ⚠️ Warning 
This project is no longer maintained. Its successor is [brighterscript-formatter](https://github.com/RokuCommunity/brighterscript-formatter), which can format all valid brightscript.

# brightscript-formatter

A code formatter for Roku's BrightScript language


[![Build Status](https://travis-ci.org/TwitchBronBron/brightscript-formatter.svg?branch=master)](https://travis-ci.org/TwitchBronBron/brightscript-formatter)
[![Coverage Status](https://coveralls.io/repos/github/TwitchBronBron/brightscript-formatter/badge.svg?branch=master)](https://coveralls.io/github/TwitchBronBron/brightscript-formatter?branch=master)
[![npm](https://img.shields.io/npm/v/brightscript-formatter.svg?branch=master)](https://www.npmjs.com/package/brightscript-formatter)

## Usage
```javascript
import { BrightScriptFormatter } from 'brightscript-formatter';

//create a new instance of the formatter
var formatter = new BrightscriptFormatter();

//retrieve the raw brightscript file contents (probably from fs.readFile)
var unformattedFileContents = getFileAsStringSomehow();

var formattingOptions = {};
//get a formatted version of the brightscript file
var formattedFileContents = formatter.format(unformattedFileContents, formattingOptions);

```

## Formatting Options

There are many formatting options. Rather than listing them all out here, you should look at the [typescript interface located](src/FormattingOptions.ts)
