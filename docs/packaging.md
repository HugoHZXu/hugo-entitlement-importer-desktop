# Packaging

[简体中文](packaging.zh-CN.md)

Use the Node.js and pnpm versions specified in the root `package.json`.

## Build an Unpacked App Directory

```bash
pnpm run pack:dir
```

This builds the web renderer and Electron main/preload processes, then outputs an unpacked app directory under `release/`.

On macOS you can open the generated `.app` directly from `release/mac-*`.

## Build Installers

```bash
pnpm run dist
```

Generates platform-specific distributable packages in `release/`. You can also target a specific platform:

```bash
pnpm run dist:mac
pnpm run dist:win
pnpm run dist:linux
```

## Configuration

Packaging is configured in [electron-builder.yml](../packages/electron/electron-builder.yml).

- macOS: `dmg` and `zip` (code signing is currently disabled with `identity: null`)
- Windows: `nsis` installer and `portable`
- Linux: `AppImage` and `deb`
- The built renderer from `packages/web/dist` is copied into the packaged app as `web/dist`
