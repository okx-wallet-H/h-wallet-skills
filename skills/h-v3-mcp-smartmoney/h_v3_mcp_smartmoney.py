#!/usr/bin/env python3.11
"""
H_V3 MCP Smart Money Server
=============================
封装 OKX Smart Money（聪明钱）数据，提供标准 MCP Tools。
通过 OKX Agent Trade Kit CLI 获取数据。

Tools:
  - get_smart_money_consensus: 获取指定币种的聪明钱共识方向
  - get_top_traders: 获取聪明钱排行榜 Top N 交易员
  - get_trader_positions: 获取指定交易员的当前持仓和最近交易
  - get_smart_money_summary: 综合聪明钱摘要（用于注入引擎信号）
"""

import subprocess
import json
import os
from typing import Optional

# ============================================================
# 配置
# ============================================================
OKX_API_KEY = os.environ.get("OKX_API_KEY", "6265ca38-5ede-4c96-9c06-63660bd927ea")
OKX_SECRET_KEY = os.environ.get("OKX_SECRET_KEY", "A17AEBF701FE326D15BED7B02EB3DED7")
OKX_PASSPHRASE = os.environ.get("OKX_PASSPHRASE", "Yy133678.")

SYMBOL_TO_INST = {
    "BTC": "BTC-USDT-SWAP",
    "ETH": "ETH-USDT-SWAP",
    "SOL": "SOL-USDT-SWAP",
    "DOGE": "DOGE-USDT-SWAP",
    "OKB": "OKB-USDT-SWAP",
}

ENV = {
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    "OKX_API_KEY": OKX_API_KEY,
    "OKX_SECRET_KEY": OKX_SECRET_KEY,
    "OKX_PASSPHRASE": OKX_PASSPHRASE,
}


# ============================================================
# 内部工具函数
# ============================================================
def _run_okx_cli(args: list, timeout: int = 15) -> dict:
    """调用 OKX CLI 并返回 JSON 结果"""
    try:
        result = subprocess.run(
            ["okx"] + args + ["--json"],
            capture_output=True,
            text=True,
            env=ENV,
            timeout=timeout,
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip()}
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "OKX CLI 超时"}
    except json.JSONDecodeError:
        return {"error": f"JSON 解析失败: {result.stdout[:200]}"}
    except Exception as e:
        return {"error": str(e)}


# ============================================================
# MCP Tools
# ============================================================
def get_top_traders(period: int = 7, limit: int = 10, sort_type: str = "pnl") -> dict:
    """
    获取聪明钱排行榜 Top N 交易员
    
    Args:
        period: 统计周期（3/7/30/90 天）
        limit: 返回数量
        sort_type: 排序方式（pnl=绝对收益, pnlRatio=收益率）
    
    Returns:
        {traders: [{nickName, pnl, pnlRatio, maxDrawdown, asset, authorId}]}
    """
    args = ["smartmoney", "traders", "--limit", str(limit), "--period", str(period), "--sortType", sort_type]
    data = _run_okx_cli(args)
    
    if isinstance(data, dict) and data.get("error"):
        return data
    
    if not isinstance(data, list):
        return {"error": "数据格式异常", "raw": str(data)[:200]}
    
    traders = []
    for t in data[:limit]:
        traders.append({
            "nickName": t.get("nickName", "N/A"),
            "authorId": t.get("authorId", ""),
            "pnl": float(t.get("pnl", 0)),
            "pnlRatio": float(t.get("pnlRatio", 0)),
            "maxDrawdown": float(t.get("maxDrawdown", 0)),
            "asset": float(t.get("asset", 0)),
            "onboardDuration": t.get("onboardDuration", 0),
        })
    
    return {"traders": traders, "period": period, "sort_type": sort_type}


def get_trader_positions(author_id: str, period: int = 7) -> dict:
    """
    获取指定交易员的当前持仓和最近交易
    
    Args:
        author_id: 交易员 ID
        period: 统计周期
    
    Returns:
        {profile: {...}, positions: [...], recent_trades: [...]}
    """
    args = ["smartmoney", "trader", "--authorId", author_id, "--period", str(period)]
    data = _run_okx_cli(args, timeout=20)
    
    if isinstance(data, dict) and data.get("error"):
        return data
    
    # 解析持仓
    positions = []
    raw_positions = data.get("positions", [])
    for p in raw_positions:
        positions.append({
            "instId": p.get("instId", "N/A"),
            "posSide": p.get("posSide", "N/A"),
            "avgPx": p.get("avgPx", "N/A"),
            "lever": p.get("lever", "N/A"),
            "upl": p.get("upl", "0"),
        })
    
    # 解析最近交易
    trades = []
    raw_trades = data.get("trades", [])
    for tr in raw_trades[:10]:
        trades.append({
            "instId": tr.get("instId", "N/A"),
            "side": tr.get("side", "N/A"),
            "px": tr.get("px", "N/A"),
            "sz": tr.get("sz", "N/A"),
            "ts": tr.get("ts", ""),
        })
    
    return {
        "authorId": author_id,
        "positions": positions,
        "recent_trades": trades,
    }


