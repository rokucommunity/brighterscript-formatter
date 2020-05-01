# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [1.1.3] - UNRELEASED
### Fixed
 - Unwanted spacing between a negative sign and a number whenever preceeded by a comma (#8)
 - Remove whitespace preceeding a comma within a statement (#5)
 - Remove leading whitespace around `++` and `--` (#10)



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



[1.1.3]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.2...v1.1.3
[1.1.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.1...v1.1.2
[1.1.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.0...v1.1.1
[1.1.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.2...v1.1.0
[1.0.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.1...v1.0.2
[1.0.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.0...v1.0.1
[1.0.0]:  https://github.com/RokuCommunity/brighterscript-formatter/tree/v1.0.0
