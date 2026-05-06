"""
H V3 数据接口层 (Data API Layer)
================================
四层架构第一层：可插拔数据源适配器

设计原则：
1. 引擎只认标准格式数据，不关心数据从哪来
2. 数据接口层是适配器，今天OKX，明天可以换任何数据源
3. 后台持续拉数据存缓存，用户请求时秒回
4. 任何单个命令失败不阻塞，使用上次有效数据（容错降级）

数据源：OKX Agent Trade Kit CLI v1.3.2
- okx-cex-market: 行情数据（价格、K线、盘口、资金费率、技术指标）- 无需鉴权
- okx-cex-smartmoney: 聪明钱（交易员排行榜、意见信号、持仓分析）- 需鉴权
"""

import json
import subprocess
import time
import threading
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from copy import deepcopy

# ============================================================
# 配置
# ============================================================

SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "OKB"]
TIMEFRAMES = ["1H", "4H", "1Dutc"]
DEFAULT_TIMEFRAME = "4H"
CACHE_TTL = 300  # 缓存有效期5分钟
REFRESH_INTERVAL = 300  # 后台刷新间隔5分钟
CLI_TIMEOUT = 10  # 单个CLI命令超时10秒
MAX_WORKERS = 12  # 并行线程数

# 技术指标列表（OKX CLI支持的）
INDICATORS = [
    "rsi", "macd", "bb", "atr", "supertrend",
    "vwap", "cmf", "obv", "kdj", "stoch-rsi", "mfi",
    "top-long-short"
]

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [DataAPI] %(levelname)s: %(message)s'
)
logger = logging.getLogger("h_v3_data_api")


# ============================================================
# 标准输出格式定义
# ============================================================

def empty_standard_data(symbol: str) -> Dict[str, Any]:
    """返回标准格式的空数据结构，引擎只认这个格式"""
    return {
        "symbol": symbol,
        "inst_id": f"{symbol}-USDT-SWAP",
        "timestamp": int(time.time()),
        "price": None,
        "price_open": None,
        "price_high": None,
        "price_low": None,
        "volume_24h": None,

        # 技术指标（来自OKX CLI okx-cex-market）
        "rsi_14": None,
        "macd_dif": None,
        "macd_dea": None,
        "macd_hist": None,
        "bb_upper": None,
        "bb_middle": None,
        "bb_lower": None,
        "atr_14": None,
        "supertrend_value": None,
        "supertrend_direction": None,  # "UP" or "DOWN"
        "vwap": None,
        "cmf": None,
        "obv": None,
        "obv_ma": None,
        "kdj_k": None,
        "kdj_d": None,
        "kdj_j": None,
        "stoch_rsi": None,
        "stoch_rsi_k": None,
        "stoch_rsi_d": None,
        "mfi": None,

        # 市场微观结构
        "funding_rate": None,
        "funding_rate_next": None,
        "oi_usd": None,
        "oi_change_pct": None,
        "long_ratio": None,
        "short_ratio": None,
        "long_short_ratio": None,

        # 聪明钱（来自OKX CLI okx-cex-smartmoney）
        "smart_money_long_pct": None,
        "smart_money_short_pct": None,
        "smart_money_direction": None,  # "long" / "short" / "neutral"
        "smart_money_consensus": None,  # 中文描述
        "smart_money_top_traders": None,  # Top交易员列表

        # 多时间框架方向（由多TF指标综合判断）
        "tf_1h": {},
        "tf_4h": {},
        "tf_1d": {},

        # 元数据
        "data_source": "okx_cli",
        "data_version": "v3.1",
        "fetch_time_ms": 0,
        "errors": [],
    }


# ============================================================
# OKX CLI 命令执行器
# ============================================================

