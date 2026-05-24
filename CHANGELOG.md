# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and versions are tracked in-repo for the MineBuddy fork.

## [1.2.0] - 2026-05-25

### Added

- Added `CHANGELOG.md` to track changes for the MineBuddy fork.
- Integrated `mineflayer-pvp` as the preferred melee combat backend for the Node bot service.
- Added combat status to bot observations so higher-level logic can see whether PvP is active and which target is being tracked.

### Changed

- `mc_attack` now tries `mineflayer-pvp` first and falls back to the existing manual melee loop if the plugin is unavailable or fails.
- `goTo`, `followPlayer`, and `stopMoving` now stop active PvP combat first to avoid pathfinding conflicts.
- Updated installation docs to clarify that Node.js combat dependencies are installed on the machine running AstrBot, not on the Minecraft server.
- Unified the plugin version shown in `main.py` and `metadata.yaml` to `1.2.0`.

## [1.1.0] - 2026-05-25

### Added

- Added legacy skill data migration from `astrbot_plugin_llmmc` to `astrbot_plugin_minebuddy`.
- Added improved hostile entity sensing, recent damage source tracking, and richer observation data for agent decisions.

### Changed

- Renamed the plugin to `MineBuddy` with the unique AstrBot plugin ID `astrbot_plugin_minebuddy`.
- Reworked `README.md` to document the upstream repository, fork relationship, migration notes, and current repository location.
- Updated repository metadata to point to `Whereis-Alice/astrbot_plugin_minebuddy`.
