# 打包

[English](packaging.md)

请使用根目录 `package.json` 中指定的 Node.js 和 pnpm 版本。

## 生成未打包的应用目录

```bash
pnpm run pack:dir
```

该命令会构建 web 渲染层和 Electron main/preload 进程，在 `release/` 目录下生成未打包的应用目录。

在 macOS 上可以直接打开 `release/mac-*` 下生成的 `.app` 文件。

## 生成安装包

```bash
pnpm run dist
```

在 `release/` 目录下生成当前平台的安装包。也可以指定平台构建：

```bash
pnpm run dist:mac
pnpm run dist:win
pnpm run dist:linux
```

## 配置说明

打包配置位于 [electron-builder.yml](../packages/electron/electron-builder.yml)。

- macOS：生成 `dmg` 和 `zip`（当前通过 `identity: null` 禁用了代码签名）
- Windows：生成 `nsis` 安装包和 `portable` 便携版
- Linux：生成 `AppImage` 和 `deb`
- 渲染层构建产物从 `packages/web/dist` 复制到打包应用内的 `web/dist` 目录
