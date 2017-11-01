## [v1.9.1](https://github.com/adrai/node-cqrs-saga/compare/v1.9.0...v1.9.1)
- add possibility to call removeTimeout after getTimeoutSagas and getOlderSagas [#42](https://github.com/adrai/node-cqrs-saga/issues/#42) thanks to [edro](https://github.com/edro)

## [v1.9.0](https://github.com/adrai/node-cqrs-saga/compare/v1.8.0...v1.9.0)
- optional pagination for getTimeoutedSagas and getUndispatchedCommands

## [v1.8.0](https://github.com/adrai/node-cqrs-saga/compare/v1.7.3...v1.8.0)
- Support default exports [#40](https://github.com/adrai/node-cqrs-saga/pull/#40) thanks to [IRT-fbachmann](https://github.com/IRT-fbachmann)

## [v1.7.3](https://github.com/adrai/node-cqrs-saga/compare/v1.7.2...v1.7.3)
- fix saga callback on retry [#39](https://github.com/adrai/node-cqrs-saga/pull/#39) thanks to [nanov](https://github.com/nanov)

## [v1.7.2](https://github.com/adrai/node-cqrs-saga/compare/v1.7.1...v1.7.2)
- optimize handling for commandRejected

## [v1.7.1](https://github.com/adrai/node-cqrs-saga/compare/v1.6.27...v1.7.1)
- for getTimeoutedSagas handling: if the pm.onCommand handler is registered it will be automatically executed

## [v1.6.27](https://github.com/adrai/node-cqrs-saga/compare/v1.6.25...v1.6.27)
- fix for new mongodb driver

## [v1.6.25](https://github.com/adrai/node-cqrs-saga/compare/v1.6.24...v1.6.25)
- update deps

## [v1.6.24](https://github.com/adrai/node-cqrs-saga/compare/v1.6.23...v1.6.24)
- edgecase in revisionGuard

## [v1.6.23](https://github.com/adrai/node-cqrs-saga/compare/v1.6.22...v1.6.23)
- redis, mongodb: call disconnect on ping error

## [v1.6.22](https://github.com/adrai/node-cqrs-saga/compare/v1.6.21...v1.6.22)
- Fix events getting lost at high concurrency [#33](https://github.com/adrai/node-cqrs-saga/pull/#33) thanks to [hilkeheremans](https://github.com/hilkeheremans)

## [v1.6.21](https://github.com/adrai/node-cqrs-saga/compare/v1.6.20...v1.6.21)
- Support mongo connection string

## [v1.6.20](https://github.com/adrai/node-cqrs-saga/compare/v1.6.19...v1.6.20)
- redis, mongodb: call disconnect on ping error

## [v1.6.19](https://github.com/adrai/node-cqrs-saga/compare/v1.6.17...v1.6.19)
- revisionGuard: optional startRevisionNumber

## [v1.6.17](https://github.com/adrai/node-cqrs-saga/compare/v1.6.16...v1.6.17)
- redis: added optional heartbeat

## [v1.6.16](https://github.com/adrai/node-cqrs-saga/compare/v1.6.15...v1.6.16)
- fix defineShouldHandle

## [v1.6.15](https://github.com/adrai/node-cqrs-saga/compare/v1.6.14...v1.6.15)
- revisionGuard fix

## [v1.6.14](https://github.com/adrai/node-cqrs-saga/compare/v1.6.13...v1.6.14)
- redis: fix for new redis lib

## [v1.6.13](https://github.com/adrai/node-cqrs-saga/compare/v1.6.12...v1.6.13)
- mongodb: added optional heartbeat

## [v1.6.12](https://github.com/adrai/node-cqrs-saga/compare/v1.6.11...v1.6.12)
- redis: fix wrong multi response handling

## [v1.6.11](https://github.com/adrai/node-cqrs-saga/compare/v1.6.10...v1.6.11)
- optimize handling of guarding the first events

## [v1.6.10](https://github.com/adrai/node-cqrs-saga/compare/v1.6.9...v1.6.10)
- remove trycatch dependency due to memory leaks

## [v1.6.9](https://github.com/adrai/node-cqrs-saga/compare/v1.6.8...v1.6.9)
- give possibility to use mongodb with authSource

## [v1.6.8](https://github.com/adrai/node-cqrs-saga/compare/v1.6.7...v1.6.8)
- updated dep

## [v1.6.7](https://github.com/adrai/node-cqrs-saga/compare/v1.6.6...v1.6.7)
- optimization for `npm link`'ed development

## [v1.6.6](https://github.com/adrai/node-cqrs-saga/compare/v1.6.4...v1.6.6)
- catch throwing errors when calling callback

## [v1.6.4](https://github.com/adrai/node-cqrs-saga/compare/v1.6.3...v1.6.4)
- expose warnings during initialization

## [v1.6.3](https://github.com/adrai/node-cqrs-saga/compare/v1.6.2...v1.6.3)
- better catch for userland errors

## [v1.6.2](https://github.com/adrai/node-cqrs-saga/compare/v1.6.1...v1.6.2)
- fix alreadyInQueue check

## [v1.6.1](https://github.com/adrai/node-cqrs-saga/compare/v1.6.0...v1.6.1)
- redis: replace .keys() calls with .scan() calls => scales better

## [v1.6.0](https://github.com/adrai/node-cqrs-saga/compare/v1.5.0...v1.6.0)
- introduce possibility to define a shouldHandle function

## [v1.5.0](https://github.com/adrai/node-cqrs-saga/compare/v1.4.0...v1.5.0)
- when using revisionGuard, always save the last event
- when using revisionGuard, added possibility to fetch the last handled event

## [v1.4.0](https://github.com/adrai/node-cqrs-saga/compare/v1.3.0...v1.4.0)
- add retry mechanism for saga

## [v1.3.0](https://github.com/adrai/node-cqrs-saga/compare/v1.2.9...v1.3.0)
- fix revisionGuard when handling duplicate events at the same time

## [v1.2.9](https://github.com/adrai/node-cqrs-saga/compare/v1.2.8...v1.2.9)
- fixed mongodb indexes

## [v1.2.8](https://github.com/adrai/node-cqrs-saga/compare/v1.2.7...v1.2.8)
- added mongodb driver 2.x support

## [v1.2.7](https://github.com/adrai/node-cqrs-saga/compare/v1.2.4...v1.2.7)
- optimize structureParser

## [v1.2.4](https://github.com/adrai/node-cqrs-saga/compare/v1.2.3...v1.2.4)
- added convenience information on sagaModel (actionOnCommit)

## [v1.2.3](https://github.com/adrai/node-cqrs-saga/compare/v1.2.1...v1.2.3)
- fix usage with own db implementation

## [v1.2.1](https://github.com/adrai/node-cqrs-saga/compare/v1.2.0...v1.2.1)
- generate command id if not set even if destroying the saga

## [v1.2.0](https://github.com/adrai/node-cqrs-saga/compare/v1.1.3...v1.2.0)
- added getInfo function

## [v1.1.3](https://github.com/adrai/node-cqrs-saga/compare/v1.1.2...v1.1.3)
- added commitstamp to getUndispatchedcommands
- added possibility to addCommandToSend for timeoutedSagas

## [v1.1.2](https://github.com/adrai/node-cqrs-saga/compare/v1.1.1...v1.1.2)
- handle case of same aggregateId in different contexts or aggregates

## [v1.1.1](https://github.com/adrai/node-cqrs-saga/compare/v1.1.0...v1.1.1)
- added azure-table support [#2](https://github.com/adrai/node-cqrs-saga/pull/#2) thanks to [sbiaudet](https://github.com/sbiaudet) and [rvin100](https://github.com/rvin100)

## [v1.1.0](https://github.com/adrai/node-cqrs-saga/compare/v1.0.2...v1.1.0)
- introduce revisionGuard

## v1.0.2
- saga: optional define a function to that returns an id that will be used as saga id

## v1.0.1
- make redis commit transactional

## v1.0.0
- first stable release