def get_smart_money_consensus(symbol: str = "BTC", period: int = 7, top_n: int = 10) -> dict:
    """
    获取指定币种的聪明钱共识方向
    
    通过分析 Top N 交易员的最近交易方向，计算多空共识。
    
    Args:
        symbol: 币种（BTC/ETH/SOL/DOGE/OKB）
        period: 统计周期（7/30/90 天）
        top_n: 分析前 N 名交易员
    
    Returns:
        {
            symbol, consensus_direction, long_ratio, short_ratio,
            top_traders_long, top_traders_short, confidence
        }
    """
    inst_id = SYMBOL_TO_INST.get(symbol.upper(), f"{symbol.upper()}-USDT-SWAP")
    
    # 获取 Top N 交易员
    traders_data = get_top_traders(period=period, limit=top_n)
    if traders_data.get("error"):
        return traders_data
    
    traders = traders_data.get("traders", [])
    if not traders:
        return {"error": "无交易员数据"}
    
    # 逐个查看交易员的最近交易，统计该币种的多空方向
    long_count = 0
    short_count = 0
    long_traders = []
    short_traders = []
    
    # 只查前 5 个（避免太多 API 调用）
    check_count = min(5, len(traders))
    
    for t in traders[:check_count]:
        detail = get_trader_positions(t["authorId"], period=period)
        if detail.get("error"):
            continue
        
        # 分析该交易员在目标币种的最近交易方向
        recent_trades = detail.get("recent_trades", [])
        symbol_trades = [tr for tr in recent_trades if symbol.upper() in tr.get("instId", "").upper()]
        
        if symbol_trades:
            # 取最近一笔交易的方向
            last_side = symbol_trades[0].get("side", "")
            if last_side == "buy":
                long_count += 1
                long_traders.append(t["nickName"])
            elif last_side == "sell":
                short_count += 1
                short_traders.append(t["nickName"])
    
    total = long_count + short_count
    if total == 0:
        return {
            "symbol": symbol,
            "consensus_direction": "neutral",
            "long_ratio": 0,
            "short_ratio": 0,
            "confidence": "low",
            "note": "聪明钱在该币种无明显动作",
        }
    
    long_ratio = long_count / total
    short_ratio = short_count / total
    
    # 判断共识方向
    if long_ratio >= 0.7:
        direction = "long"
        confidence = "high"
    elif long_ratio >= 0.6:
        direction = "long"
        confidence = "medium"
    elif short_ratio >= 0.7:
        direction = "short"
        confidence = "high"
    elif short_ratio >= 0.6:
        direction = "short"
        confidence = "medium"
    else:
        direction = "neutral"
        confidence = "low"
    
    return {
        "symbol": symbol,
        "consensus_direction": direction,
        "long_ratio": round(long_ratio * 100, 1),
        "short_ratio": round(short_ratio * 100, 1),
        "long_traders": long_traders,
        "short_traders": short_traders,
        "confidence": confidence,
        "sample_size": total,
    }


def get_smart_money_summary(symbol: str = "BTC") -> dict:
    """
    综合聪明钱摘要 — 用于注入引擎信号
    
    返回一行式摘要，可直接拼接到引擎水印中。
    
    Args:
        symbol: 币种
    
    Returns:
        {
            symbol, direction, confidence, long_pct, short_pct,
            top_trader_action, summary_text
        }
    """
    consensus = get_smart_money_consensus(symbol, period=7, top_n=10)
    
    if consensus.get("error"):
        return {"error": consensus["error"], "summary_text": "聪明钱数据暂不可用"}
    
    direction = consensus["consensus_direction"]
    confidence = consensus["confidence"]
    long_pct = consensus["long_ratio"]
    short_pct = consensus["short_ratio"]
    
    # 构建摘要文本
    direction_cn = {"long": "做多", "short": "做空", "neutral": "观望"}.get(direction, "未知")
    confidence_cn = {"high": "强", "medium": "中", "low": "弱"}.get(confidence, "")
    
    summary = f"聪明钱{confidence_cn}共识{direction_cn} (多{long_pct}%/空{short_pct}%)"
    
    return {
        "symbol": symbol,
        "direction": direction,
        "confidence": confidence,
        "long_pct": long_pct,
        "short_pct": short_pct,
        "summary_text": summary,
    }


# ============================================================
# 直接运行测试
# ============================================================
if __name__ == "__main__":
    import sys
    
    symbol = sys.argv[1] if len(sys.argv) > 1 else "BTC"
    
    print(f"=== H_V3 Smart Money 分析: {symbol} ===\n")
    
    # 1. 获取共识
    print("[1] 聪明钱共识方向...")
    consensus = get_smart_money_consensus(symbol)
    if consensus.get("error"):
        print(f"   错误: {consensus['error']}")
    else:
        print(f"   方向: {consensus['consensus_direction']}")
        print(f"   多空比: {consensus['long_ratio']}% / {consensus['short_ratio']}%")
        print(f"   信心度: {consensus['confidence']}")
        if consensus.get("long_traders"):
            print(f"   做多交易员: {', '.join(consensus['long_traders'])}")
        if consensus.get("short_traders"):
            print(f"   做空交易员: {', '.join(consensus['short_traders'])}")
    
    # 2. 综合摘要
    print("\n[2] 综合摘要...")
    summary = get_smart_money_summary(symbol)
    print(f"   {summary.get('summary_text', 'N/A')}")
    
    # 3. Top 3 交易员
    print("\n[3] Top 3 交易员...")
    top = get_top_traders(period=7, limit=3)
    if not top.get("error"):
        for i, t in enumerate(top["traders"], 1):
            print(f"   #{i} {t['nickName']} | PnL: ${t['pnl']:,.0f} | 收益率: {t['pnlRatio']*100:.1f}%")
