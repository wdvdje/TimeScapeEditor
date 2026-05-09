# TimeScape Editor - Electron Desktop App

This repository now supports both a **PWA (web app on GitHub Pages)** and an **Electron desktop app (Mac native app)**.

## Development Setup

### Prerequisites
- Node.js (v16+)
- npm

### Install Dependencies
```bash
npm install
```

## Development

### Run App Locally
Start the Electron app in development mode:
```bash
npm start
```

This launches the TimeScape Editor as a native Mac app with hot-reload enabled.

## Building

### Create Mac App Package
Build the distributable Mac app files:
```bash
npm run dist
```

This generates:
- **TimeScape-1.0.0.dmg** — Installer file (drag & drop install)
- **TimeScape-1.0.0-mac.zip** — Portable zip archive
- **dist/mac/TimeScape.app** — The actual application bundle

### File Sizes
- DMG installer: ~94 MB
- Zip archive: ~91 MB

## Distribution

### Option 1: GitHub Releases (Recommended)
1. Create a new GitHub release with a tag
2. Upload the `.dmg` or `.zip` file
3. Users download and install directly

### Option 2: Direct Download Link
Host the `.dmg` file on your website for download.

## Usage

### Run Packaged App
Double-click the generated `TimeScape.app` file to launch the desktop app.

### Data Storage
- All data is stored locally on your Mac using IndexedDB
- Data persists between app launches
- Each installation (web vs. desktop) has separate storage
- No internet connection required

## Platform Support

Currently configured for **macOS** (Intel & Apple Silicon compatible).

To add Windows/Linux support later, update `electron-builder.json` configuration.

## Notes

- The desktop app uses the **exact same HTML/CSS/JS files** as the GitHub Pages PWA
- No code duplication between web and desktop versions
- Service Worker (`sw.js`) automatically adapts to Electron's file:// protocol
- All UI features work identically in both versions

## Building for Distribution

For distributing outside your organization, you'll need to:
1. Sign the app with an Apple Developer certificate (~$99/year)
2. Notarize with Apple (required for Gatekeeper)

For internal/personal use, the unsigned builds work fine.

## Troubleshooting

### App won't start
- Ensure Node dependencies are installed: `npm install`
- Check that all required files exist in the root directory

### Build fails
- Clear cache: `rm -rf node_modules dist/ && npm install`
- Verify you have write permissions in the directory

### Dev mode crashes
- Try: `npm start` again (sometimes takes multiple attempts)
- Check the terminal output for specific error messages
