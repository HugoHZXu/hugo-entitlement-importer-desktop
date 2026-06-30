# 打包

请使用根目录 `package.json` 声明的 Node 和 pnpm 版本。

## 快速生成可运行应用

```bash
pnpm run pack:dir
```

该命令会构建前端、构建 Electron main/preload 代码，并在 `release/` 里生成未压缩的应用目录。

在 macOS 上，可以直接打开 `release/mac-*` 里的 `.app`。

## 生成安装包

```bash
pnpm run dist
```

该命令会在 `release/` 里生成当前平台的可分发产物。

也可以使用平台指定命令：

```bash
pnpm run dist:mac
pnpm run dist:win
pnpm run dist:linux
```

发布前需要确认生成的应用不依赖 dev server，且图表审查窗口可以正常打开。

代码签名、公证、自动更新发布和品牌图标尚未配置。
