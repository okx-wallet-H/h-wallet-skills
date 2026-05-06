"""
H V3 Bot 推送层 (Bot Layer)
================================
四层架构第四层：Telegram Bot 信号推送

四层完整串联：
  数据接口层(h_v3_data_api) → 策略引擎(h_v3_strategy) → 回测验证(h_v3_backtest) → Bot推送

功能：
1. 固定时间推送（北京时间 0/4/8/12/16/20 点）
2. /signal 命令手动获取信号
3. /status 查看系统状态
4. AI分析（Grok/DeepSeek）
5. 信号附带回测绩效数据
"""

import os
import sys
import json
import time
import asyncio
import logging
import traceback
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List

# 路径设置
sys.path.insert(0, '/home/ubuntu/h_v3')

import h_v3_data_api as data_api
import h_v3_strategy as strategy
import h_v3_backtest as backtest

from telegram import Update, Bot
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ContextTypes, filters
)

# ============================================================
# 配置
# ============================================================

BOT_TOKEN = "8597117850:AAEzp9Nr-y6RDS2zfCE-yr2xPxLfGFCr6dI"
CHAT_IDS = []  # 自动记录接收推送的chat_id
CHAT_IDS_FILE = "/home/ubuntu/h_v3/chat_ids.json"

# 北京时间推送时间（UTC+8）
PUSH_HOURS_BJT = [0, 4, 8, 12, 16, 20]

# AI分析配置
GROK_API_KEY = os.environ.get("GROK_API_KEY", "")
AI_SYSTEM_PROMPT = """你是专业的加密货币合约交易分析师。基于提供的多维度数据，给出简洁的市场分析。
规则：
- 不要称呼用户
- 直接给出分析结论
- 用1-2句话总结方向和理由
- 如果信号不明确，直接说观望
- 不要废话，不要客套"""

# 日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [Bot] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/h_v3/bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("h_v3_bot")


# ============================================================
# 格式化输出
# ============================================================

def format_signal_message(signal: strategy.Signal, bt_result=None) -> str:
    """
    格式化信号推送消息
    简洁分割线 + Markdown标题 + ⭐️星级
    观望时不显示0值价格
    """
    symbol = signal.symbol
    direction = signal.direction
    strength = signal.strength
    confidence = signal.confidence

    # 方向中文
    dir_map = {"long": "📈 做多", "short": "📉 做空", "neutral": "⏸ 观望"}
    dir_text = dir_map.get(direction, "⏸ 观望")

    # 星级
    stars = "⭐️" * confidence if confidence > 0 and direction != "neutral" else ""

    lines = []
    lines.append(f"*{symbol}/USDT 永续*")
    lines.append("─" * 20)
    lines.append(f"方向: {dir_text} {stars}")
    lines.append(f"强度: {strength:+.2f}")

    # 价格信息（观望时不显示止损止盈）
    if signal.entry_price:
        lines.append(f"价格: ${signal.entry_price:,.1f}")

    if direction != "neutral":
        if signal.stop_loss:
            lines.append(f"止损: ${signal.stop_loss:,.1f}")
        if signal.take_profit_1:
            lines.append(f"止盈1: ${signal.take_profit_1:,.1f}")
        if signal.take_profit_2:
            lines.append(f"止盈2: ${signal.take_profit_2:,.1f}")
        lines.append(f"杠杆: {signal.leverage_suggest}x")

    # 因子得分
    lines.append("")
    lines.append("─" * 20)
    lines.append("*因子明细*")
    if signal.factor_scores:
        for name, score in signal.factor_scores.items():
            name_cn = {
                "trend": "趋势",
                "momentum": "动量",
                "macd": "MACD",
                "bollinger": "布林",
                "money_flow": "资金流",
                "market_structure": "市场结构",
                "smart_money": "聪明钱",
                "multi_tf": "多TF",
            }.get(name, name)
            indicator = "🟢" if score > 0.3 else "🔴" if score < -0.3 else "⚪"
            lines.append(f"  {indicator} {name_cn}: {score:+.2f}")

    # 关键数据
    if signal.summary:
        lines.append("")
        lines.append("─" * 20)
        lines.append("*关键数据*")
        s = signal.summary
        if s.get("rsi"):
            lines.append(f"  RSI: {s['rsi']:.1f}")
        if s.get("supertrend"):
            lines.append(f"  SuperTrend: {s['supertrend']}")
        if s.get("funding_rate") is not None:
            fr = s["funding_rate"]
            lines.append(f"  资金费率: {fr*100:.4f}%")
        if s.get("smart_money"):
            lines.append(f"  聪明钱: {s['smart_money']}")
        if s.get("long_ratio"):
            lines.append(f"  散户多空: {s['long_ratio']:.0%}/{1-s['long_ratio']:.0%}")

    # 回测绩效
    if bt_result:
        lines.append("")
        lines.append("─" * 20)
        lines.append("*历史绩效*")
        lines.append(f"  {bt_result.summary_text}")
        lines.append(f"  ({bt_result.period_days}天/{bt_result.total_trades}笔)")

    # 时间戳
    bjt = datetime.now(timezone(timedelta(hours=8)))
    lines.append("")
    lines.append(f"_{bjt.strftime('%m/%d %H:%M')} BJT | v3.1_")

    return "\n".join(lines)


