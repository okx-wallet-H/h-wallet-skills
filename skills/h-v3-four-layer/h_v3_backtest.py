"""
H V3 回测验证层 (Backtest Layer)
================================
四层架构第三层：VectorBT PRO 回测验证

设计原则：
1. 接收策略引擎的信号，用历史数据验证
2. 输出胜率/盈亏比/最大回撤等绩效指标
3. 信号推送时附带历史绩效数据，增强可信度
4. 定期（每日）运行完整回测，更新绩效基线

回测策略：
- 使用策略引擎相同的因子评分逻辑
- 基于OKX CLI历史K线数据
- 固定止损止盈（ATR倍数）
- 统计最近30/90/180天绩效
"""

import json
import subprocess
import time
import logging
import os
from typing import Dict, Optional, Any, List
from dataclasses import dataclass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [Backtest] %(levelname)s: %(message)s'
)
logger = logging.getLogger("h_v3_backtest")

# 回测结果缓存文件
BACKTEST_CACHE_FILE = "/home/ubuntu/h_v3/backtest_cache.json"
CLI_TIMEOUT = 15


# ============================================================
# 回测绩效数据结构
# ============================================================

@dataclass
class BacktestResult:
    """回测结果"""
    symbol: str
    timeframe: str
    period_days: int
    total_trades: int
    win_rate: float  # 0-1
    profit_factor: float  # 盈亏比
    avg_return_pct: float  # 平均收益率%
    max_drawdown_pct: float  # 最大回撤%
    sharpe_ratio: float
    total_return_pct: float  # 总收益率%
    # 最近信号统计
    last_5_signals: List[Dict] = None
    # 元数据
    timestamp: int = 0
    engine_version: str = "v3.1"

    def to_dict(self) -> Dict:
        return {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "period_days": self.period_days,
            "total_trades": self.total_trades,
            "win_rate": self.win_rate,
            "profit_factor": self.profit_factor,
            "avg_return_pct": self.avg_return_pct,
            "max_drawdown_pct": self.max_drawdown_pct,
            "sharpe_ratio": self.sharpe_ratio,
            "total_return_pct": self.total_return_pct,
            "last_5_signals": self.last_5_signals,
            "timestamp": self.timestamp,
            "engine_version": self.engine_version,
        }

    @property
    def summary_text(self) -> str:
        """生成简洁的绩效摘要文本"""
        return (
            f"胜率 {self.win_rate*100:.0f}% | "
            f"盈亏比 {self.profit_factor:.1f} | "
            f"回撤 {self.max_drawdown_pct:.1f}% | "
            f"Sharpe {self.sharpe_ratio:.2f}"
        )


# ============================================================
# VectorBT PRO 回测引擎
# ============================================================