class OKXCliExecutor:
    """封装OKX CLI命令执行，统一错误处理"""

    @staticmethod
    def run(cmd: str, timeout: int = CLI_TIMEOUT) -> Optional[Any]:
        """执行OKX CLI命令，返回解析后的JSON或None"""
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=timeout
            )
            if result.returncode != 0:
                logger.warning(f"CLI error [{cmd[:60]}]: {result.stderr[:100]}")
                return None
            output = result.stdout.strip()
            if not output:
                return None
            return json.loads(output)
        except subprocess.TimeoutExpired:
            logger.warning(f"CLI timeout [{cmd[:60]}]")
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error [{cmd[:60]}]: {e}")
            return None
        except Exception as e:
            logger.error(f"CLI exception [{cmd[:60]}]: {e}")
            return None

    @staticmethod
    def get_indicator(inst_id: str, indicator: str, bar: str = "4H") -> Optional[Dict]:
        """获取单个技术指标"""
        cmd = f"okx market indicator {indicator} {inst_id} --bar {bar} --json"
        data = OKXCliExecutor.run(cmd)
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        try:
            indicators = data[0]["data"][0]["timeframes"][bar]["indicators"]
            # 指标名称大写
            key = indicator.upper().replace("-", "")
            if key == "STOCHRSI":
                key = "STOCHRSI"
            elif key == "TOPLONGSHORT":
                key = "TOPLONGSHORT"
            if key in indicators and len(indicators[key]) > 0:
                return indicators[key][0].get("values", {})
            return None
        except (KeyError, IndexError, TypeError):
            return None

    @staticmethod
    def get_funding_rate(inst_id: str) -> Optional[Dict]:
        """获取资金费率"""
        cmd = f"okx market funding-rate {inst_id} --json"
        data = OKXCliExecutor.run(cmd)
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        return data[0] if isinstance(data[0], dict) else None

    @staticmethod
    def get_oi_history(inst_id: str) -> Optional[Dict]:
        """获取持仓量历史（最新一条）"""
        cmd = f"okx market oi-history {inst_id} --json"
        data = OKXCliExecutor.run(cmd)
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        try:
            rows = data[0].get("rows", [])
            if rows and len(rows) > 0:
                return rows[0]
            return None
        except (KeyError, IndexError, TypeError):
            return None

    @staticmethod
    def get_candles(inst_id: str, bar: str = "4H", limit: int = 1) -> Optional[List]:
        """获取K线数据"""
        cmd = f"okx market candles {inst_id} --bar {bar} --json"
        data = OKXCliExecutor.run(cmd)
        if not data or not isinstance(data, list) or len(data) == 0:
            return None
        return data[:limit]

    @staticmethod
    def get_smart_traders(limit: int = 10) -> Optional[List]:
        """获取Top交易员列表"""
        cmd = f"okx smartmoney traders --limit {limit} --json"
        data = OKXCliExecutor.run(cmd, timeout=15)
        if not data or not isinstance(data, list):
            return None
        return data

    @staticmethod
    def get_trader_detail(author_id: str) -> Optional[Dict]:
        """获取交易员详情和持仓"""
        cmd = f"okx smartmoney trader --authorId {author_id} --json"
        data = OKXCliExecutor.run(cmd, timeout=15)
        if not data or not isinstance(data, dict):
            # 有时返回的是列表
            if isinstance(data, list) and len(data) > 0:
                return data[0] if isinstance(data[0], dict) else None
            return None
        return data


# ============================================================
# 数据解析器：将OKX CLI原始数据映射到标准格式
# ============================================================

