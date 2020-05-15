# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [Unreleased]
### Added
 - new option `insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces` which...does what it says. 
### Changed
 - TypeScript transpile now targets ES2017, so this library now requires a minimum of NodeJS version 8. 



## [1.1.8] - 2020-05-11
### Fixed
 - bug that would incorrectly add spacing between a negative sign and a number if it's the first entry in an array ([#14](https://github.com/rokucommunity/brighterscript-formatter/issues/14))
 - bug that would incorrectly add spacing to the left of a negative sign if preceeded by a left curly bracket or left paren.  
 - Prevent indent after lines with indexed getter function call (i.e. `someObj[someKey]()`) ([#15](https://github.com/rokucommunity/brighterscript-formatter/issues/15))



## [1.1.7] - 2020-05-11
### Changed
 - upgraded to [brighterscript@0.9.6](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#096)



## [1.1.6] - 2020-05-04
## Fixed
 - issue where object properties named `next` would incorrectly cause a de-indent ([#12](https://github.com/rokucommunity/brighterscript-formatter/issues/12))



## [1.1.5] - 2020-05-01
### Added
 - new formatting option `typeCaseOverride` which works just like `keywordCaseOverride` but only for type tokens. 
### Fixed
 - conditional compile `keywordCaseOverride` and `typeCaseOverride` characters now support using the literal tokens `#if`, `#else`, etc...



## [1.1.4] - 2020-05-01
### Fixed
 - incorrect indent of upper-case two-word conditional compile blocks `#ELSE IF` and `#END IF`. 
### Changed
 - upgraded to [brighterscript@0.9.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#091---2020-05-01)



## [1.1.3] - 2020-05-01
### Fixed
 - Unwanted spacing between a negative sign and a number whenever preceeded by a comma (#8)
 - Remove whitespace preceeding a comma within a statement (#5)
 - Remove leading whitespace around `++` and `--` (#10)
 - bug when providing `null` to keywordCaseOverride would case crash
 - Fix bug with titleCase not being properly handled.
 - Only indent once for left square bracket and left square curly brace on the same line (#6)



## [1.1.2] - 2020-04-29
### Changed
 - upgraded to [brighterscript@0.8.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#082---2020-04-29)



## [1.1.1] - 2020-04-27
### Fixed
 - bug that was losing an indent level when indenting `foreach` statements



## [1.1.0] - 2020-04-23
### Added
 - indent support for class and namespace
 - keyword case support for class, namespace, and import keywords
### Changed
 - Now uses [BrighterScript](https://github.com/RokuCommunity/brighterscript) for lexing and parsing.



## [1.0.2] - 2019-09-18
### Changed
 - upgraded to [brightscript-parser](https://github.com/RokuCommunity/brightscript-parser)@1.2.1
### Fixed
 - bug that was de-indending lines after lines ending with `end` (like `someting.end\nif`)



## [1.0.1] - 2019-09-17
### Fixed
 - bug where empty lines are padded with indent spaces [#1](https://github.com/rokucommunity/brighterscript-formatter/issues/1)



## [1.0.0] - 2019-09-17
### Added
 - initial project release
### Changed
 - converted from [brightscript-formatter](https://github.com/RokuCommunity/brightscript-formatter)



[1.1.8]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.7...v1.1.8
[1.1.7]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.6...v1.1.7
[1.1.6]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.5...v1.1.6
[1.1.5]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.4...v1.1.5
[1.1.4]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.3...v1.1.4
[1.1.3]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.2...v1.1.3
[1.1.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.1...v1.1.2
[1.1.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.0...v1.1.1
[1.1.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.2...v1.1.0
[1.0.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.1...v1.0.2
[1.0.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.0...v1.0.1
[1.0.0]:  https://github.com/RokuCommunity/brighterscript-formatter/tree/v1.0.0