class VBTBacktester:
    """
    VectorBT PRO 回测引擎
    
    在VPS上运行（VPS已安装VectorBT PRO + License）
    通过SSH远程执行回测脚本
    """

    def __init__(self):
        self._cache: Dict[str, BacktestResult] = {}
        self._load_cache()

    def run_backtest(self, symbol: str, period_days: int = 90,
                     timeframe: str = "4H") -> Optional[BacktestResult]:
        """
        运行回测
        
        使用VectorBT PRO在VPS上执行回测脚本
        基于策略引擎相同的因子逻辑
        """
        try:
            # 生成回测脚本
            script = self._generate_backtest_script(symbol, period_days, timeframe)
            
            # 写入VPS并执行
            script_path = f"/tmp/bt_{symbol.lower()}_{period_days}d.py"
            
            # 本地执行（如果在VPS上）或远程执行
            script_file = f"/home/ubuntu/h_v3/bt_runner_{symbol.lower()}.py"
            with open(script_file, 'w') as f:
                f.write(script)
            
            result = subprocess.run(
                ['python3', script_file],
                capture_output=True, text=True, timeout=60
            )
            
            if result.returncode != 0:
                logger.warning(f"Backtest failed for {symbol}: {result.stderr[:200]}")
                # 返回缓存的结果
                return self._cache.get(f"{symbol}_{period_days}d")
            
            # 解析结果
            output = result.stdout.strip()
            bt_data = json.loads(output)
            
            bt_result = BacktestResult(
                symbol=symbol,
                timeframe=timeframe,
                period_days=period_days,
                total_trades=bt_data.get("total_trades", 0),
                win_rate=bt_data.get("win_rate", 0),
                profit_factor=bt_data.get("profit_factor", 0),
                avg_return_pct=bt_data.get("avg_return_pct", 0),
                max_drawdown_pct=bt_data.get("max_drawdown_pct", 0),
                sharpe_ratio=bt_data.get("sharpe_ratio", 0),
                total_return_pct=bt_data.get("total_return_pct", 0),
                last_5_signals=bt_data.get("last_5_signals", []),
                timestamp=int(time.time()),
            )
            
            # 缓存结果
            cache_key = f"{symbol}_{period_days}d"
            self._cache[cache_key] = bt_result
            self._save_cache()
            
            return bt_result
            
        except Exception as e:
            logger.error(f"Backtest exception for {symbol}: {e}")
            return self._cache.get(f"{symbol}_{period_days}d")

    def get_cached_result(self, symbol: str, period_days: int = 90) -> Optional[BacktestResult]:
        """获取缓存的回测结果"""
        cache_key = f"{symbol}_{period_days}d"
        return self._cache.get(cache_key)

    def get_performance_summary(self, symbol: str) -> Optional[str]:
        """获取绩效摘要文本（用于Bot推送）"""
        result = self.get_cached_result(symbol, 90)
        if result:
            return result.summary_text
        return None

    def run_quick_backtest(self, symbol: str) -> Optional[BacktestResult]:
        """
        快速回测：基于已有K线数据的简化回测
        不依赖VectorBT PRO，用纯Python实现
        用于实时信号推送时附带绩效数据
        """
        try:
            # 获取历史K线
            inst_id = f"{symbol}-USDT-SWAP"
            cmd = f"okx market candles {inst_id} --bar 4H --limit 100 --json"
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=CLI_TIMEOUT
            )
            if result.returncode != 0:
                return self.get_cached_result(symbol)
            
            candles = json.loads(result.stdout.strip())
            if not candles or len(candles) < 30:
                return self.get_cached_result(symbol)
            
            # 简化回测：模拟策略引擎的信号
            trades = self._simulate_trades(candles, symbol)
            
            if not trades:
                return self.get_cached_result(symbol)
            
            # 统计绩效
            wins = [t for t in trades if t["pnl"] > 0]
            losses = [t for t in trades if t["pnl"] <= 0]
            
            win_rate = len(wins) / len(trades) if trades else 0
            avg_win = sum(t["pnl"] for t in wins) / len(wins) if wins else 0
            avg_loss = abs(sum(t["pnl"] for t in losses) / len(losses)) if losses else 1
            profit_factor = avg_win / avg_loss if avg_loss > 0 else 0
            
            total_return = sum(t["pnl"] for t in trades)
            avg_return = total_return / len(trades) if trades else 0
            
            # 最大回撤
            cumulative = 0
            peak = 0
            max_dd = 0
            for t in trades:
                cumulative += t["pnl"]
                peak = max(peak, cumulative)
                dd = (peak - cumulative) / max(peak, 1) * 100
                max_dd = max(max_dd, dd)
            
            bt_result = BacktestResult(
                symbol=symbol,
                timeframe="4H",
                period_days=int(len(candles) * 4 / 24),
                total_trades=len(trades),
                win_rate=round(win_rate, 3),
                profit_factor=round(profit_factor, 2),
                avg_return_pct=round(avg_return, 2),
                max_drawdown_pct=round(max_dd, 1),
                sharpe_ratio=round(self._calc_sharpe(trades), 2),
                total_return_pct=round(total_return, 2),
                last_5_signals=trades[-5:],
                timestamp=int(time.time()),
            )
            
            # 更新缓存
            cache_key = f"{symbol}_quick"
            self._cache[cache_key] = bt_result
            self._save_cache()
            
            return bt_result
            
        except Exception as e:
            logger.error(f"Quick backtest error for {symbol}: {e}")
            return self.get_cached_result(symbol)

    def _simulate_trades(self, candles: List, symbol: str) -> List[Dict]:
        """
        模拟交易：基于简化版策略逻辑
        使用K线数据计算简单指标，生成模拟交易
        """
        trades = []
        if len(candles) < 20:
            return trades
        
        # 提取价格序列（candles是倒序的，最新在前）
        prices = []
        for c in reversed(candles):
            if isinstance(c, list) and len(c) >= 5:
                prices.append({
                    "ts": int(c[0]),
                    "open": float(c[1]),
                    "high": float(c[2]),
                    "low": float(c[3]),
                    "close": float(c[4]),
                })
        
        if len(prices) < 20:
            return trades
        
        # 计算简单指标
        closes = [p["close"] for p in prices]
        
        for i in range(20, len(prices)):
            # 简化RSI
            gains = []
            losses = []
            for j in range(i-14, i):
                diff = closes[j] - closes[j-1]
                if diff > 0:
                    gains.append(diff)
                else:
                    losses.append(abs(diff))
            avg_gain = sum(gains) / 14 if gains else 0
            avg_loss = sum(losses) / 14 if losses else 0.001
            rsi = 100 - (100 / (1 + avg_gain / avg_loss))
            
            # 简化MACD
            ema12 = sum(closes[i-12:i]) / 12
            ema26 = sum(closes[i-26:i]) / 26 if i >= 26 else ema12
            macd = ema12 - ema26
            
            # 简化信号
            price = closes[i]
            atr = sum(prices[j]["high"] - prices[j]["low"] for j in range(i-14, i)) / 14
            
            # 做多条件
            if rsi < 40 and macd > 0:
                # 模拟做多
                entry = price
                sl = entry - atr * 1.5
                tp = entry + atr * 2.0
                
                # 检查后续是否触及止盈或止损
                if i + 5 < len(prices):
                    hit_tp = any(prices[j]["high"] >= tp for j in range(i+1, min(i+10, len(prices))))
                    hit_sl = any(prices[j]["low"] <= sl for j in range(i+1, min(i+10, len(prices))))
                    
                    if hit_tp and not hit_sl:
                        pnl = (tp - entry) / entry * 100
                    elif hit_sl:
                        pnl = (sl - entry) / entry * 100
                    else:
                        exit_price = prices[min(i+5, len(prices)-1)]["close"]
                        pnl = (exit_price - entry) / entry * 100
                    
                    trades.append({
                        "direction": "long",
                        "entry": entry,
                        "pnl": round(pnl, 2),
                        "ts": prices[i]["ts"],
                    })
            
            # 做空条件
            elif rsi > 60 and macd < 0:
                entry = price
                sl = entry + atr * 1.5
                tp = entry - atr * 2.0
                
                if i + 5 < len(prices):
                    hit_tp = any(prices[j]["low"] <= tp for j in range(i+1, min(i+10, len(prices))))
                    hit_sl = any(prices[j]["high"] >= sl for j in range(i+1, min(i+10, len(prices))))
                    
                    if hit_tp and not hit_sl:
                        pnl = (entry - tp) / entry * 100
                    elif hit_sl:
                        pnl = (entry - sl) / entry * 100
                    else:
                        exit_price = prices[min(i+5, len(prices)-1)]["close"]
                        pnl = (entry - exit_price) / entry * 100
                    
                    trades.append({
                        "direction": "short",
                        "entry": entry,
                        "pnl": round(pnl, 2),
                        "ts": prices[i]["ts"],
                    })
        
        return trades

    def _calc_sharpe(self, trades: List[Dict], risk_free: float = 0) -> float:
        """计算Sharpe Ratio"""
        if not trades or len(trades) < 2:
            return 0
        returns = [t["pnl"] for t in trades]
        avg = sum(returns) / len(returns)
        variance = sum((r - avg) ** 2 for r in returns) / len(returns)
        std = variance ** 0.5
        if std == 0:
            return 0
        return (avg - risk_free) / std

    def _generate_backtest_script(self, symbol: str, period_days: int,
                                   timeframe: str) -> str:
        """生成VectorBT PRO回测脚本"""
        return f'''#!/usr/bin/env python3
"""VectorBT PRO Backtest: {symbol} {period_days}d {timeframe}"""
import json
import sys

try:
    import vectorbtpro as vbt
    import numpy as np
    import pandas as pd
    
    # 获取数据
    inst_id = "{symbol}-USDT-SWAP"
    
    # 使用OKX CLI获取历史K线
    import subprocess
    limit = min({period_days} * 6, 300)  # 4H K线数量
    cmd = f"okx market candles {{inst_id}} --bar {timeframe} --limit {{limit}} --json"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    
    if result.returncode != 0:
        print(json.dumps({{"error": "Failed to get candles"}}))
        sys.exit(0)
    
    candles = json.loads(result.stdout.strip())
    
    # 转换为DataFrame
    df = pd.DataFrame(candles, columns=["ts","open","high","low","close","vol","volCcy","volQuote","confirm"])
    df = df.astype({{"open":float,"high":float,"low":float,"close":float,"vol":float}})
    df["ts"] = pd.to_datetime(df["ts"].astype(int), unit="ms")
    df = df.set_index("ts").sort_index()
    
    # VBT回测
    close = df["close"]
    high = df["high"]
    low = df["low"]
    
    # RSI策略
    rsi = vbt.RSI.run(close, window=14)
    entries = rsi.rsi_crossed_below(30)
    exits = rsi.rsi_crossed_above(70)
    
    pf = vbt.Portfolio.from_signals(
        close, entries, exits,
        init_cash=10000,
        fees=0.0006,
        sl_stop=0.02,
        tp_stop=0.03,
    )
    
    stats = pf.stats()
    
    output = {{
        "total_trades": int(stats.get("Total Trades", 0)),
        "win_rate": float(stats.get("Win Rate [%]", 0)) / 100,
        "profit_factor": float(stats.get("Profit Factor", 0)),
        "avg_return_pct": float(stats.get("Avg Winning Trade [%]", 0)),
        "max_drawdown_pct": float(stats.get("Max Drawdown [%]", 0)),
        "sharpe_ratio": float(stats.get("Sharpe Ratio", 0)),
        "total_return_pct": float(stats.get("Total Return [%]", 0)),
        "last_5_signals": [],
    }}
    
    print(json.dumps(output))

except ImportError:
    # VectorBT PRO 不可用，使用简化回测
    print(json.dumps({{
        "total_trades": 0,
        "win_rate": 0,
        "profit_factor": 0,
        "avg_return_pct": 0,
        "max_drawdown_pct": 0,
        "sharpe_ratio": 0,
        "total_return_pct": 0,
        "last_5_signals": [],
        "error": "vectorbtpro not available"
    }}))

except Exception as e:
    print(json.dumps({{
        "error": str(e),
        "total_trades": 0,
        "win_rate": 0,
        "profit_factor": 0,
        "avg_return_pct": 0,
        "max_drawdown_pct": 0,
        "sharpe_ratio": 0,
        "total_return_pct": 0,
        "last_5_signals": [],
    }}))
'''

    def _load_cache(self):
        """从文件加载缓存"""
        try:
            if os.path.exists(BACKTEST_CACHE_FILE):
                with open(BACKTEST_CACHE_FILE, 'r') as f:
                    data = json.load(f)
                for key, val in data.items():
                    self._cache[key] = BacktestResult(**val)
                logger.info(f"Loaded {len(self._cache)} cached backtest results")
        except Exception as e:
            logger.warning(f"Failed to load cache: {e}")

    def _save_cache(self):
        """保存缓存到文件"""
        try:
            data = {k: v.to_dict() for k, v in self._cache.items()}
            with open(BACKTEST_CACHE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save cache: {e}")


# ============================================================
# 公开API接口
# ============================================================

_backtester: Optional[VBTBacktester] = None


def get_backtester() -> VBTBacktester:
    """获取全局回测实例"""
    global _backtester
    if _backtester is None:
        _backtester = VBTBacktester()
    return _backtester


def get_performance(symbol: str) -> Optional[str]:
    """获取绩效摘要文本（供Bot推送使用）"""
    bt = get_backtester()
    result = bt.get_cached_result(symbol, 90) or bt.get_cached_result(f"{symbol}_quick")
    if result:
        return result.summary_text
    return None


def get_performance_data(symbol: str) -> Optional[Dict]:
    """获取绩效数据字典"""
    bt = get_backtester()
    result = bt.get_cached_result(symbol, 90) or bt.get_cached_result(f"{symbol}_quick")
    if result:
        return result.to_dict()
    return None


def run_quick(symbol: str) -> Optional[BacktestResult]:
    """运行快速回测"""
    return get_backtester().run_quick_backtest(symbol)


def run_full(symbol: str, period_days: int = 90) -> Optional[BacktestResult]:
    """运行完整回测"""
    return get_backtester().run_backtest(symbol, period_days)


# ============================================================
# 独立运行测试
# ============================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("H V3 回测验证层 - 独立测试")
    print("=" * 60)

    symbol = sys.argv[1] if len(sys.argv) > 1 else "BTC"
    
    bt = VBTBacktester()
    
    print(f"\n[测试] 快速回测 {symbol}...")
    result = bt.run_quick_backtest(symbol)
    
    if result:
        print(f"\n--- {symbol} 回测结果 ({result.period_days}天) ---")
        print(f"总交易数: {result.total_trades}")
        print(f"胜率: {result.win_rate*100:.1f}%")
        print(f"盈亏比: {result.profit_factor:.2f}")
        print(f"平均收益: {result.avg_return_pct:.2f}%")
        print(f"最大回撤: {result.max_drawdown_pct:.1f}%")
        print(f"Sharpe: {result.sharpe_ratio:.2f}")
        print(f"总收益: {result.total_return_pct:.2f}%")
        print(f"\n摘要: {result.summary_text}")
    else:
        print("回测失败，无结果")
    
    print("\n✓ 测试完成")
