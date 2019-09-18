# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [1.7.1] - 2019-08-30
### Fixed
 - bug that would incorrectly de-indent every line after an if statement's first line that had a trailing comma (i.e. `if true then 'some comment`) 



## [1.7.0] - 2019-08-23
### Added
 - `typeCase` property which specifies the casing of type keywords (works just like keywordCase). When specified, it overrides keywordCase ONLY for types (any keyword preceeded by `as` token).
 - `keywordCase` option called `'original'` which is a more explicit setting than using `undefined`
 - 'compositeKeyword' option called `'original'` which is a more explicit setting than using `undefined`



## [1.6.0] - 2019-06-18
### Added
 - `formatInteriorWhitespace` option to format all interior whitespace.



## [1.5.0] - 2018-12-03
### Added
- New config option called keywordCaseOverride that allows for keyword casing to be overridden on a per-word basis.



[1.7.1]:  https://github.com/rokucommunity/brightscript-formatter/compare/v1.7.0...v1.7.1
[1.7.0]:  https://github.com/rokucommunity/brightscript-formatter/compare/v1.6.0...v1.7.0
[1.6.0]:  https://github.com/rokucommunity/brightscript-formatter/compare/v1.5.0...v1.6.0
[1.5.0]:  https://github.com/rokucommunity/brightscript-formatter/compare/v1.4.0...v1.5.0
