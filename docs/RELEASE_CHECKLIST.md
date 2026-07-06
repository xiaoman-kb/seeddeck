# SeedDeck Release Checklist

这份清单用于功能冻结后的发布前验收。每次准备 GitHub Release 前，先跑自动检查，再走一遍关键功能。

## 本轮自动验证

已在 Windows 本机使用 Node.js 26.3.1 / npm 11.16.0 通过。当前测试结果：13 个测试文件、69 个测试全部通过。

```sh
npm run typecheck
npm test
npm run desktop:build
npm run desktop:pack
npm run desktop:dist
npm run build
npm run verify:seeding
```
自动验收覆盖：

- [x] 启动后进入来源连通性检测状态。
- [x] 搜索会返回聚合结果并更新来源状态。
- [x] 粘贴/导入 magnet 链接会进入下载队列。
- [x] `.torrent` 文件解析后会进入下载队列。
- [x] 取消打开种子：原生文件选择器取消或空路径会返回 `null`，不进入下载流程。
- [x] 下载任务支持暂停、恢复和移除。
- [x] 历史记录可以重新开启分享，也可以暂停分享和移除。
- [x] 真实做种验证：本地 peer 能下载 4 MB payload，暂停后停止上传，恢复后重新上传。
- [x] 设置中的下载目录、语言和主题可以持久化。
- [x] 自定义 RSS 来源可以添加、检测、禁用和删除。

生成产物：

```text
release/win-unpacked/SeedDeck.exe
release/SeedDeck-1.1.1-win-x64.zip
```

冒烟结果：

- [x] `SeedDeck.exe` 能启动。
- [x] 启动时未设置 `ELECTRON_RUN_AS_NODE=1`。
- [x] 关闭应用后没有残留 `SeedDeck` 进程。
- [x] zip 包内包含 `SeedDeck.exe`。
- [x] Windows 文件元信息显示 `ProductName = SeedDeck`、`FileDescription = SeedDeck`。
- [x] Windows 可执行文件名通过 `win.executableName` 固定为 `SeedDeck.exe`。

## 手动功能验收

- [ ] 搜索：输入普通关键词，能返回结果，或清晰显示无结果/来源错误。
- [ ] 粘贴磁力链接：复制 `magnet:?` 链接后点击“粘贴链接”，能加入下载队列或给出清晰错误。
- [ ] 打开种子：点击“打开种子”，选择 `.torrent` 文件后能加入下载队列。
- [ ] 取消打开种子：文件选择器取消后能回到主界面，不出现全屏遮罩卡死。
- [ ] 下载：任务进入“下载”页，显示进度、速度、peers、ETA 和状态。
- [ ] 暂停/恢复：下载中的任务可以暂停和恢复。
- [ ] 分享中：完成的任务可进入“分享中”，做种可以暂停或恢复。
- [ ] 历史：完成记录出现在历史页，可以重新开启分享或移除。
- [ ] 设置：下载目录、语言和主题可以修改并持久化。
- [ ] 自定义源：可以添加包含 `{query}` 的 RSS URL。
- [ ] 自定义源：可以启用、禁用和删除。
- [ ] 源连通性检测：应用启动后来源列表进入检测状态，并显示 online、err 或数量。
- [ ] 文件位置：下载或历史项的“打开文件位置”能调用系统文件管理器。

## 仓库检查

- [x] `.gitignore` 排除了 `node_modules/`、`dist/`、`dist-desktop/`、`release/`、缓存和日志。
- [x] `node_modules/`、`dist/`、`dist-desktop/`、`release/`、日志和缓存没有被 Git 跟踪。
- [x] README 中的版本号和 release 文件名与 `package.json` 一致。
- [x] README 已加入原项目链接：https://github.com/baairon/torlink
- [x] GitHub 新仓库创建后，补充 `package.json` 的 `repository`、`bugs` 和 `homepage`。
- [x] 按 `docs/PUBLISHING.md` 绑定远程仓库、推送源码并创建 tag。
- [ ] 在 GitHub Release 上传 `release/SeedDeck-1.1.1-win-x64.zip`，不要把 `release/` 提交进仓库。
- [x] `docs/RELEASE_NOTES_v1.1.1.md` 已准备好，可作为 GitHub Release notes。
