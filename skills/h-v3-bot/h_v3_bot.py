"""
H_V3 Bot - 主调度中心
========================
作为 MCP Client，连接所有 MCP Server（OKX Market / Engine / AI），
并通过 Telegram Bot 与用户交互。

架构角色：纯编排层，不包含任何业务逻辑计算。
所有能力通过调用 MCP Server 的 Tools 实现。

特性：
  - 进程锁：防止多实例运行导致 409 冲突
  - 命令路由：解析 Telegram 命令并分发到对应 MCP Server
  - AI 对话：自动检测币种 → 调引擎 → 喂 AI → 加水印 → 回复
  - 定时扫描：每 4 小时自动扫描并推送信号
  - 优雅退出：收到 SIGTERM 时正确清理资源
"""

import os
import sys
import json
import time
import signal
import fcntl
import threading
import urllib.request
import urllib.error
from datetime import datetime

# ============================================================
# 进程锁（彻底防止多实例）
# ============================================================

PID_FILE = "/tmp/h_v3_bot.pid"


def acquire_lock():
    """获取进程锁，如果已有实例运行则退出"""
    try:
        fp = open(PID_FILE, "w")
        fcntl.flock(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fp.write(str(os.getpid()))
        fp.flush()
        return fp  # 必须保持文件句柄打开
    except IOError:
        print("[致命] 检测到另一个 H_V3 Bot 实例正在运行，退出。")
        sys.exit(1)


# ============================================================
# 配置
# ============================================================

# Telegram
TELEGRAM_TOKEN = "8597117850:AAEzp9Nr-y6RDS2zfCE-yr2xPxLfGFCr6dI"
TELEGRAM_CHAT_ID = -5164059069  # ai策略群
TELEGRAM_BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# 定时扫描间隔（秒）
SCAN_INTERVAL = 4 * 3600  # 4小时

# 支持的币种
SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "OKB"]

# 币种别名映射（用于 AI 对话中检测用户提到的币种）
SYMBOL_ALIASES = {
    "BTC": ["btc", "比特币", "bitcoin", "大饼"],
    "ETH": ["eth", "以太坊", "ethereum", "以太", "姨太"],
    "SOL": ["sol", "solana", "索拉纳"],
    "DOGE": ["doge", "狗狗币", "dogecoin", "狗币"],
    "OKB": ["okb"],
}


# ============================================================
# 导入 MCP Server 模块（同进程直接调用）
# ============================================================

# 注意：在生产环境中，这些可以改为通过 MCP stdio/SSE 协议远程调用
# 当前为简化部署，采用同进程直接导入的方式
from h_v3_mcp_okx_market import get_ticker, get_tickers
from h_v3_mcp_engine import scan_symbol
from h_v3_mcp_ai import chat, analyze_sentiment, summarize_market, list_providers


# ============================================================
# Telegram 通信层
# ============================================================

class TelegramClient:
    """Telegram Bot API 通信客户端"""

    def __init__(self, token: str):
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.offset = 0

    def send_message(self, text: str, chat_id: int = None, parse_mode: str = "Markdown") -> bool:
        """发送消息"""
        target = chat_id or TELEGRAM_CHAT_ID
        payload = json.dumps({
            "chat_id": target,
            "text": text,
            "parse_mode": parse_mode,
        }).encode()

        req = urllib.request.Request(
            f"{self.base_url}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "H_V3/3.0.0"},
        )

        try:
            resp = urllib.request.urlopen(req, timeout=10)
            return True
        except Exception as e:
            print(f"[推送失败] {e}")
            return False

    def get_updates(self) -> list:
        """获取新消息（long polling）"""
        url = f"{self.base_url}/getUpdates?offset={self.offset}&timeout=30"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "H_V3/3.0.0"})
            resp = urllib.request.urlopen(req, timeout=35)
            data = json.loads(resp.read())
            if data.get("ok"):
                return data.get("result", [])
        except Exception as e:
            if "409" not in str(e):
                print(f"[getUpdates] {e}")
            time.sleep(5)
        return []


# ============================================================
# 命令处理器
# ============================================================

