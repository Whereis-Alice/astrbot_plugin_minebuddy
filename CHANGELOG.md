# 更新日志

本文档记录 MineBuddy 分支的重要变更。

## [1.2.3] - 2026-05-25

### 优化

- 启动插件前会先探测本地 `3001` 端口上是否已经有可用的 MineBuddy 服务，若有则直接复用，避免插件重载时反复触发 `EADDRINUSE`。
- 若新的 Node 进程启动失败，但本地已有可用的 MineBuddy 服务，插件会继续接管现有实例，而不是直接判定整套 Bot 不可用。
- 启动失败后的兜底提示改为根据实际错误给出说明，不再把所有失败都误导成需要重新执行 `npm install`。

## [1.2.2] - 2026-05-25

### 新增

- 启动阶段新增 Node 依赖预检查，若 `node_modules` 缺失会直接提示在插件服务器执行 `npm install`。
- 新增本地端口占用提示，用于识别 `3001` 端口上是否还有旧 Bot 服务残留。

### 优化

- `auto_start_bot` 模式下，只有 Node 子进程通过本地 `/health` 健康检查后，插件才会继续启动 WebSocket 监听。
- 若 Bot 子进程启动失败或提前退出，插件会跳过 WebSocket 监听，避免出现“服务其实没起来，但日志看起来像连上了”的误导。

## [1.2.1] - 2026-05-25

### 新增

- 新增 `mc_connect_timeout_sec` 配置项，可控制 Bot 进服等待超时，默认 30 秒。
- 新增 Node 子进程日志转发，`mineflayer` 和本地 Bot 服务日志会直接进入 AstrBot 日志。
- 新增连接状态与失败详情上报，`/status` 和 `/connect` 会返回更完整的诊断信息。

### 优化

- 优化 MC 连接流程，不再只等待 `spawn` 无限挂起。
- 在 `kicked`、`end`、连接超时、插件加载失败等场景下，会尽快返回明确错误原因。
- Python 侧 `mc_connect` 工具现在会优先展示 Node 返回的具体失败详情，而不是只看到泛化的 HTTP 500。

### 修复

- 修复 `mc_connect` 在部分失败场景下卡满 AstrBot 120 秒工具超时、日志却看不出原因的问题。

## [1.2.0] - 2026-05-25

### 新增

- 新增 `CHANGELOG.md`，用于记录 MineBuddy 分支的版本变更。
- 接入 `mineflayer-pvp` 作为 Node 侧优先近战后端。
- 在观察数据中新增战斗状态，便于上层逻辑判断 PvP 是否启用、当前正在追击谁。

### 优化

- `mc_attack` 现在会优先尝试 `mineflayer-pvp`，不可用时再回退到原有手写近战逻辑。
- `goTo`、`followPlayer`、`stopMoving` 会先停止 PvP 战斗，避免和寻路互相抢控制权。
- 安装说明补充了 Node 依赖安装位置说明，明确这些依赖装在运行 AstrBot 的机器上，而不是 Minecraft 服务器里。
- 统一 `main.py` 与 `metadata.yaml` 中展示的插件版本为 `1.2.0`。

## [1.1.0] - 2026-05-25

### 新增

- 新增从 `astrbot_plugin_llmmc` 到 `astrbot_plugin_minebuddy` 的历史技能数据迁移逻辑。
- 新增更丰富的敌对生物感知、最近受击来源记录，以及更适合 Agent 决策的观察字段。

### 优化

- 将插件重命名为 `MineBuddy`，并使用独立的 AstrBot 插件 ID `astrbot_plugin_minebuddy`。
- 重写 `README.md`，明确说明上游仓库、分叉关系、迁移说明与当前维护仓库地址。
- 更新仓库元数据，指向 `Whereis-Alice/astrbot_plugin_minebuddy`。
