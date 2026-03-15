# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-03-15
### Fixed
- Prevented redundant destination checks during export by using media file fingerprinting.
- Configured ESLint to ignore auto-generated `wailsjs` files.

## [1.0.1] - 2026-03-11
### Fixed
- Copy progress bar not working/appearing for files due to useEffect constantly re-checking for existing exports and resetting progress state as if file already fully copied. (Partial fix, improved in 1.0.2)

## [1.0.0] - 2026-02-15

### Added
- Initial working app version with core DVR auto-import functionality
- Desktop application built with Wails and React
- Support for volume selection and media file detection
- Export progress tracking and file status management
- Error handling and user notifications
- macOS application bundle with proper configuration
