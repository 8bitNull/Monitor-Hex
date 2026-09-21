# v0.0.20 多线路查看与阅读操作验收

2026-09-21。基线 v0.0.19（857ff37）。用户授权实施、验收后直接发布。

## 实施结果

- 线路选择行增加 44px 聚焦按钮，支持仅看一条线路。连续单线路切换保存首次选择，恢复操作保留首页继承、空选择和明确多选的区别；恢复后关闭面板并返回入口焦点。常规勾选、全部显示/隐藏和首页线路操作清除临时恢复记录。时间范围切换保留恢复入口；页面重载或节点切换不保存临时恢复历史。
- Tooltip 使用原系列颜色的小色点，中性色名称和读数；丢包值为弱化的辅助行。0 ms、未知丢包、一位小数、线路排序、滚动和关闭入口继续保留。
- 刷新失败且有同范围旧记录时直接展示上次成功时间，手机也可见。新范围读取失败不展示旧范围时间。
- 手机超过 32 字符的资料值排在标签下方，CPU/IPv6 完整显示、完整复制，复制按钮固定 44px。桌面布局、图表高度和偏好保持。
- 资源/延迟提示支持 Escape 关闭，鼠标移动、点击或图表方向键重新查看。焦点在关闭按钮时返回图表，防止焦点留在隐藏内容中。

## 验收结果

| 项目 | 结果 |
| --- | --- |
| lint、业务测试、生产构建、打包 | 通过；435 处字面量翻译调用检查通过 |
| Chrome 全量 | 139/139 通过 |
| Edge 专项 | 75/75 通过，含详情布局、阅读、导航和稳定性 |
| 最终焦点修正后复测 | Chrome 24/24、Edge 24/24；覆盖本轮 11 项及详情交互 13 项 |
| 单线路恢复 | 320/390/1440px；搜索、Enter 操作、连续单线路、恢复多选、继承和空选择；范围切换及勾选退出临时状态通过 |
| Tooltip | 手机/桌面、资源/延迟 Escape 关闭与重新开启；关闭按钮焦点回图表；0 ms、14.3 ms、未知丢包及中性色文字通过 |
| 失败和长资料 | 手机失败显示旧数据时间；新范围清空；320px CPU/IPv6 标签和值分行、完整复制、44px 按钮通过 |
| 既有矩阵 | 320–1920px 分层宽度、深浅色、双语、四种指标样式、首屏图表、线路排序、缺失样本、复制反馈和偏好回归通过 |

初轮新增测试的两项资源提示用例因测试按钮名称写成“资源历史”而超时，改为实际按钮“资源”后，全量及最终定向复测均通过。最终焦点修正后未重复运行无关的首页全量测试。

## 视觉证据

- [桌面详情](screenshots/detail-light.png)
- [手机详情](screenshots/v0.0.20/mobile-detail-light.png)
- [深色桌面](screenshots/v0.0.20/desktop-detail-dark.png)
- [提示阅读](screenshots/v0.0.20/mobile-tooltip.png)
- [线路搜索](screenshots/v0.0.20/routes-search.png)
- [单线路与恢复](screenshots/v0.0.20/solo-dark.png)
- [失败时间](screenshots/v0.0.20/retained-light.png)
- [320px 长资料浅色](screenshots/v0.0.20/long-mobile-light.png)
- [320px 长资料深色](screenshots/v0.0.20/long-mobile-dark.png)
- [桌面前后对比](screenshots/v0.0.20/compare-desktop-detail.png)
- [手机前后对比](screenshots/v0.0.20/compare-mobile-detail.png)

scripts/capture-detail-analysis.mjs、capture-detail-analysis-interactions.mjs、capture-detail-analysis-proof.mjs 生成截图。README 仅引用当前 v0.0.20 的 12 张预览；未变化的首页图片重新截图后可能字节相同。最后焦点处理不改变静态视觉。

## 发布边界

版本 0.0.20，短名 hex，在线更新地址 https://github.com/8bitNull/Monitor-Hex。附件 theme.tar.gz 与 theme.tar.gz.sha256。

测试使用本地演示 API、模拟故障和桌面浏览器手机视口。实体手机、iOS Safari、系统软键盘、动态地址栏与真实服务器部署未验证；本次发布不代表已部署至用户线上站点。
