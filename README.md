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

## Changelog

### 1.4.2-beta.1

- Added Channel Select feedback/condition support and exposed channel selection as a variable.
- Added input routing control for channels, plus related feedbacks, variables, and shared routing utilities.
- Added recall filter functionality and expanded project/scene actions, feedbacks, variables, and helper utilities.
- Delivered a major StudioLive III feature expansion including new actions for level control with transitions and relative adjustment, solo, pan, stereo link, channel preset recall, mute groups, channel color, and channel icon control.
- Added new feedbacks for solo state, link state, level comparison, pan comparison, and mute group state.
- Expanded variables with current project/scene names, any-solo state, per-channel status data, per-line-channel input routing, send mute states, and mute group labels/states.
- Improved runtime behavior by adapting features to each console's `channelCounts`, hiding unsupported strip properties, dynamically loading channel presets, normalizing level handling, fixing fade start values, and normalizing color state handling.
