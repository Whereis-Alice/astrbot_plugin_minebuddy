"""
技能: 清理附近威胁
描述: 逐个清理附近敌对生物，自动对苦力怕采用风筝策略
"""

async def 清理附近威胁(bot, max_targets=3, scan_range=16):
    """
    清理附近威胁，优先处理最近敌对生物。

    Args:
        bot: BotAPI 实例
        max_targets: 最多处理的目标数量
        scan_range: 扫描半径
    """
    cleared = 0

    for _ in range(max_targets):
        obs = await bot.getObservation()
        hostiles = obs.get("hostileEntities", []) or []
        if not hostiles:
            break

        nearest = hostiles[0]
        name = nearest.get("name", "")
        distance = nearest.get("distance", 99)

        if name == "creeper":
            result = await bot.kiteCreeper(retreatDistance=6, maxCycles=3, maxDistance=max(scan_range, 12))
        elif distance <= scan_range:
            result = await bot.attackNearestHostile(maxDistance=scan_range, preferredType=name)
        else:
            result = await bot.attackNearestHostile(maxDistance=scan_range)

        if not result.get("success"):
            return {
                "success": cleared > 0,
                "cleared": cleared,
                "message": result.get("message", "清理威胁失败"),
            }

        cleared += 1
        await bot.wait(0.8)

    return {
        "success": True,
        "cleared": cleared,
        "message": f"已处理 {cleared} 个附近威胁",
    }