class CommandRouter:
    """命令路由器：解析命令并调用对应的 MCP Server Tools"""

    def __init__(self, telegram: TelegramClient):
        self.tg = telegram
        self.commands = {
            "/start": self.cmd_start,
            "/help": self.cmd_help,
            "/scan": self.cmd_scan,
            "/signal": self.cmd_signal,
            "/btc": lambda cid: self.cmd_symbol("BTC", cid),
            "/eth": lambda cid: self.cmd_symbol("ETH", cid),
            "/sol": lambda cid: self.cmd_symbol("SOL", cid),
            "/doge": lambda cid: self.cmd_symbol("DOGE", cid),
            "/okb": lambda cid: self.cmd_symbol("OKB", cid),
            "/sentiment": self.cmd_sentiment,
            "/status": self.cmd_status,
            "/version": self.cmd_version,
            "/providers": self.cmd_providers,
        }

    def route(self, command: str, chat_id: int, text: str = ""):
        """路由命令到对应处理器"""
        cmd = command.split("@")[0].lower()  # 去掉 @botname
        handler = self.commands.get(cmd)
        if handler:
            try:
                handler(chat_id)
            except Exception as e:
                self.tg.send_message(f"⚠️ 命令执行出错: {e}", chat_id)
                print(f"[命令错误] {cmd}: {e}")
        else:
            # 非命令消息，走 AI 对话
            self.handle_ai_chat(text, chat_id)

    def cmd_start(self, chat_id: int):
        msg = """🐬 *H\\_V3 | AI Strategy Engine*

欢迎使用海豚 AI 策略引擎 V3！

*架构特性：*
• MCP 协议标准化接口
• 多模型热切换（Grok/DeepSeek/OpenAI）
• 插拔式模块设计

输入 /help 查看完整命令列表
或直接发送消息与 AI 对话"""
        self.tg.send_message(msg, chat_id)

    def cmd_help(self, chat_id: int):
        msg = """📋 *命令列表*

*信号类：*
/scan - 全币种扫描
/signal - 最佳交易信号
/btc /eth /sol /doge /okb - 单币种分析

*分析类：*
/sentiment - 市场情绪分析

*系统类：*
/status - 系统状态
/version - 版本信息
/providers - AI 模型列表

*AI 对话：*
直接发送任何消息即可与 AI 交流
支持自动识别币种并注入引擎数据"""
        self.tg.send_message(msg, chat_id)

    def cmd_scan(self, chat_id: int):
        """全币种扫描"""
        self.tg.send_message("🔍 正在扫描全部币种...", chat_id)

        results = []
        lines = ["📊 *H\\_V3 全币种扫描*\n"]

        for sym in SYMBOLS:
            result = scan_symbol(sym)
            results.append(result)

            if result.get("error"):
                lines.append(f"❌ {sym}: {result.get('message', '未知错误')}")
                continue

            # 方向 emoji
            dir_map = {"long": "🟢 做多", "short": "🔴 做空", "neutral": "⚪ 观望"}
            direction = dir_map.get(result["direction"], "⚪ 未知")

            lines.append(
                f"*{sym}* | {direction} | "
                f"评分:{result['score']} | "
                f"H:{result['hurst']:.3f} | "
                f"RSI:{result['rsi']:.0f}"
            )

            if result["direction"] != "neutral":
                lines.append(
                    f"  入场:{result['entry_price']:,.2f} "
                    f"止盈:{result['tp_price']:,.2f} "
                    f"止损:{result['sl_price']:,.2f}"
                )

        lines.append(f"\n⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        self.tg.send_message("\n".join(lines), chat_id)

    def cmd_signal(self, chat_id: int):
        """推送最佳信号"""
        self.tg.send_message("🎯 正在寻找最佳交易机会...", chat_id)

        best = None
        best_score = 0

        for sym in SYMBOLS:
            result = scan_symbol(sym)
            if result.get("error"):
                continue
            score = abs(result.get("score", 0))
            if score > best_score and result["direction"] != "neutral":
                best_score = score
                best = result

        if not best:
            self.tg.send_message("当前无明确交易信号，建议观望。", chat_id)
            return

        dir_cn = "做多 🟢" if best["direction"] == "long" else "做空 🔴"
        msg = f"""🎯 *最佳信号: {best['symbol']}*

方向: {dir_cn}
评分: {best['score']}/5
入场: {best['entry_price']:,.2f} USDT
止盈: {best['tp_price']:,.2f} USDT
止损: {best['sl_price']:,.2f} USDT

*指标数据:*
赫斯特: {best['hurst']:.4f} ({best['market_state']})
RSI: {best['rsi']:.1f}
ATR: {best['atr']:.2f}
风险: {best['risk_level']}

理由: {best['reason']}

⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}
🏷️ H\\_V3 Engine"""
        self.tg.send_message(msg, chat_id)

    def cmd_symbol(self, symbol: str, chat_id: int):
        """单币种分析"""
        self.tg.send_message(f"🔍 正在分析 {symbol}...", chat_id)

        result = scan_symbol(symbol)
        if result.get("error"):
            self.tg.send_message(f"❌ {symbol} 分析失败: {result.get('message')}", chat_id)
            return

        dir_map = {"long": "做多 🟢", "short": "做空 🔴", "neutral": "观望 ⚪"}
        direction = dir_map.get(result["direction"], "未知")

        msg = f"""📈 *{symbol} ({result.get('name', '')}) 分析*

方向: {direction}
评分: {result['score']}/5
当前价: {result['entry_price']:,.2f} USDT"""

        if result["direction"] != "neutral":
            msg += f"""
止盈: {result['tp_price']:,.2f} USDT
止损: {result['sl_price']:,.2f} USDT"""

        msg += f"""

*技术指标:*
赫斯特: {result['hurst']:.4f} ({result['market_state']})
RSI: {result['rsi']:.1f}
EMA: fast={result['ema_fast']:,.2f} / slow={result['ema_slow']:,.2f}
MACD柱: {result['macd_histogram']:.4f}
ATR: {result['atr']:.2f}
风险: {result['risk_level']}

理由: {result['reason']}

⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}
🏷️ H\\_V3 Engine | MCP Protocol"""
        self.tg.send_message(msg, chat_id)

    def cmd_sentiment(self, chat_id: int):
        """市场情绪分析"""
        self.tg.send_message("🧠 正在分析市场情绪...", chat_id)

        # 先获取行情数据作为上下文
        tickers = get_tickers(["BTC", "ETH", "SOL"])
        context_parts = []
        for sym, data in tickers.items():
            if not data.get("error"):
                context_parts.append(f"{sym}: ${data['last_price']:,.0f} ({data['change_24h']:+.1f}%)")

        context = ", ".join(context_parts)
        result = analyze_sentiment("BTC", market_context=context)

        if result.get("error"):
            self.tg.send_message(f"❌ 情绪分析失败", chat_id)
            return

        # 情绪 emoji
        score = result.get("score", 0)
        if score >= 0.5:
            emoji = "🟢"
        elif score >= 0.2:
            emoji = "🟡"
        elif score >= -0.2:
            emoji = "⚪"
        elif score >= -0.5:
            emoji = "🟠"
        else:
            emoji = "🔴"

        msg = f"""🧠 *市场情绪分析*

{emoji} 情绪: {result.get('label', '中性')} ({score:+.2f})
置信度: {result.get('confidence', 0):.0%}

{result.get('summary', '')}

*关键因素:*
"""
        for factor in result.get("key_factors", [])[:5]:
            msg += f"• {factor}\n"

        msg += f"\n🏷️ H\\_V3 AI | {result.get('provider', 'Grok')}"
        self.tg.send_message(msg, chat_id)

    def cmd_status(self, chat_id: int):
        """系统状态"""
        uptime = time.time() - START_TIME
        hours = int(uptime // 3600)
        minutes = int((uptime % 3600) // 60)

        msg = f"""⚙️ *H\\_V3 系统状态*

运行时间: {hours}h {minutes}m
进程 PID: {os.getpid()}
架构: MCP Protocol
传输: stdio (同进程)

*MCP Servers:*
• OKX Market: 🟢 在线
• Engine: 🟢 在线
• AI ({list_providers().get('grok', {}).get('name', 'Grok')}): 🟢 在线

*配置:*
扫描周期: {SCAN_INTERVAL // 3600}h
监控币种: {', '.join(SYMBOLS)}
推送群: {TELEGRAM_CHAT_ID}"""
        self.tg.send_message(msg, chat_id)

    def cmd_version(self, chat_id: int):
        msg = """🐬 *H\\_V3 | Dolphin AI Strategy Engine*

版本: 3.0.0
架构: MCP Protocol (Model Context Protocol)
引擎: 多因子评分 + 赫斯特指数
AI: Grok (可热切换 DeepSeek/OpenAI)
数据: OKX V5 API

*MCP Servers:*
• h\\_v3\\_mcp\\_okx\\_market (行情)
• h\\_v3\\_mcp\\_engine (技术面)
• h\\_v3\\_mcp\\_ai (AI对话)

*设计理念:*
插拔式架构，任何模块可秒级替换"""
        self.tg.send_message(msg, chat_id)

    def cmd_providers(self, chat_id: int):
        """列出 AI 模型提供商"""
        providers = list_providers()
        lines = ["🤖 *AI 模型提供商*\n"]
        for key, info in providers.items():
            if info["is_active"]:
                status = "✅ 当前使用"
            elif info["available"]:
                status = "🟢 可用"
            else:
                status = "⚪ 未配置"
            lines.append(f"*{info['name']}*: {status}")
            lines.append(f"  模型: `{info['models']['default']}`")
        self.tg.send_message("\n".join(lines), chat_id)

    # ============================================================
    # AI 对话处理
    # ============================================================

    def handle_ai_chat(self, text: str, chat_id: int):
        """处理非命令消息：AI 对话（自动注入引擎数据）"""
        # 检测用户提到的币种
        detected_symbol = self._detect_symbol(text)

        # 如果检测到币种，先获取引擎数据
        engine_data = None
        if detected_symbol:
            engine_data = scan_symbol(detected_symbol)
            if engine_data.get("error"):
                engine_data = None

        # 调用 AI 对话
        result = chat(text, engine_data=engine_data)
        response = result.get("response", "抱歉，AI 暂时无法回答。")

        # 构建回复（加水印）
        watermark = self._build_watermark(engine_data, result)
        full_response = f"{response}\n\n{watermark}"

        self.tg.send_message(full_response, chat_id)

    def _detect_symbol(self, text: str) -> str:
        """从用户消息中检测币种"""
        text_lower = text.lower()
        for symbol, aliases in SYMBOL_ALIASES.items():
            for alias in aliases:
                if alias in text_lower:
                    return symbol
        return ""

    def _build_watermark(self, engine_data: dict, ai_result: dict) -> str:
        """构建引擎数据水印"""
        parts = [f"🏷️ H\\_V3 | {ai_result.get('provider', 'Grok')}"]

        if engine_data and not engine_data.get("error"):
            parts.append(
                f"📊 {engine_data['symbol']} | "
                f"H:{engine_data['hurst']:.3f} | "
                f"RSI:{engine_data['rsi']:.0f} | "
                f"Score:{engine_data['score']}"
            )
        return "\n".join(parts)


# ============================================================
# 定时扫描线程
# ============================================================

class SchedulerThread(threading.Thread):
    """定时扫描并推送信号"""

    def __init__(self, telegram: TelegramClient):
        super().__init__(daemon=True)
        self.tg = telegram
        self.running = True

    def run(self):
        print("[调度] 定时扫描线程已启动")
        while self.running:
            time.sleep(SCAN_INTERVAL)
            if not self.running:
                break
            try:
                self._scheduled_scan()
            except Exception as e:
                print(f"[调度错误] {e}")

    def _scheduled_scan(self):
        """执行定时扫描"""
        print(f"[调度] 开始定时扫描 {datetime.now().strftime('%H:%M')}")

        results = []
        for sym in SYMBOLS:
            result = scan_symbol(sym)
            results.append(result)

        # 只推送有明确信号的
        signals = [r for r in results if not r.get("error") and r.get("direction") != "neutral"]

        if signals:
            lines = ["⏰ *定时信号推送*\n"]
            for s in signals:
                dir_cn = "🟢做多" if s["direction"] == "long" else "🔴做空"
                lines.append(
                    f"*{s['symbol']}* {dir_cn} | "
                    f"评分:{s['score']} | "
                    f"入场:{s['entry_price']:,.2f} | "
                    f"TP:{s['tp_price']:,.2f} | "
                    f"SL:{s['sl_price']:,.2f}"
                )
            lines.append(f"\n🏷️ H\\_V3 Engine | {datetime.now().strftime('%H:%M')}")
            self.tg.send_message("\n".join(lines))

    def stop(self):
        self.running = False


# ============================================================
# 主程序
# ============================================================

START_TIME = time.time()


def main():
    # 1. 获取进程锁
    lock_fp = acquire_lock()

    # 2. 初始化
    print("=" * 60)
    print("  🐬 H_V3 | Dolphin AI Strategy Engine")
    print("  版本: 3.0.0")
    print("  架构: MCP Protocol")
    print(f"  AI: {list_providers().get('grok', {}).get('name', 'Grok')}")
    print(f"  币种: {', '.join(SYMBOLS)}")
    print("=" * 60)

    telegram = TelegramClient(TELEGRAM_TOKEN)
    router = CommandRouter(telegram)
    scheduler = SchedulerThread(telegram)

    # 3. 优雅退出
    def shutdown(signum, frame):
        print("\n[退出] 收到终止信号，正在清理...")
        scheduler.stop()
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    # 4. 启动定时扫描
    scheduler.start()
    print("[启动] 定时扫描线程已启动")

    # 5. 开始消息循环
    print("[启动] 开始监听消息...")
    while True:
        updates = telegram.get_updates()
        for update in updates:
            telegram.offset = update["update_id"] + 1

            msg = update.get("message", {})
            text = msg.get("text", "").strip()
            chat_id = msg.get("chat", {}).get("id")

            if not text or not chat_id:
                continue

            # 打印日志
            user = msg.get("from", {}).get("first_name", "未知")
            print(f"[收到] {user}: {text[:50]}")

            # 路由处理
            if text.startswith("/"):
                router.route(text, chat_id, text)
            else:
                router.route("", chat_id, text)


if __name__ == "__main__":
    main()