def format_status_message() -> str:
    """格式化系统状态消息"""
    status = data_api.get_status()
    lines = []
    lines.append("*系统状态*")
    lines.append("─" * 20)
    lines.append(f"数据层: {'🟢 运行中' if status.get('running') else '🔴 停止'}")
    lines.append(f"监控币种: {', '.join(status.get('symbols', []))}")

    if status.get("cache_ages"):
        lines.append("")
        lines.append("*缓存状态*")
        for sym, age in status["cache_ages"].items():
            fresh = "🟢" if age < 300 else "🟡" if age < 600 else "🔴"
            lines.append(f"  {fresh} {sym}: {age}s ago")

    lines.append("")
    lines.append("*架构*")
    lines.append("  L1: 数据接口层 (OKX CLI)")
    lines.append("  L2: 策略引擎 (8因子)")
    lines.append("  L3: 回测验证 (VBT PRO)")
    lines.append("  L4: Bot推送 (Telegram)")

    return "\n".join(lines)


# ============================================================
# Bot命令处理
# ============================================================

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理 /start 命令"""
    chat_id = update.effective_chat.id
    _save_chat_id(chat_id)
    await update.message.reply_text(
        "*H V3 AI合约策略信号系统*\n"
        "─" * 20 + "\n"
        "四层架构已上线：\n"
        "  L1: 数据接口层\n"
        "  L2: 策略引擎(8因子)\n"
        "  L3: 回测验证\n"
        "  L4: Bot推送\n\n"
        "命令:\n"
        "  /signal [币种] - 获取信号\n"
        "  /all - 全部币种信号\n"
        "  /status - 系统状态\n"
        "  /backtest [币种] - 回测\n\n"
        f"推送时间: BJT {'/'.join(str(h) for h in PUSH_HOURS_BJT)}点",
        parse_mode="Markdown"
    )


async def cmd_signal(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理 /signal 命令"""
    chat_id = update.effective_chat.id
    _save_chat_id(chat_id)

    # 解析币种
    args = context.args
    symbol = args[0].upper() if args else "BTC"

    await update.message.reply_text(f"正在分析 {symbol}...")

    try:
        # 从数据接口层获取数据
        data = data_api.get_data(symbol)
        if not data:
            # 尝试强制刷新
            data = data_api.force_refresh(symbol)

        if not data:
            await update.message.reply_text(f"⚠️ {symbol} 数据不可用，请稍后重试")
            return

        # 策略引擎分析
        signal = strategy.analyze(symbol, data)

        # 获取回测绩效
        bt_result = backtest.get_backtester().get_cached_result(symbol, 90)
        if not bt_result:
            bt_result = backtest.get_backtester().get_cached_result(f"{symbol}_quick")

        # 格式化并发送
        msg = format_signal_message(signal, bt_result)
        await update.message.reply_text(msg, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Signal error: {e}\n{traceback.format_exc()}")
        await update.message.reply_text(f"⚠️ 分析出错: {str(e)[:100]}")


async def cmd_all(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理 /all 命令 - 全部币种信号"""
    chat_id = update.effective_chat.id
    _save_chat_id(chat_id)

    await update.message.reply_text("正在分析全部币种...")

    for symbol in data_api.SYMBOLS:
        try:
            data = data_api.get_data(symbol)
            if not data:
                continue
            signal = strategy.analyze(symbol, data)
            bt_result = backtest.get_backtester().get_cached_result(symbol, 90)
            if not bt_result:
                bt_result = backtest.get_backtester().get_cached_result(f"{symbol}_quick")
            msg = format_signal_message(signal, bt_result)
            await update.message.reply_text(msg, parse_mode="Markdown")
            await asyncio.sleep(0.5)
        except Exception as e:
            logger.error(f"All signal error for {symbol}: {e}")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理 /status 命令"""
    _save_chat_id(update.effective_chat.id)
    msg = format_status_message()
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_backtest(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理 /backtest 命令"""
    _save_chat_id(update.effective_chat.id)
    args = context.args
    symbol = args[0].upper() if args else "BTC"

    await update.message.reply_text(f"正在回测 {symbol}...")

    try:
        result = backtest.run_quick(symbol)
        if result:
            lines = [
                f"*{symbol} 回测结果*",
                "─" * 20,
                f"周期: {result.period_days}天",
                f"交易数: {result.total_trades}",
                f"胜率: {result.win_rate*100:.1f}%",
                f"盈亏比: {result.profit_factor:.2f}",
                f"平均收益: {result.avg_return_pct:.2f}%",
                f"最大回撤: {result.max_drawdown_pct:.1f}%",
                f"Sharpe: {result.sharpe_ratio:.2f}",
                f"总收益: {result.total_return_pct:.2f}%",
            ]
            await update.message.reply_text("\n".join(lines), parse_mode="Markdown")
        else:
            await update.message.reply_text("⚠️ 回测失败，数据不足")
    except Exception as e:
        logger.error(f"Backtest error: {e}")
        await update.message.reply_text(f"⚠️ 回测出错: {str(e)[:100]}")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """处理普通消息（AI分析）"""
    chat_id = update.effective_chat.id
    _save_chat_id(chat_id)
    text = update.message.text.strip()

    # 简单关键词匹配
    symbol = None
    for s in data_api.SYMBOLS:
        if s.lower() in text.lower():
            symbol = s
            break

    if not symbol:
        symbol = "BTC"

    # 获取数据和信号
    data = data_api.get_data(symbol)
    if data:
        signal = strategy.analyze(symbol, data)
        msg = format_signal_message(signal)
        await update.message.reply_text(msg, parse_mode="Markdown")
    else:
        await update.message.reply_text(f"数据加载中，请稍后使用 /signal {symbol}")


# ============================================================
# 定时推送
# ============================================================

async def scheduled_push(context: ContextTypes.DEFAULT_TYPE):
    """定时推送信号"""
    bjt_now = datetime.now(timezone(timedelta(hours=8)))
    current_hour = bjt_now.hour

    if current_hour not in PUSH_HOURS_BJT:
        return

    logger.info(f"Scheduled push at BJT {current_hour}:00")

    chat_ids = _load_chat_ids()
    if not chat_ids:
        logger.warning("No chat_ids for push")
        return

    for symbol in data_api.SYMBOLS:
        try:
            data = data_api.get_data(symbol)
            if not data:
                continue

            signal = strategy.analyze(symbol, data)

            # 只推送有方向的信号（非观望）或BTC/ETH（始终推送）
            if signal.direction == "neutral" and symbol not in ["BTC", "ETH"]:
                continue

            bt_result = backtest.get_backtester().get_cached_result(symbol, 90)
            if not bt_result:
                bt_result = backtest.get_backtester().get_cached_result(f"{symbol}_quick")

            msg = format_signal_message(signal, bt_result)

            for chat_id in chat_ids:
                try:
                    await context.bot.send_message(
                        chat_id=chat_id, text=msg, parse_mode="Markdown"
                    )
                except Exception as e:
                    logger.error(f"Push to {chat_id} failed: {e}")

            await asyncio.sleep(1)

        except Exception as e:
            logger.error(f"Push error for {symbol}: {e}")


# ============================================================
# 工具函数
# ============================================================

def _save_chat_id(chat_id: int):
    """保存chat_id"""
    global CHAT_IDS
    if chat_id not in CHAT_IDS:
        CHAT_IDS.append(chat_id)
        try:
            with open(CHAT_IDS_FILE, 'w') as f:
                json.dump(CHAT_IDS, f)
        except Exception:
            pass


def _load_chat_ids() -> List[int]:
    """加载chat_ids"""
    global CHAT_IDS
    try:
        if os.path.exists(CHAT_IDS_FILE):
            with open(CHAT_IDS_FILE, 'r') as f:
                CHAT_IDS = json.load(f)
    except Exception:
        pass
    return CHAT_IDS


# ============================================================
# 主入口
# ============================================================

def main():
    """启动Bot"""
    logger.info("=" * 50)
    logger.info("H V3 AI合约策略信号系统 启动")
    logger.info("四层架构: DataAPI → Strategy → Backtest → Bot")
    logger.info("=" * 50)

    # 加载chat_ids
    _load_chat_ids()

    # 初始化数据接口层（启动后台缓存）
    logger.info("初始化数据接口层...")
    data_api.init()

    # 初始化回测层
    logger.info("初始化回测层...")
    backtest.get_backtester()

    # 等待首次数据加载
    logger.info("等待首次数据加载（约30秒）...")
    time.sleep(5)  # 给数据层一点时间开始拉取

    # 创建Bot
    app = Application.builder().token(BOT_TOKEN).build()

    # 注册命令
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("signal", cmd_signal))
    app.add_handler(CommandHandler("all", cmd_all))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("backtest", cmd_backtest))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # 定时任务：每小时检查是否需要推送
    job_queue = app.job_queue
    job_queue.run_repeating(scheduled_push, interval=3600, first=60)

    # 启动时运行一次快速回测（异步）
    async def init_backtest(context):
        logger.info("Running initial quick backtest...")
        for symbol in ["BTC", "ETH"]:
            try:
                backtest.run_quick(symbol)
                logger.info(f"Quick backtest done for {symbol}")
            except Exception as e:
                logger.error(f"Init backtest error: {e}")

    job_queue.run_once(init_backtest, when=30)

    logger.info("Bot started, polling...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
