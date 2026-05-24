# MineBuddy

`MineBuddy` 是一个基于 AstrBot 的 Minecraft Bot 插件。它把 Mineflayer Bot 的控制能力接进 AstrBot，让 LLM 可以通过工具调用在 Minecraft 里移动、战斗、采集、合成、观察环境，并把 MC 聊天与群聊上下文串起来。

这不是原作者仓库的原样镜像，而是一个准备长期维护的改版分支。为了避免后续和上游插件在 AstrBot 插件市场、插件目录名、数据目录、升级来源上发生冲突，本仓库已经使用独立插件标识：

- 插件 ID：`astrbot_plugin_minebuddy`
- 展示名：`MineBuddy`

## 原仓库说明

本项目基于原作者仓库修改而来：

- 原仓库：[`advent259141/astrbot_plugin_llmmc`](https://github.com/advent259141/astrbot_plugin_llmmc)

如果你在阅读历史资料、旧截图、旧配置或旧讨论时看到 `astrbot_plugin_llmmc`、`LLMMC`、`LLM-MC`，那指的就是这个项目的上游版本。

## 为什么要改名

改名的目的很直接：

- 避免和原插件使用同一个 AstrBot 插件标识，导致更新来源混淆。
- 避免和上游版本共享同一个数据目录，减少技能文件、缓存文件互相覆盖的风险。
- 方便后续把这个仓库 fork 成你们自己的维护版本，形成清晰的版本边界。

当前代码里已经做了这些处理：

- AstrBot 插件注册名从 `astrbot_plugin_llmmc` 改为 `astrbot_plugin_minebuddy`
- 内部事件唤醒标记切换到 `"_minebuddy_wake_llm"`
- 插件数据目录切换到 `astrbot_plugin_minebuddy`
- 保留了旧技能目录迁移逻辑，首次运行时会尝试从旧版 `astrbot_plugin_llmmc` 数据目录复制技能文件

## 当前版本特性

- MC 聊天与群聊上下文互通
- 30+ 个 LLM 工具，可直接控制 Minecraft Bot
- 支持脚本执行与技能持久化
- 内置采矿、战斗、钓鱼、采集木头、拾取物品等技能
- 可选 Agent Loop，在低血量、低饥饿、附近有敌对生物或刚受击时主动唤醒 LLM
- 插件启动时可自动拉起 Node.js Bot 服务
- 新增省 token 优化：紧凑 observation、Agent Loop 轻量快照、MC 聊天摘要/混合注入模式

## 相比上游的当前改动

除改名与文档整理外，当前版本还做了一轮实用优化：

- 改善了近战攻击逻辑，不再只是“挥一下就结束”
- 接入了 `mineflayer-pvp` 作为优先近战执行后端，保留手写近战逻辑作为回退
- 改善了敌对生物感知与受击感知
- 观察数据里补充了 hostile、food、lastDamageSource 等更适合 Agent 决策的字段
- 新增更明确的战斗工具：`mc_attack_nearest_hostile`、`mc_defend_self`、`mc_retreat`、`mc_stop_combat`、`mc_kite_creeper`
- 新增内置战斗技能：`战斗自保`、`清理附近威胁`，降低 LLM 临时拼动作链的负担
- 修复了内置 `打怪` 技能在脚本沙箱中的一个隐藏问题

## 目录结构

```text
astrbot_plugin_minebuddy/
├── bot/                  # Node.js Mineflayer Bot 服务
├── builtin_skills/       # MineBuddy 运行时内置技能
├── skills/               # AstrBot 官方 Agent Skill 目录
├── main.py               # AstrBot 插件入口
├── bot_client.py         # Bot HTTP/WS 客户端
├── script_executor.py    # 脚本执行器
├── skill_manager.py      # 技能管理
├── task_manager.py       # 后台任务管理
├── metadata.yaml
└── _conf_schema.json
```

说明：

- 当前本地目录、插件标识和仓库目标名已经统一为 `astrbot_plugin_minebuddy`。
- 如果你后续还有其他部署副本，建议也统一使用这个目录名，避免和旧版 `astrbot_plugin_llmmc` 混淆。

## Agent Skill

仓库里现在直接按 AstrBot 官方兼容布局带了一份 Agent Skill：

- `skills/minebuddy-agent-playbook`

它和插件里的 `skills/` 不是一回事：

- `builtin_skills/` 是 MineBuddy 运行时技能，给 `mc_start_skill` / `mc_execute_script` 用。
- `skills/minebuddy-agent-playbook` 是给 AstrBot / Codex 的 LLM 用的“行为指引”，作用是让模型更会挑工具、少拼无谓动作链、在战斗时优先保命。

这份 Agent Skill 目前重点约束这些行为：

- 先 `mc_get_observation` / `mc_bot_status`，再做动作决策。
- 普通战斗优先 `mc_attack_nearest_hostile`、`mc_defend_self`、`mc_retreat`、`mc_kite_creeper`。
- 常见套路优先 `mc_start_skill` 调用内置技能，而不是每次都现场写脚本。
- 只有现成工具和内置技能都不合适时，才退到 `mc_execute_script`。

现在这份 Agent Skill 已经位于 AstrBot 官方认得的 `skills/` 目录下。按官方行为，安装插件后 AstrBot 会识别它，并且可以在 Skills 页面单独开关。

## 安装

1. 将插件目录放入 AstrBot 插件目录。
2. 安装 Python 依赖：

```bash
pip install httpx websockets
```

3. 安装 Bot 依赖：

```bash
cd astrbot_plugin_minebuddy/bot
npm install
```

说明：

- 这一步是在运行 AstrBot 插件的那台机器上执行，不是在 Minecraft 服务器里执行。
- `mineflayer-pvp` 属于 `bot/` 目录下的 Node.js 依赖，会跟随这一步一起安装。

4. 在 AstrBot WebUI 中启用插件并填写配置。

## 主要配置项

### Bot 服务与 MC 连接

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `auto_start_bot` | 自动启动 Bot 服务 | `true` |
| `bot_dir` | 外部 Bot 目录，留空则使用插件内置 `bot/` | `""` |
| `mc_host` | Minecraft 服务器地址 | `localhost` |
| `mc_port` | Minecraft 服务器端口 | `25565` |
| `mc_username` | Bot 用户名 | `LLM_Bot` |
| `mc_version` | Minecraft 版本 | `1.20.1` |
| `bot_service_port` | Bot HTTP/WS 服务端口 | `3001` |
| `auto_connect` | 启动后自动连接 MC | `false` |
| `viewer_enabled` | 是否启用 prismarine-viewer | `false` |
| `viewer_port` | Viewer 端口 | `3007` |

### AstrBot 集成

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `unified_group_umo` | 绑定群聊 UMO | `""` |
| `bot_nickname` | 机器人在 MC 中展示的昵称 | 插件默认值 |
| `enable_chat_response` | 是否把 LLM 回复发回 MC | `true` |
| `mc_chat_bridge_mode` | MC 聊天注入模式：`direct` / `summary` / `hybrid`，推荐 `hybrid` | `hybrid` |
| `mc_chat_batch_window_sec` | 聊天摘要窗口秒数，普通闲聊会在窗口内合并成一条摘要 | `15` |
| `mc_chat_batch_max_messages` | 每条聊天摘要最多合并多少条普通闲聊 | `4` |
| `mc_chat_direct_keywords` | `hybrid` 模式下直接注入上下文的关键词，逗号分隔 | `bot,机器人,面包,Alice` |
| `enable_agent_loop` | 是否启用环境感知循环 | `false` |
| `agent_tick_rate` | Agent Loop 间隔，单位秒 | `5` |
| `health_threshold` | 低血量告警阈值 | `6` |
| `food_threshold` | 低饥饿告警阈值 | `4` |
| `observation_mode` | `mc_get_observation` 默认返回的数据量：`compact` / `full`，推荐 `compact` | `compact` |
| `agent_loop_observation_mode` | Agent Loop 检测时使用的观察模式：`agent_loop` / `compact` | `agent_loop` |

UMO 示例：

```text
aiocqhttp_default:GroupMessage:123456789
```

### 降低 token 消耗的推荐配置

如果你的主要目标是“和 Bot 一起玩，但不要把 token 烧得太夸张”，建议优先这样配：

- `mc_chat_bridge_mode = hybrid`
- `mc_chat_batch_window_sec = 15`
- `mc_chat_batch_max_messages = 4`
- `observation_mode = compact`
- `agent_loop_observation_mode = agent_loop`
- `enable_agent_loop = false` 或保持较低频率，例如 `agent_tick_rate = 8~12`

这套配置的思路是：

- 点名 Bot、叫 Bot 做事、包含关键词的 MC 聊天，仍然会实时进入上下文，陪玩感还在。
- 普通闲聊不会逐条灌给 LLM，而是按窗口合成一条 `[MC聊天摘要]`，保留氛围感但减少上下文膨胀。
- `mc_get_observation` 默认只返回更适合决策的紧凑数据，不再每次都附带完整背包、聊天和事件历史。
- Agent Loop 改用轻量快照做风险判断，降低后台唤醒和环境轮询带来的额外消耗。

## 常用工具

基础动作：

- `mc_chat`
- `mc_goto`
- `mc_follow_player`
- `mc_stop_moving`
- `mc_jump`
- `mc_look_at`
- `mc_attack`
- `mc_attack_nearest_hostile`
- `mc_defend_self`
- `mc_retreat`
- `mc_stop_combat`
- `mc_kite_creeper`
- `mc_collect_block`
- `mc_place_block`
- `mc_eat`
- `mc_use_item`
- `mc_activate_block`
- `mc_wait`

环境感知：

- `mc_get_observation`
- `mc_find_block`
- `mc_scan_entities`
- `mc_list_players`

背包与合成：

- `mc_view_inventory`
- `mc_equip_item`
- `mc_drop_item`
- `mc_craft`
- `mc_list_recipes`
- `mc_smelt`

高级功能：

- `mc_execute_script`
- `mc_start_skill`
- `mc_save_skill`
- `mc_list_skills`
- `mc_delete_skill`
- `mc_get_task_status`
- `mc_cancel_task`
- `mc_bot_status`
- `mc_connect`
- `mc_disconnect`

## 内置技能

- `挖矿`
- `合成`
- `打怪`
- `战斗自保`
- `清理附近威胁`
- `钓鱼`
- `采集木头`
- `丢给玩家`
- `拾取物品`

## 迁移建议

如果你之前已经在用上游 `astrbot_plugin_llmmc`，建议这样迁移：

1. 先备份旧插件目录和数据目录。
2. 使用本改版替换或并行放置。
3. 首次启动后确认内置技能和你之前保存的技能是否已迁移成功。
4. 确认 AstrBot 中启用的是 `astrbot_plugin_minebuddy`，而不是旧插件。

## 当前仓库

当前维护仓库：

- [`Whereis-Alice/astrbot_plugin_minebuddy`](https://github.com/Whereis-Alice/astrbot_plugin_minebuddy)

当前仓库名、插件标识和本地目录名都已经统一为 `astrbot_plugin_minebuddy`。
