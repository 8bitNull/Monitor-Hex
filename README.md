# Monitor HEX

HEX 是为 monitor-probe 制作的监控主题。当前版本 **0.07**，主题短名 **hex**。

## 主题预览

以下图片使用当前 0.07 版本与本地演示数据，移动端图片展示首页上半部分。点击图片可查看原图。

| 浅色首页 | 深色首页 |
| --- | --- |
| ![浅色首页：总览、世界地图与节点卡片](screenshots/home-light.png) | ![深色首页：总览、世界地图与节点卡片](screenshots/home-dark.png) |

| 节点资源详情 | 多线路延迟历史 |
| --- | --- |
| ![节点详情：实时资源与历史图表](screenshots/detail-light.png) | ![深色模式下的多线路延迟历史](screenshots/latency-dark.png) |

<p align="center">
  <img src="screenshots/mobile-light.png" width="280" alt="手机浅色首页" />
  <img src="screenshots/mobile-dark.png" width="280" alt="手机深色首页" />
</p>

## 安装

从 [最新 Release](https://github.com/8bitNull/Monitor-Hex/releases/latest) 下载 **[theme.tar.gz](https://github.com/8bitNull/Monitor-Hex/releases/latest/download/theme.tar.gz)**。

在后台主题管理上传 `theme.tar.gz`，然后选择 **Monitor HEX**。请勿上传源码 ZIP。安装包根目录包含 theme.json、dist、preview.png 和许可证。

手动安装时解压至主题目录下的 `hex/`。由于短名已更改，后台会识别为新主题，安装后需选择启用。页面顶栏的站点主名称仍遵循后台站点设置，主题标识为 MONITOR HEX。

## 默认显示

- 手机端（宽度不超过 720px）隐藏地图，保留地区筛选和卡片/表格切换，优先展示节点。桌面地图设置与地区选择保留。
- 桌面地图默认 169% 缩放，默认聚焦北美、欧洲和东亚，可拖动、缩放、全屏及筛选地区。
- 总览为节点、今日流量、实时网速、高负载提示四栏，手机为两列。
- 首页默认一条线路，可在主题设置中调整为最多三条；详情页查看全部线路。
- 支持深浅色、资源与网速指标、备注标签及延迟历史图表。

## 高负载记录

在主题设置中开启高负载提示。CPU 达到 85% 开始记录，低于 80% 标为恢复，避免阈值附近反复闪动。第四栏显示当前告警数量及最近事件，点击可查看开始、恢复或最后观测时间、持续时长（时:分:秒）及 CPU 峰值。

记录保存在当前站点、当前浏览器，最多保留最近 100 条结束记录，正在进行的记录保留。关闭提示不清除历史。详情页停留期间继续监测；页面关闭期间无法监测，重开后未确认结束的事件标记为监测中断，持续时长只计算已观测时段。存储不可用时会显示提示。它不是服务端全天候告警日志，不在设备间同步。

为兼容原主题，浏览器偏好与历史存储键保留原来的内部名称；安装不修改服务器数据。更改主题短名后，后台主题默认设置如有自定义，请在新主题中重新确认。

## 开发与验收

`npm install`、`npm run build`、`npm run lint`、`npm test`。`npm run demo` 启动演示数据页面；`npm run package` 生成 theme.tar.gz。浏览器测试按功能组织，运行 `npm run test:e2e` 检查当前版本的 28 项交互用例（需已安装 Chrome）；设置 `TEST_BROWSER=msedge` 可改用 Edge。测试前先执行 `npm run build`。

截图由当前生产构建配合本地演示数据生成，不代表已部署至用户线上站点。许可和参考来源见 NOTICE.md、LICENSE、LICENSE.komari-next。

## 详情页

桌面采用 300px（中等屏幕 260px）概况栏与自适应历史图表。900px 以下按身份、实时指标、历史分析、流量与设备资料排序。资源主图可切换四项指标；备注在 Agent 后完整显示，TCP/UDP 常驻。详情样式统一在 detail.css；构建及验收报告随版本交付。

## 本地开发与 GitHub 同步

源码仓库：https://github.com/8bitNull/Monitor-Hex

使用 Node.js 24 与 npm。首次准备开发环境：

```sh
npm ci
npm run dev
```

生产检查与打包：

```sh
npm run lint
npm test
npm run package
```

生成的 `theme.tar.gz` 用于后台安装。依赖、构建文件和安装包不提交到源码仓库；安装包通过 [GitHub Releases](https://github.com/8bitNull/Monitor-Hex/releases) 发布。

每次开发前，在工作区没有未提交修改时运行 `git pull --ff-only` 获取远端更新。修改完成后检查并上传：

```sh
git status
git diff
git add .
git commit -m "说明本次修改"
git push
```

保存文件不会自动上传；提交并推送后才会同步至 GitHub。当前版本检查说明见 `ACCEPTANCE.md`。浏览器测试和截图脚本的原始图片保存在 `tests/artifacts/`，不提交到源码仓库；用于首页展示的精选图片保存在 `screenshots/`。