class DataParser:
    """将OKX CLI返回的原始JSON映射到标准数据格式"""

    @staticmethod
    def parse_rsi(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {"rsi_14": _to_float(raw.get("14"))}

    @staticmethod
    def parse_macd(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "macd_dif": _to_float(raw.get("dif")),
            "macd_dea": _to_float(raw.get("dea")),
            "macd_hist": _to_float(raw.get("macd")),
        }

    @staticmethod
    def parse_bb(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "bb_upper": _to_float(raw.get("upper")),
            "bb_middle": _to_float(raw.get("middle")),
            "bb_lower": _to_float(raw.get("lower")),
        }

    @staticmethod
    def parse_atr(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {"atr_14": _to_float(raw.get("14"))}

    @staticmethod
    def parse_supertrend(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "supertrend_value": _to_float(raw.get("superTrend")),
            "supertrend_direction": raw.get("trend"),  # "UP" or "DOWN"
        }

    @staticmethod
    def parse_vwap(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {"vwap": _to_float(raw.get("vwap"))}

    @staticmethod
    def parse_cmf(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {"cmf": _to_float(raw.get("cmf"))}

    @staticmethod
    def parse_obv(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "obv": _to_float(raw.get("value")),
            "obv_ma": _to_float(raw.get("maObv")),
        }

    @staticmethod
    def parse_kdj(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "kdj_k": _to_float(raw.get("k")),
            "kdj_d": _to_float(raw.get("d")),
            "kdj_j": _to_float(raw.get("j")),
        }

    @staticmethod
    def parse_stoch_rsi(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "stoch_rsi": _to_float(raw.get("stochRsi")),
            "stoch_rsi_k": _to_float(raw.get("k")),
            "stoch_rsi_d": _to_float(raw.get("d")),
        }

    @staticmethod
    def parse_mfi(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {"mfi": _to_float(raw.get("mfi"))}

    @staticmethod
    def parse_top_long_short(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "long_ratio": _to_float(raw.get("longRatio")),
            "short_ratio": _to_float(raw.get("shortRatio")),
            "long_short_ratio": _to_float(raw.get("longShortRatio")),
        }

    @staticmethod
    def parse_funding_rate(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "funding_rate": _to_float(raw.get("fundingRate")),
            "funding_rate_next": _to_float(raw.get("nextFundingRate")),
        }

    @staticmethod
    def parse_oi(raw: Optional[Dict]) -> Dict:
        if not raw:
            return {}
        return {
            "oi_usd": _to_float(raw.get("oiUsd")),
            "oi_change_pct": _to_float(raw.get("oiDeltaPct")),
        }

    @staticmethod
    def parse_candle(raw: Optional[List]) -> Dict:
        """K线格式: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]"""
        if not raw or len(raw) < 7:
            return {}
        return {
            "price": _to_float(raw[4]),  # close
            "price_open": _to_float(raw[1]),
            "price_high": _to_float(raw[2]),
            "price_low": _to_float(raw[3]),
            "volume_24h": _to_float(raw[5]),
        }

    # 指标名 -> 解析方法映射
    PARSER_MAP = {
        "rsi": "parse_rsi",
        "macd": "parse_macd",
        "bb": "parse_bb",
        "atr": "parse_atr",
        "supertrend": "parse_supertrend",
        "vwap": "parse_vwap",
        "cmf": "parse_cmf",
        "obv": "parse_obv",
        "kdj": "parse_kdj",
        "stoch-rsi": "parse_stoch_rsi",
        "mfi": "parse_mfi",
        "top-long-short": "parse_top_long_short",
    }


# ============================================================
# 聪明钱分析器
# ============================================================

class SmartMoneyAnalyzer:
    """分析Top交易员持仓，计算聪明钱共识方向"""

    @staticmethod
    def analyze(traders_data: Optional[List], symbol: str = "BTC") -> Dict:
        """
        分析Top交易员对特定币种的多空方向
        返回标准格式的聪明钱数据
        """
        result = {
            "smart_money_long_pct": None,
            "smart_money_short_pct": None,
            "smart_money_direction": None,
            "smart_money_consensus": None,
            "smart_money_top_traders": None,
        }

        if not traders_data:
            return result

        # 获取每个交易员的持仓方向
        long_count = 0
        short_count = 0
        total_with_position = 0
        trader_summaries = []

        for trader in traders_data[:10]:
            author_id = trader.get("authorId", "")
            nick = trader.get("nickName", "Unknown")
            pnl = trader.get("pnl", "0")

            # 获取交易员详情（含持仓）
            detail = OKXCliExecutor.get_trader_detail(author_id)
            if not detail:
                continue

            # 分析持仓
            positions = detail.get("positions", [])
            if not positions and isinstance(detail, dict):
                # 有时候结构不同，尝试其他路径
                positions = detail.get("currentPositions", [])

            trader_direction = None
            for pos in (positions if isinstance(positions, list) else []):
                inst = pos.get("instId", "")
                if symbol.upper() in inst.upper():
                    side = pos.get("posSide", "").lower()
                    if side == "long":
                        long_count += 1
                        trader_direction = "long"
                    elif side == "short":
                        short_count += 1
                        trader_direction = "short"
                    total_with_position += 1
                    break

            trader_summaries.append({
                "nick": nick,
                "pnl": pnl,
                "direction": trader_direction,
            })

        # 计算共识
        if total_with_position > 0:
            long_pct = long_count / total_with_position
            short_pct = short_count / total_with_position
        else:
            long_pct = 0.5
            short_pct = 0.5

        # 判断方向和共识强度
        if long_pct >= 0.7:
            direction = "long"
            consensus = "强共识做多"
        elif long_pct >= 0.55:
            direction = "long"
            consensus = "中共识做多"
        elif short_pct >= 0.7:
            direction = "short"
            consensus = "强共识做空"
        elif short_pct >= 0.55:
            direction = "short"
            consensus = "中共识做空"
        else:
            direction = "neutral"
            consensus = "多空分歧"

        result["smart_money_long_pct"] = round(long_pct, 3)
        result["smart_money_short_pct"] = round(short_pct, 3)
        result["smart_money_direction"] = direction
        result["smart_money_consensus"] = consensus
        result["smart_money_top_traders"] = trader_summaries[:5]

        return result


# ============================================================
# 数据聚合器：并行拉取所有数据
# ============================================================

class DataAggregator:
    """并行调用所有OKX CLI命令，聚合成标准格式"""

    def __init__(self, max_workers: int = MAX_WORKERS):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def fetch_full(self, symbol: str, timeframe: str = DEFAULT_TIMEFRAME,
                   include_smart_money: bool = True) -> Dict[str, Any]:
        """
        并行拉取一个币种的全部数据，返回标准格式
        
        Args:
            symbol: 币种名称 (BTC/ETH/SOL/DOGE/OKB)
            timeframe: 时间框架 (1H/4H/1Dutc)
            include_smart_money: 是否包含聪明钱数据（耗时较长）
        
        Returns:
            标准格式数据字典
        """
        start_time = time.time()
        inst_id = f"{symbol}-USDT-SWAP"
        data = empty_standard_data(symbol)
        errors = []

        # 构建并行任务
        futures = {}

        # 1. K线数据（价格）
        futures["candle"] = self.executor.submit(
            OKXCliExecutor.get_candles, inst_id, timeframe, 1
        )

        # 2. 所有技术指标
        for indicator in INDICATORS:
            futures[f"ind_{indicator}"] = self.executor.submit(
                OKXCliExecutor.get_indicator, inst_id, indicator, timeframe
            )

        # 3. 资金费率
        futures["funding"] = self.executor.submit(
            OKXCliExecutor.get_funding_rate, inst_id
        )

        # 4. 持仓量
        futures["oi"] = self.executor.submit(
            OKXCliExecutor.get_oi_history, inst_id
        )

        # 5. 聪明钱（可选，耗时较长）
        if include_smart_money:
            futures["smart_traders"] = self.executor.submit(
                OKXCliExecutor.get_smart_traders, 10
            )

        # 收集结果
        results = {}
        for key, future in futures.items():
            try:
                results[key] = future.result(timeout=CLI_TIMEOUT + 5)
            except Exception as e:
                results[key] = None
                errors.append(f"{key}: {str(e)}")

        # 解析K线
        candle_data = results.get("candle")
        if candle_data and len(candle_data) > 0:
            parsed = DataParser.parse_candle(candle_data[0])
            data.update(parsed)

        # 解析技术指标
        for indicator in INDICATORS:
            raw = results.get(f"ind_{indicator}")
            parser_name = DataParser.PARSER_MAP.get(indicator)
            if parser_name and raw:
                parsed = getattr(DataParser, parser_name)(raw)
                data.update(parsed)

        # 解析资金费率
        funding_raw = results.get("funding")
        if funding_raw:
            data.update(DataParser.parse_funding_rate(funding_raw))

        # 解析持仓量
        oi_raw = results.get("oi")
        if oi_raw:
            data.update(DataParser.parse_oi(oi_raw))

        # 解析聪明钱
        if include_smart_money:
            traders_raw = results.get("smart_traders")
            smart_data = SmartMoneyAnalyzer.analyze(traders_raw, symbol)
            data.update(smart_data)

        # 元数据
        data["timestamp"] = int(time.time())
        data["fetch_time_ms"] = int((time.time() - start_time) * 1000)
        data["errors"] = errors

        return data

    def fetch_multi_timeframe(self, symbol: str) -> Dict[str, Any]:
        """
        拉取多时间框架数据（1H/4H/1D），用于多TF共振判断
        主时间框架为4H（完整数据），1H和1D只拉关键指标
        """
        # 主数据：4H完整
        data = self.fetch_full(symbol, "4H", include_smart_money=True)

        # 辅助时间框架：只拉方向性指标
        for tf in ["1H", "1Dutc"]:
            tf_data = {}
            tf_key = f"tf_{tf.replace('utc', '').lower()}"

            # 并行拉取关键指标
            tf_futures = {}
            inst_id = f"{symbol}-USDT-SWAP"
            for ind in ["rsi", "macd", "supertrend"]:
                tf_futures[ind] = self.executor.submit(
                    OKXCliExecutor.get_indicator, inst_id, ind, tf
                )

            for ind, future in tf_futures.items():
                try:
                    raw = future.result(timeout=CLI_TIMEOUT + 5)
                    parser_name = DataParser.PARSER_MAP.get(ind)
                    if parser_name and raw:
                        parsed = getattr(DataParser, parser_name)(raw)
                        tf_data.update(parsed)
                except Exception:
                    pass

            # 判断该时间框架方向
            direction = _judge_tf_direction(tf_data)
            tf_data["direction"] = direction
            data[tf_key] = tf_data

        return data

    def shutdown(self):
        """关闭线程池"""
        self.executor.shutdown(wait=False)


# ============================================================
# 缓存管理器：后台持续刷新
# ============================================================

class CacheManager:
    """
    后台缓存管理器
    - 每5分钟自动刷新所有监控币种
    - 用户请求时直接读缓存，秒回
    - 容错降级：刷新失败保留上次有效数据
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}  # {symbol: standard_data}
        self._cache_time: Dict[str, float] = {}  # {symbol: timestamp}
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._aggregator = DataAggregator()

    def start(self):
        """启动后台刷新线程"""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self._thread.start()
        logger.info("CacheManager started, monitoring: %s", SYMBOLS)

    def stop(self):
        """停止后台刷新"""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
        self._aggregator.shutdown()
        logger.info("CacheManager stopped")

    def get(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存数据（秒回）
        
        Args:
            symbol: 币种名称
            
        Returns:
            标准格式数据字典，或None（首次启动未完成刷新时）
        """
        with self._lock:
            cached = self._cache.get(symbol.upper())
            if cached:
                return deepcopy(cached)
        return None

    def get_all(self) -> Dict[str, Dict[str, Any]]:
        """获取所有币种缓存数据"""
        with self._lock:
            return {k: deepcopy(v) for k, v in self._cache.items()}

    def force_refresh(self, symbol: str) -> Dict[str, Any]:
        """强制刷新某个币种（同步，用于调试）"""
        data = self._aggregator.fetch_multi_timeframe(symbol)
        with self._lock:
            self._cache[symbol.upper()] = data
            self._cache_time[symbol.upper()] = time.time()
        return data

    def is_fresh(self, symbol: str) -> bool:
        """检查缓存是否新鲜"""
        with self._lock:
            t = self._cache_time.get(symbol.upper(), 0)
            return (time.time() - t) < CACHE_TTL

    @property
    def status(self) -> Dict:
        """缓存状态摘要"""
        with self._lock:
            return {
                "running": self._running,
                "symbols": list(self._cache.keys()),
                "cache_ages": {
                    k: int(time.time() - v)
                    for k, v in self._cache_time.items()
                },
                "total_cached": len(self._cache),
            }

    def _refresh_loop(self):
        """后台刷新循环"""
        # 首次立即刷新
        self._refresh_all()

        while self._running:
            time.sleep(REFRESH_INTERVAL)
            if self._running:
                self._refresh_all()

    def _refresh_all(self):
        """刷新所有监控币种"""
        logger.info("Refreshing all symbols: %s", SYMBOLS)
        for symbol in SYMBOLS:
            try:
                data = self._aggregator.fetch_multi_timeframe(symbol)
                # 只有拿到有效数据才更新缓存（容错降级）
                if data and data.get("price") is not None:
                    with self._lock:
                        self._cache[symbol.upper()] = data
                        self._cache_time[symbol.upper()] = time.time()
                    logger.info(
                        "✓ %s refreshed: price=%.1f, RSI=%.1f, fetch=%dms",
                        symbol, data["price"] or 0,
                        data.get("rsi_14") or 0,
                        data.get("fetch_time_ms", 0)
                    )
                elif data:
                    # 价格为空但有其他数据，也更新（可能K线延迟）
                    with self._lock:
                        old = self._cache.get(symbol.upper(), {})
                        # 保留旧价格
                        if old.get("price"):
                            data["price"] = old["price"]
                        self._cache[symbol.upper()] = data
                        self._cache_time[symbol.upper()] = time.time()
                    logger.warning("⚠ %s partial refresh (no price)", symbol)
                else:
                    logger.warning("✗ %s refresh failed, keeping old cache", symbol)
            except Exception as e:
                logger.error("✗ %s refresh exception: %s", symbol, e)


# ============================================================
# 公开API接口（供策略引擎调用）
# ============================================================

# 全局单例
_cache_manager: Optional[CacheManager] = None


def init(symbols: List[str] = None):
    """
    初始化数据接口层，启动后台缓存
    
    Args:
        symbols: 监控币种列表，默认 ["BTC", "ETH", "SOL", "DOGE", "OKB"]
    """
    global _cache_manager, SYMBOLS
    if symbols:
        SYMBOLS = [s.upper() for s in symbols]
    _cache_manager = CacheManager()
    _cache_manager.start()


def get_data(symbol: str) -> Optional[Dict[str, Any]]:
    """
    获取标准格式数据（秒回，从缓存读取）
    
    这是策略引擎的唯一数据入口。
    引擎不需要知道数据从哪来，只需要调用这个函数。
    
    Args:
        symbol: 币种名称 (BTC/ETH/SOL等)
        
    Returns:
        标准格式数据字典，包含所有技术指标、市场微观结构、聪明钱数据
    """
    if _cache_manager is None:
        logger.error("DataAPI not initialized! Call init() first.")
        return None
    return _cache_manager.get(symbol.upper())


def get_all_data() -> Dict[str, Dict[str, Any]]:
    """获取所有监控币种的数据"""
    if _cache_manager is None:
        return {}
    return _cache_manager.get_all()


def force_refresh(symbol: str) -> Dict[str, Any]:
    """强制刷新某个币种（同步调用，用于调试或紧急更新）"""
    if _cache_manager is None:
        init()
    return _cache_manager.force_refresh(symbol.upper())


def get_status() -> Dict:
    """获取数据接口层状态"""
    if _cache_manager is None:
        return {"running": False, "error": "Not initialized"}
    return _cache_manager.status


def shutdown():
    """关闭数据接口层"""
    global _cache_manager
    if _cache_manager:
        _cache_manager.stop()
        _cache_manager = None


# ============================================================
# 工具函数
# ============================================================

def _to_float(val) -> Optional[float]:
    """安全转换为float"""
    if val is None or val == "" or val == "N/A":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _judge_tf_direction(tf_data: Dict) -> str:
    """
    根据时间框架的关键指标判断方向
    RSI > 55 且 MACD DIF > DEA 且 SuperTrend UP → long
    RSI < 45 且 MACD DIF < DEA 且 SuperTrend DOWN → short
    其他 → neutral
    """
    rsi = tf_data.get("rsi_14")
    macd_dif = tf_data.get("macd_dif")
    macd_dea = tf_data.get("macd_dea")
    st_dir = tf_data.get("supertrend_direction")

    bullish_count = 0
    bearish_count = 0

    if rsi is not None:
        if rsi > 55:
            bullish_count += 1
        elif rsi < 45:
            bearish_count += 1

    if macd_dif is not None and macd_dea is not None:
        if macd_dif > macd_dea:
            bullish_count += 1
        else:
            bearish_count += 1

    if st_dir:
        if st_dir == "UP":
            bullish_count += 1
        elif st_dir == "DOWN":
            bearish_count += 1

    if bullish_count >= 2:
        return "long"
    elif bearish_count >= 2:
        return "short"
    return "neutral"


# ============================================================
# 独立运行测试
# ============================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("H V3 数据接口层 - 独立测试")
    print("=" * 60)

    # 单次拉取测试
    symbol = sys.argv[1] if len(sys.argv) > 1 else "BTC"
    print(f"\n[测试1] 单次拉取 {symbol} 全量数据...")

    aggregator = DataAggregator()
    data = aggregator.fetch_multi_timeframe(symbol)

    print(f"\n--- {symbol} 标准格式数据 ---")
    print(f"价格: {data.get('price')}")
    print(f"RSI(14): {data.get('rsi_14')}")
    print(f"MACD: DIF={data.get('macd_dif')} DEA={data.get('macd_dea')} HIST={data.get('macd_hist')}")
    print(f"BB: Upper={data.get('bb_upper')} Mid={data.get('bb_middle')} Lower={data.get('bb_lower')}")
    print(f"ATR(14): {data.get('atr_14')}")
    print(f"SuperTrend: {data.get('supertrend_value')} ({data.get('supertrend_direction')})")
    print(f"VWAP: {data.get('vwap')}")
    print(f"CMF: {data.get('cmf')}")
    print(f"OBV: {data.get('obv')} (MA: {data.get('obv_ma')})")
    print(f"KDJ: K={data.get('kdj_k')} D={data.get('kdj_d')} J={data.get('kdj_j')}")
    print(f"StochRSI: {data.get('stoch_rsi')} K={data.get('stoch_rsi_k')} D={data.get('stoch_rsi_d')}")
    print(f"MFI: {data.get('mfi')}")
    print(f"资金费率: {data.get('funding_rate')}")
    print(f"持仓量: ${data.get('oi_usd'):,.0f}" if data.get('oi_usd') else "持仓量: N/A")
    print(f"OI变化: {data.get('oi_change_pct')}%")
    print(f"多空比: Long={data.get('long_ratio')} Short={data.get('short_ratio')}")
    print(f"聪明钱: {data.get('smart_money_consensus')} (多{data.get('smart_money_long_pct')})")
    print(f"多TF: 1H={data.get('tf_1h', {}).get('direction')} 4H方向=基于主数据 1D={data.get('tf_1d', {}).get('direction')}")
    print(f"耗时: {data.get('fetch_time_ms')}ms")
    print(f"错误: {data.get('errors')}")
    print(f"数据源: {data.get('data_source')}")

    aggregator.shutdown()
    print("\n✓ 测试完成")
