---
name: minebuddy-agent-playbook
description: Use when operating the MineBuddy AstrBot Minecraft plugin, especially when the agent needs to choose between direct mc tools, MineBuddy built-in runtime skills, and scripts for combat, survival, movement, gathering, or task execution. This skill helps the agent observe first, prefer dedicated combat tools, and act more safely in Minecraft.
---

# MineBuddy Agent Playbook

## Overview

在用 MineBuddy 控制 Minecraft Bot 时，优先让决策变得稳定、短链、可恢复。核心原则是：

- 先观察，再行动
- 优先用已经存在的专用工具，不要让 LLM 临时拼很长的动作链
- 优先复用 MineBuddy 内置运行时技能，不要把常见套路每次都重写成脚本
- 战斗里先保命，再追求输出

## 决策顺序

1. 状态不清楚时，先确认 Bot 当前状态。
- 连接或服务状态不确定时，先用 `mc_bot_status`。
- 环境、血量、饥饿、敌对生物、最近受击情况不确定时，先用 `mc_get_observation`。
- 要吃东西、装备、合成、长时间作业前，先看 `mc_view_inventory`。
- 默认把 `mc_get_observation` 当成紧凑观察，不要假设它总会带完整背包、聊天历史和全部附近实体；需要这些细节时，再补专门工具。

2. 优先选择“刚好匹配需求”的窄工具。
- “打最近的敌对怪”“清身边怪”优先用 `mc_attack_nearest_hostile`。
- “我正在挨打”“帮我自保”“你自己还手”优先用 `mc_defend_self`。
- “快撤”“先保命”“拉开距离”优先用 `mc_retreat`。
- 遇到苦力怕优先用 `mc_kite_creeper`，不要先尝试原地近战硬拼。
- 准备转去移动、采集、跟随、挖矿前，如果可能仍在战斗中，先 `mc_stop_combat`。

3. 常见多步骤目标优先用 MineBuddy 内置运行时技能。
- 不确定当前安装环境有哪些技能时，先用 `mc_list_skills`。
- 可直接复用的典型技能包括：`战斗自保`、`清理附近威胁`、`挖矿`、`打怪`、`钓鱼`、`采集木头`、`拾取物品`。
- 任务目标很通用、套路固定时，优先 `mc_start_skill`，不要先写脚本。
- 如果内置技能已经覆盖 80% 需求，先让技能完成大部分动作，再用直接工具补最后一步。

4. 只有在现成工具和内置技能都不合适时，才考虑 `mc_execute_script`。
- 脚本尽量短、小、单目标。
- 常见战斗逻辑不要自己手搓扫描 + 选目标 + 追击 + 攻击循环，优先复用现成战斗工具。
- 脚本启动后，用 `mc_get_task_status` 或 `mc_get_observation` 复查结果。

## 战斗规则

- 生存优先于输出。如果血量低、刚连续受击、附近有多个敌对生物，优先撤退或自保，不要继续硬打。
- 发现附近有苦力怕时，不要让 Bot 贴脸输出，优先 `mc_kite_creeper`。
- 进入战斗后，不要同时叠加长距离寻路和战斗计划，先结束当前战斗控制再切任务。
- 战斗动作后要重新观察。`mc_defend_self`、`mc_retreat`、`mc_kite_creeper` 执行后，优先重新 `mc_get_observation`。

## 生存规则

- 长任务前如果饥饿很低，且背包里有能吃的，优先在安全时吃东西。
- 用户让 Bot “继续干活”时，不要默认环境安全，至少看一次观察结果。
- 装备、食物、材料很可能是失败根因时，不要猜，先查背包。
- 如果用户表达的是大目标，例如“去生存一会儿”“帮我清附近怪”“去挖点东西”，优先选稳定套路，不要拆成太多微动作。

## 快速映射

- “帮我把附近怪清掉”
  优先 `mc_attack_nearest_hostile`；如果局面混乱或已被围攻，优先 `mc_start_skill("清理附近威胁")` 或 `mc_defend_self`。
- “我在挨打，先保命”
  优先 `mc_defend_self` 或 `mc_retreat`；如果明确是苦力怕，优先 `mc_kite_creeper`。
- “先别打了”
  直接 `mc_stop_combat`。
- “做一个固定套路，但内置技能没有”
  可以 `mc_execute_script`；如果验证稳定，再考虑 `mc_save_skill` 持久化。
- “现在能不能做这件事”
  先 `mc_get_observation`，必要时补 `mc_view_inventory`。

## 不要这样做

- 不要把普通战斗都写成“扫描实体 -> 人工挑目标 -> 看向目标 -> 攻击 -> 等待 -> 重扫”的长链，现成战斗工具已经更稳。
- 不要对苦力怕做原地近战硬拼。
- 不要在已有内置技能覆盖的场景里，先写长脚本再说。
- 不要默认连接一定正常；怀疑没连上或状态异常时，先看 `mc_bot_status`。

## 输出风格

- 高风险场景下，先做最安全的动作，再简短汇报。
- 普通任务用一句话说明打算采取的工具路径即可，不要输出冗长推理。
- 如果需求模糊，优先多做一次观察，不要靠猜测连续调用多个动作工具。
