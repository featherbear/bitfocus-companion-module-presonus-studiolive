# PreSonus StudioLive III module for Bitfocus Companion

> Uses the [`presonus-studiolive-api`](https://featherbear.cc/presonus-studiolive-api/) package to provide a Bitfocus Companion module

## Installation

[[YouTube video](https://youtu.be/f7YAjYK5sMM)]

1. Download the latest `tgz` file in the [Releases](https://github.com/featherbear/bitfocus-companion-module-presonus-studiolive/releases) section.
2. Open Bitfocus Companion and go to the [Modules] panel
3. Select [Import module package] and point to the downloaded `tgz` file
4. Go to the [Connections] page and add a connection for `PreSonus: StudioLive Series III`
5. Configure the `StudioLive Console IP` and press [Save]

## Notes

Current builds pin `presonus-studiolive-api` to an upstream UBJSON parsing fix so the module can connect to consoles that send `int16` (`I`) values during initial state sync.
