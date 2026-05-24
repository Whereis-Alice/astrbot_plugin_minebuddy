# 更新日志

本文档记录 MineBuddy 分支的重要变更。

## [1.3.1] - 2026-05-25

### 优化

- 统一 AstrBot WebUI 配置页文案，将多处长描述拆分为“短 description + 详细 hint”，减少配置项说明被界面截断的问题。
- 为插件补充官方兼容的 `.astrbot-plugin/i18n/zh-CN.json`，确保中文界面下也能使用更适合 WebUI 的配置文案。
- 将 `mc_chat_bridge_mode`、`observation_mode`、`agent_loop_observation_mode` 改为带中文标签的下拉选项，减少手填配置值时的拼写错误。
- 统一 Node Bot 服务版本与元数据命名，日志横幅、服务自报版本、`bot/package*.json` 不再混用旧的 `llm-mc-bot` 标识。

## [1.3.0] - 2026-05-25

### 新增

- 新增聊天注入策略配置：`mc_chat_bridge_mode`、`mc_chat_batch_window_sec`、`mc_chat_batch_max_messages`、`mc_chat_direct_keywords`，可在“陪玩感”和“token 消耗”之间做平衡。
- 新增 observation 模式配置：`observation_mode`、`agent_loop_observation_mode`，支持 LLM 默认使用紧凑观察、Agent Loop 使用专用轻量快照。

### 优化

- `mc_get_observation` 默认改为更紧凑的返回结构，优先保留位置、血量、战斗状态、敌对目标、玩家等高价值字段，减少重复和低价值上下文。
- Node 侧 observation 现在按模式分层返回，完整背包、聊天、事件、附近实体改为按需包含，不再默认每次都返回。
- Agent Loop 轮询改用更轻量的环境快照，降低后台监测引起的 token 和上下文消耗。
- MC 聊天桥接支持 `hybrid` 模式：点名 Bot 或命中关键词的消息仍实时注入，普通闲聊则按时间窗口合并为摘要消息，尽量保留陪玩氛围同时减少无效上下文。

## [1.2.5] - 2026-05-25

### 新增

- 新增更明确的战斗工具：`mc_attack_nearest_hostile`、`mc_defend_self`、`mc_retreat`、`mc_stop_combat`、`mc_kite_creeper`，减少 LLM 反复先扫描、再拼装动作链的负担。
- 新增内置战斗技能 `战斗自保` 与 `清理附近威胁`，让 LLM 在复杂战斗场景里更容易复用稳定套路，而不是每次都临时生成脚本。
- 新增 Agent Skill `skills/minebuddy-agent-playbook`，专门约束 LLM 在 MineBuddy 中的观察顺序、战斗工具优先级、内置技能优先级与脚本降级策略。

### 优化

- `mc_attack` 底层战斗执行逻辑重构为可复用的统一近战入口，新战斗工具与旧攻击接口会共享同一套武器选择、PvP 优先、手写回退逻辑。
- 内置技能迁移逻辑从“仅首次复制”改为“缺失即补齐，并同步索引”，这样现有安装环境更新插件后也能自动拿到新增的内置技能。
- 为兼容 AstrBot 官方插件 Skill 布局，插件自带运行时技能目录从 `skills/` 调整为 `builtin_skills/`，避免与 AstrBot 的 Agent Skill 自动发现机制冲突。

## [1.2.4] - 2026-05-25

### 优化

- 启动前若发现 `bot_service_port` 已经被别的本地服务占用，会直接停止继续拉起新的 Node 进程，并把 `/status`、`/health` 的探测结果写进日志，避免只看到一串 `EADDRINUSE` 却不知道到底是谁占着端口。
- Python 侧对本地 Bot 服务的探测逻辑增强为“优先识别 MineBuddy 服务签名，再回退检查状态接口”，后续复用旧实例、健康检查、端口冲突提示都会更准确。
- `mc_connect` 遇到 `426 Upgrade Required` 时，现在会明确提示“当前端口上的服务不像 MineBuddy HTTP API”，更方便定位成端口被错误服务占用，而不是误以为是 MC 连接失败。
- Node 侧 `/health` 与 `/status` 现在会带上 `service/version` 签名，启动失败时也会输出更直接的致命错误说明，方便从 AstrBot 日志快速判断问题。

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
