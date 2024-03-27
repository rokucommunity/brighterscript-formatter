# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [1.7.1](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.7.0...v1.7.1) - 2024-03-27
### Changed
 - upgrade to [brighterscript@0.65.27](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06527---2024-03-27). Notable changes since 0.65.25:
     - Upgade LSP packages ([brighterscript#1117](https://github.com/rokucommunity/brighterscript/pull/1117))
     - Increase max param count to 63 ([brighterscript#1112](https://github.com/rokucommunity/brighterscript/pull/1112))
     - Prevent unused variable warnings on ternary and null coalescence expressions ([brighterscript#1101](https://github.com/rokucommunity/brighterscript/pull/1101))



## [1.7.0](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.41...v1.7.0) - 2024-03-07
### Added
 - `insertSpaceAfterConditionalCompileSymbol` property, fix conditional compile formatting ([#87](https://github.com/rokucommunity/brighterscript-formatter/pull/87))
### Changed
 - upgrade to [brighterscript@0.65.25](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06525---2024-03-07). Notable changes since 0.65.23:
     - Support when tokens have null ranges ([brighterscript#1072](https://github.com/rokucommunity/brighterscript/pull/1072))
     - Support whitespace in conditional compile keywords ([brighterscript#1090](https://github.com/rokucommunity/brighterscript/pull/1090))



## [1.6.41](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.40...v1.6.41) - 2024-02-29
### Changed
 - upgrade to [brighterscript@0.65.23](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06523---2024-02-29). Notable changes since 0.65.19:
     - TBD-204: Empty interfaces break the parser ([brighterscript#1082](https://github.com/rokucommunity/brighterscript/pull/1082))
     - Allow v1 syntax: built-in types for class member types and type declarations on lhs ([brighterscript#1059](https://github.com/rokucommunity/brighterscript/pull/1059))
     - Move `coveralls-next` to a devDependency since it's not needed at runtime ([brighterscript#1051](https://github.com/rokucommunity/brighterscript/pull/1051))
     - Fix parsing issues with multi-index IndexedSet and IndexedGet ([brighterscript#1050](https://github.com/rokucommunity/brighterscript/pull/1050))



## [1.6.40](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.39...v1.6.40) - 2024-01-30
### Changed
 - upgrade to [brighterscript@0.65.19](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06519---2024-01-30). Notable changes since 0.65.18:
     - Backport v1 syntax changes ([brighterscript#1034](https://github.com/rokucommunity/brighterscript/pull/1034))



## [1.6.39](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.38...v1.6.39) - 2024-01-25
### Changed
 - allow spacing on dotted get paths ([#83](https://github.com/rokucommunity/brighterscript-formatter/pull/83))
 - upgrade to [brighterscript@0.65.18](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06518---2024-01-25). Notable changes since 0.65.17:
     - Prevent overwriting the Program._manifest if already set on startup ([brighterscript#1027](https://github.com/rokucommunity/brighterscript/pull/1027))
     - Improving null safety: Add FinalizedBsConfig and tweak plugin events ([brighterscript#1000](https://github.com/rokucommunity/brighterscript/pull/1000))



## [1.6.38](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.37...v1.6.38) - 2024-01-16
### Changed
 - upgrade to [brighterscript@0.65.17](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06517---2024-01-16). Notable changes since 0.65.16:
     - adds support for libpkg prefix ([brighterscript#1017](https://github.com/rokucommunity/brighterscript/pull/1017))
     - Assign .program to the builder BEFORE calling afterProgram ([brighterscript#1011](https://github.com/rokucommunity/brighterscript/pull/1011))



## [1.6.37](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.36...v1.6.37) - 2024-01-08
### Changed
 - upgrade to [brighterscript@0.65.16](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06516---2024-01-08). Notable changes since 0.65.12:
     - Prevent errors when using enums in a file that's not included in any scopes ([brighterscript#995](https://github.com/rokucommunity/brighterscript/pull/995))



## [1.6.36](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.35...v1.6.36) - 2023-12-07
### Changed
 - upgrade to [brighterscript@0.65.12](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#06512---2023-12-07). Notable changes since 0.65.9:
     - Add `optional` modifier for interface and class members ([brighterscript#955](https://github.com/rokucommunity/brighterscript/pull/955))
     - Correct RANGE in template string when dealing with quotes in annotations ([brighterscript#975](https://github.com/rokucommunity/brighterscript/pull/975))
     - Enums as class initial values ([brighterscript#950](https://github.com/rokucommunity/brighterscript/pull/950))



## [1.6.35](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.34...v1.6.35) - 2023-11-08
### Changed
 - upgrade to [brighterscript@0.65.9](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0659---2023-11-06). Notable changes since 0.65.8:
     - Fix issue with unary expression parsing ([brighterscript#938](https://github.com/rokucommunity/brighterscript/pull/938))
     - ci: Don't run `test-related-projects` on release since it already ran on build ([#brighterscript157fc2e](https://github.com/rokucommunity/brighterscript/commit/157fc2e))



## [1.6.34](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.33...1.6.34) - 2023-10-06
### Changed
 - upgrade to [brighterscript@0.65.8](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0658---2023-10-06). Notable changes since 0.65.7:
     - Bump postcss from 8.2.15 to 8.4.31 ([brighterscript#928](https://github.com/rokucommunity/brighterscript/pull/928))
     - Add interface parameter support ([brighterscript#924](https://github.com/rokucommunity/brighterscript/pull/924))
     - Better typing for `Deferred` ([brighterscript#923](https://github.com/rokucommunity/brighterscript/pull/923))



## [1.6.33](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.32...v1.6.33) - 2023-09-28
### Added
 - Sort imports ([#75](https://github.com/rokucommunity/brighterscript-formatter/pull/75))
### Changed
 - upgrade to [brighterscript@0.65.7](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0657---2023-09-28)



## [1.6.32](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.31...v1.6.32) - 2023-09-11
### Changed
 - upgrade to [brighterscript@0.65.5](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0655---2023-09-06). Notable changes since 0.65.4:
     - Fix crashes in util for null ranges ([brighterscript#869](https://github.com/rokucommunity/brighterscript/pull/869))



## [1.6.31](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.30...v1.6.31) - 2023-07-24
### Changed
 - Bump word-wrap from 1.2.3 to 1.2.4 ([#74](https://github.com/rokucommunity/brighterscript-formatter/pull/74))
 - upgrade to [brighterscript@0.65.4](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0654---2023-07-24). Notable changes since 0.65.1:
     - Bump word-wrap from 1.2.3 to 1.2.4 ([brighterscript#851](https://github.com/rokucommunity/brighterscript/pull/851))
     - Bump semver from 5.7.1 to 5.7.2 ([brighterscript#837](https://github.com/rokucommunity/brighterscript/pull/837))
     - Prevent crashing when diagnostic is missing range. ([brighterscript#832](https://github.com/rokucommunity/brighterscript/pull/832))
     - Prevent crash when diagnostic is missing range ([brighterscript#831](https://github.com/rokucommunity/brighterscript/pull/831))



## [1.6.30](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.29...v1.6.30) - 2023-07-05
### Changed
 - upgrade to [brighterscript@0.65.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0651---2023-06-09). Notable changes since 0.65.0:
     - Fix injection of duplicate super calls into classes ([brighterscript#823](https://github.com/rokucommunity/brighterscript/pull/823))



## [1.6.29](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.28...v1.6.29) - 2023-05-17
### Changed
 - upgrade to [brighterscript@0.65.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0650---2023-05-17)



## [1.6.28](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.27...v1.6.28) - 2023-05-10
### Changed
 - upgrade to [brighterscript@0.64.4](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0644---2023-05-10)



## [1.6.27](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.26...v1.6.27) - 2023-04-28
### Changed
 - upgrade to [brighterscript@0.64.3](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0643---2023-04-28). Notable changes since 0.64.2:
     - Improves performance in symbol table fetching ([brighterscript#797](https://github.com/rokucommunity/brighterscript/pull/797))



## [1.6.26](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.25...v1.6.26) - 2023-04-18
### Changed
 - upgrade to [brighterscript@0.64.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0642---2023-04-18). Notable changes since 0.64.1:
     - Fix namespace-relative enum value ([brighterscript#793](https://github.com/rokucommunity/brighterscript/pull/793))



## [1.6.25](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.24...v1.6.25) - 2023-04-14
### Changed
 - upgrade to [brighterscript@0.64.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0641---2023-04-14). Notable changes since 0.62.0:
     - Bump xml2js from 0.4.23 to 0.5.0 ([brighterscript#790](https://github.com/rokucommunity/brighterscript/pull/790))



## [1.6.24](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.23...v1.6.24) - 2023-03-17
### Changed
 - upgrade to [brighterscript@0.62.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0620---2023-03-17). Notable changes since 0.61.3:
     - Fix crash when func has no block ([brighterscript#774](https://github.com/rokucommunity/brighterscript/pull/774))
     - Move not-referenced check into ProgramValidator ([brighterscript#773](https://github.com/rokucommunity/brighterscript/pull/773))
### Fixed
 - indent format issue related to optional chaining array access ([#71](https://github.com/rokucommunity/brighterscript-formatter/pull/71))



## [1.6.23](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.22...v1.6.23) - 2023-01-12
### Changed
 - upgrade to [brighterscript@0.61.3](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0613---2023-01-12)



## [1.6.22](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.21...v1.6.22) - 2022-12-15
### Changed
 - Bump qs from 6.5.2 to 6.5.3 ([#64](https://github.com/rokucommunity/brighterscript-formatter/pull/64))



## [1.6.21](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.20...v1.6.21) - 2022-12-15
### Changed
 - upgrade to [brighterscript@0.61.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0612---2022-12-15). Notable changes since 0.61.1:
     - Bump qs from 6.5.2 to 6.5.3 ([brighterscript#758](https://github.com/rokucommunity/brighterscript/pull/758))
### Fixed
 - indentation related to `continue for` and `continue while` ([#65](https://github.com/rokucommunity/brighterscript-formatter/pull/65))



## [1.6.20](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.19...v1.6.20) - 2022-12-08
### Changed
 - upgrade to [brighterscript@0.61.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0611---2022-12-07). Notable changes since 0.60.4:
     - Ensure enums and interfaces persist in typedefs ([brighterscript#757](https://github.com/rokucommunity/brighterscript/pull/757))
     - Fix exception while validating continue statement ([brighterscript#752](https://github.com/rokucommunity/brighterscript/pull/752))
     - Add missing visitor params for DottedSetStatement ([brighterscript#748](https://github.com/rokucommunity/brighterscript/pull/748))
     - Flag incorrectly nested statements ([brighterscript#747](https://github.com/rokucommunity/brighterscript/pull/747))
     - Prevent a double `super` call in subclasses ([brighterscript#740](https://github.com/rokucommunity/brighterscript/pull/740))
     - Fixes issues with Roku doc scraper and adds missing components ([brighterscript#736](https://github.com/rokucommunity/brighterscript/pull/736))
     - Cache `getCallableByName` ([brighterscript#739](https://github.com/rokucommunity/brighterscript/pull/739))
     - Prevent namespaces being used as variables ([brighterscript#738](https://github.com/rokucommunity/brighterscript/pull/738))
     - Refactor SymbolTable and AST parent logic ([brighterscript#732](https://github.com/rokucommunity/brighterscript/pull/732))
     - Fix crash in `getDefinition` ([brighterscript#734](https://github.com/rokucommunity/brighterscript/pull/734))



## [1.6.19](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.18...v1.6.19) - 2022-10-28
### Changed
 - upgrade to [brighterscript@0.60.4](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0604---2022-10-28). Notable changes since 0.60.3:
     - Allow `continue` as local var ([brighterscript#730](https://github.com/rokucommunity/brighterscript/pull/730))
     - Add name to symbol table ([brighterscript#728](https://github.com/rokucommunity/brighterscript/pull/728))



## [1.6.18](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.17...v1.6.18) - 2022-10-20
### Changed
 - upgrade to [brighterscript@0.60.3](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0603---2022-10-20). Notable changes since 0.59.0:
     - better parse recover for unknown func params ([brighterscript#722](https://github.com/rokucommunity/brighterscript/pull/722))
     - Fix if statement block var bug ([brighterscript#698](https://github.com/rokucommunity/brighterscript/pull/698))
     - Beter location for bs1042 ([brighterscript#719](https://github.com/rokucommunity/brighterscript/pull/719))
     - Allow nested namespaces ([brighterscript#708](https://github.com/rokucommunity/brighterscript/pull/708))



## [1.6.17](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.16...v1.6.17) - 2022-10-03
### Changed
 - upgrade to [brighterscript@0.59.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0590---2022-10-03). Notable changes since 0.57.0:
     - Syntax and transpile support for continue statement ([brighterscript#697](https://github.com/rokucommunity/brighterscript/pull/697))



## [1.6.16](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.15...v1.6.16) - 2022-09-02
### Changed
 - Split formatter into separate processors ([#57](https://github.com/rokucommunity/brighterscript-formatter/pull/57))
 - Break `process` into smaller functions ([#59](https://github.com/rokucommunity/brighterscript-formatter/pull/59))
 - Rename all `Formatter` `process` methods to `format` ([#60](https://github.com/rokucommunity/brighterscript-formatter/pull/60))
### Fixed
 - mod keywordCase formatting ([#62](https://github.com/rokucommunity/brighterscript-formatter/pull/62))
 - Parse all code as brighterscript to improve formatting context ([#61](https://github.com/rokucommunity/brighterscript-formatter/pull/61))
 - upgrade to [brighterscript@0.57.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0570---2022-09-02). Notable changes since 0.56.0:
     - Allow `mod` as an aa prop, aa member identifier kinds forced to Identifier ([brighterscript#684](https://github.com/rokucommunity/brighterscript/pull/684))



## [1.6.15](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.14...v1.6.15) - 2022-08-24
### Changed
 - upgrade to [brighterscript@0.56.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0560---2022-08-23). Notable changes since 0.55.1:



## [1.6.14](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.13...v1.6.14) - 2022-08-12
### Changed
 - upgrade to [brighterscript@0.55.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0551---2022-08-07). Notable changes since 0.53.1:
     - Fix typescript error for ast parent setting ([brighterscript#659](https://github.com/rokucommunity/brighterscript/pull/659))



## [1.6.13](https://github.com/rokucommunity/brighterscript-formatter/compare/v1.6.12...v1.6.13) - 2022-07-16
### Changed
 - Bump moment from 2.29.2 to 2.29.4 ([#56](https://github.com/rokucommunity/brighterscript-formatter/pull/56))
 - Fix import statement formatting. ([#55](https://github.com/rokucommunity/brighterscript-formatter/pull/55))
 - upgrade to [brighterscript@0.53.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0531---2022-07-15). Notable changes since 0.48.0:
     - New Language Feature: Constants ([brighterscript#632](https://github.com/rokucommunity/brighterscript/pull/632))
     - Use `util.createLocation`, not `Location.create()` ([brighterscript#637](https://github.com/rokucommunity/brighterscript/pull/637))
     - Fix missing range on interface statement ([brighterscript#623](https://github.com/rokucommunity/brighterscript/pull/623))
     - Catch class circular extends ([brighterscript#619](https://github.com/rokucommunity/brighterscript/pull/619))
     - Load projects based on bsconfig.json presence ([brighterscript#613](https://github.com/rokucommunity/brighterscript/pull/613))
     - Better super handling ([brighterscript#590](https://github.com/rokucommunity/brighterscript/pull/590))
     - Don't push synthetic constructor into each class ([brighterscript#586](https://github.com/rokucommunity/brighterscript/pull/586))
     - Allow interfaces and enums as function param types ([brighterscript#580](https://github.com/rokucommunity/brighterscript/pull/580))



## [1.6.12](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.11...v1.6.12) - 2022-04-13
### Changed
 - updated to [brighterscript@0.48.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0480---2022-04-13)
    - adds syntax support for optional chaining operator



## [1.6.11](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.10...v1.6.11) - 2022-04-07
### Changed
 - updated to [brighterscript@0.47.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0472---2022-04-07)



## [1.6.10](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.9...v1.6.10) - 2022-03-17
### Changed
 - updated to [brighterscript@0.45.6](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0456---2022-03-17)



## [1.6.9](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.8...v1.6.9) - 2022-02-24
### Changed
 - updated to [brighterscript@0.45.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0452---2022-02-24)
    - fixed significant memory leak [brighterscript#527](https://github.com/rokucommunity/brighterscript/pull/527)



## [1.6.8](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.7...v1.6.8) - 2022-02-11
### Changed
 - updated to [brighterscript@0.45.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0430---2022-01-28)
### Fixed
 - properly indent enums and enum members



## [1.6.7](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.6...v1.6.7) - 2022-02-01
### Fixed
 - ensures that `removeWhitespace` function looks at all tokens to the right ([#49](https://github.com/rokucommunity/brighterscript-formatter/pull/49))



## [1.6.6](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.5...v1.6.6) - 2022-01-28
### Changed
 - updated to [brighterscript@0.43.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0430---2022-01-28)
### Fixed
 - properly formats an interface that includes subs and functions ([#46](https://github.com/rokucommunity/brighterscript-formatter/pull/46))
 - better support for appropriate whitespace between minus and numbers/identifiers ([#47](https://github.com/rokucommunity/brighterscript-formatter/pull/47))



## [1.6.5](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.4...v1.6.5) - 2022-01-14
### Changed
 - updated to [brighterscript@0.42.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0420---2022-01-10)
### Fixed
 - `interface` indentation ([#45](https://github.com/rokucommunity/brighterscript-formatter/pull/45))



## [1.6.4](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.3...v1.6.4) - 2022-01-05
### Changed
 - updated to [brighterscript@0.40.6](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0416---2022-01-05)
### Fixed
 - formatting issue with ternary operator and square brace in the consequent ([#44](https://github.com/rokucommunity/brighterscript-formatter/pull/44))



## [1.6.3](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.2...v1.6.3) - 2021-10-27
### Changed
 - updated to [brighterscript@0.40.3](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0413---2021-10-27)



## [1.6.2](https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.1...v1.6.2) - 2021-09-17
### Changed
 - updated to [brighterscript@0.40.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0401---2021-09-17)



## [1.6.1] - 2021-06-21
[1.6.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.6.0...v1.6.1
### Changed
 - updated to [brighterscript@0.39.3](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0393---2021-06-01)
### Fixed
 - several npm security vulnerabilities



## [1.6.0] - 2020-11-25
[1.6.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.5...v1.6.0
### Added
 - formatting support for `try`/`catch`/`throw`/`end try`
### Changed
 - updated to [brighterscript@0.22.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0220---2020-11-23)



## [1.5.5] - 2020-10-28
[1.5.5]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.4...v1.5.5
### Added
 - formatting support for BrighterScript annotations
### Changed
 - updated to [brighterscript@0.17.0](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#0170---2020-10-27)
 - use BrighterScript's AST walking functionality for improved performance



## [1.5.4] - 2020-07-29
[1.5.4]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.3...v1.5.4
### Fixed
 - bug that was not including `bsconfig.schema.json` in the npm package when published (because it was not included in the `files` array in `package.json`).



## [1.5.3] - 2020-07-19
[1.5.3]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.2...v1.5.3
### Added
 - `bsfmt.schema.json` file in the package for use in tooling.



## [1.5.2] - 2020-07-19
[1.5.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.1...v1.5.2
### Added
 - export `Runner` from `index.ts` directly to simplify API usage.



## [1.5.1] - 2020-07-19
[1.5.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.5.0...v1.5.1
### Added
 - public method `Runner#getBsfmtOptions` which allows external api consumers to use the standard file loading logic.
 - cli option to disable `bsfmt.json` loading.
 - cli option to provide custom `bsfmt.json` path.
### Changed
 - removed method `Runner#loadOptionsFromFile` introduced in v1.5.0 in favor of `getBsfmtOptions`. Although this is technically a breaking change, it is very unlikely that anyone is actively calling that new method.



## [1.5.0] - 2020-07-18
[1.5.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.4.0...v1.5.0
### Added
 - command line interface (CLI) to support running the formatter against projects from a terminal.
 - support for loading config options from a bsfmt.json file found in the same working directory.



## [1.4.0] - 2020-05-29
[1.4.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.3.0...v1.4.0
### Added
 - new method to generate source maps during format.
 - new option `insertSpaceBetweenAssociativeArrayLiteralKeyAndColon` which will ensure exactly 1 or 0 spaces between an associative array key and its trailing colon. ([#17](https://github.com/rokucommunity/brighterscript-formatter/issues/17))
### Fixed
 - bugs related to formatting single-line if statements ([#13](https://github.com/rokucommunity/brighterscript-formatter/issues/13))



## [1.3.0] - 2020-05-21
[1.3.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.2.0...v1.3.0
### Added
 - new option `formatMultiLineObjectsAndArrays` which inserts newlines and indents multi-line objects and arrays



## [1.2.0] - 2020-05-20
[1.2.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.8...v1.2.0
### Added
 - new option `insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces` which...does what it says. ([#16](https://github.com/rokucommunity/brighterscript-formatter/issues/16)
### Changed
 - TypeScript transpile now targets ES2017, so this library now requires a minimum of NodeJS version 8.
### Fixed
 - incorrect indent when using `class`, `endclass`, `namespace`, `endnamespace` as an object property ([#18](https://github.com/rokucommunity/brighterscript-formatter/issues/18))



## [1.1.8] - 2020-05-11
[1.1.8]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.7...v1.1.8
### Fixed
 - bug that would incorrectly add spacing between a negative sign and a number if it's the first entry in an array ([#14](https://github.com/rokucommunity/brighterscript-formatter/issues/14))
 - bug that would incorrectly add spacing to the left of a negative sign if preceeded by a left curly bracket or left paren.
 - Prevent indent after lines with indexed getter function call (i.e. `someObj[someKey]()`) ([#15](https://github.com/rokucommunity/brighterscript-formatter/issues/15))



## [1.1.7] - 2020-05-11
[1.1.7]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.6...v1.1.7
### Changed
 - upgraded to [brighterscript@0.9.6](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#096)



## [1.1.6] - 2020-05-04
[1.1.6]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.5...v1.1.6
## Fixed
 - issue where object properties named `next` would incorrectly cause a de-indent ([#12](https://github.com/rokucommunity/brighterscript-formatter/issues/12))



## [1.1.5] - 2020-05-01
[1.1.5]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.4...v1.1.5
### Added
 - new formatting option `typeCaseOverride` which works just like `keywordCaseOverride` but only for type tokens.
### Fixed
 - conditional compile `keywordCaseOverride` and `typeCaseOverride` characters now support using the literal tokens `#if`, `#else`, etc...



## [1.1.4] - 2020-05-01
[1.1.4]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.3...v1.1.4
### Fixed
 - incorrect indent of upper-case two-word conditional compile blocks `#ELSE IF` and `#END IF`.
### Changed
 - upgraded to [brighterscript@0.9.1](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#091---2020-05-01)



## [1.1.3] - 2020-05-01
[1.1.3]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.2...v1.1.3
### Fixed
 - Unwanted spacing between a negative sign and a number whenever preceeded by a comma (#8)
 - Remove whitespace preceeding a comma within a statement (#5)
 - Remove leading whitespace around `++` and `--` (#10)
 - bug when providing `null` to keywordCaseOverride would case crash
 - Fix bug with titleCase not being properly handled.
 - Only indent once for left square bracket and left square curly brace on the same line (#6)



## [1.1.2] - 2020-04-29
[1.1.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.1...v1.1.2
### Changed
 - upgraded to [brighterscript@0.8.2](https://github.com/rokucommunity/brighterscript/blob/master/CHANGELOG.md#082---2020-04-29)



## [1.1.1] - 2020-04-27
[1.1.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.1.0...v1.1.1
### Fixed
 - bug that was losing an indent level when indenting `foreach` statements



## [1.1.0] - 2020-04-23
[1.1.0]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.2...v1.1.0
### Added
 - indent support for class and namespace
 - keyword case support for class, namespace, and import keywords
### Changed
 - Now uses [BrighterScript](https://github.com/RokuCommunity/brighterscript) for lexing and parsing.



## [1.0.2] - 2019-09-18
[1.0.2]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.1...v1.0.2
### Changed
 - upgraded to [brightscript-parser](https://github.com/RokuCommunity/brightscript-parser)@1.2.1
### Fixed
 - bug that was de-indending lines after lines ending with `end` (like `someting.end\nif`)



## [1.0.1] - 2019-09-17
[1.0.1]:  https://github.com/RokuCommunity/brighterscript-formatter/compare/v1.0.0...v1.0.1
### Fixed
 - bug where empty lines are padded with indent spaces [#1](https://github.com/rokucommunity/brighterscript-formatter/issues/1)



## [1.0.0] - 2019-09-17
[1.0.0]:  https://github.com/RokuCommunity/brighterscript-formatter/tree/v1.0.0
### Added
 - initial project release
### Changed
 - converted from [brightscript-formatter](https://github.com/RokuCommunity/brightscript-formatter)
