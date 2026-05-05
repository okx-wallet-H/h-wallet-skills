"""
H_V3 Config Center
====================
统一配置中心，所有 MCP Server 和 Bot 共享此配置。
修改此文件即可完成模块切换、参数调整。
"""

# ============================================================
# Telegram 配置
# ============================================================

TELEGRAM_TOKEN = "8597117850:AAEzp9Nr-y6RDS2zfCE-yr2xPxLfGFCr6dI"
TELEGRAM_CHAT_ID = -5164059069  # ai策略群

# ============================================================
# OKX V5 API 配置
# ============================================================

OKX_BASE_URL = "https://www.okx.com"
OKX_API_VERSION = "/api/v5"

# 交易所 API Key（行情接口无需鉴权，交易接口需要）
OKX_API_KEY = "6265ca38-5ede-4c96-9c06-63660bd927ea"
OKX_SECRET_KEY = "A17AEBF701FE326D15BED7B02EB3DED7"
OKX_PASSPHRASE = "Yy133678."

# OKX V6 Agent Wallet（链上 OS）
OKX_V6_API_KEY = "fa2743a9-6c01-4396-8231-c787203c0a8a"
OKX_V6_SECRET_KEY = "B1B441FCAE75D99CB3F04D2CD045BE67"
OKX_V6_PASSPHRASE = "Yy133678."
OKX_V6_PROJECT_ID = "e87193990d3f0b809d49fb409d691a10"

# ============================================================
# AI 模型配置（热切换核心）
# ============================================================

# 当前激活的提供商（改这一行即可切换）
ACTIVE_AI_PROVIDER = "grok"

AI_PROVIDERS = {
    "grok": {
        "name": "Grok",
        "base_url": "https://api.x.ai/v1/chat/completions",
        "api_key": "xai-1WhtkwcceJuaCoeFGanypFgfc78d0NWJ42K4JMWYoQkQuj5TxpGWyapKak1bx5p3VwXEucHVz34VXjPM",
        "models": {
            "fast": "grok-3-mini-fast",
            "reasoning": "grok-3-mini-fast",
            "default": "grok-3-mini-fast",
        },
        "timeout": 60,
        "max_tokens": 1000,
    },
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1/chat/completions",
        "api_key": "",  # 待配置
        "models": {
            "fast": "deepseek-chat",
            "reasoning": "deepseek-reasoner",
            "default": "deepseek-chat",
        },
        "timeout": 60,
        "max_tokens": 1000,
    },
    "openai": {
        "name": "OpenAI",
        "base_url": "https://api.openai.com/v1/chat/completions",
        "api_key": "",  # 待配置
        "models": {
            "fast": "gpt-4o-mini",
            "reasoning": "gpt-4o",
            "default": "gpt-4o-mini",
        },
        "timeout": 60,
        "max_tokens": 1000,
    },
}

# ============================================================
# 交易对配置
# ============================================================

TRADING_PAIRS = {
    "BTC": {"inst_id": "BTC-USDT-SWAP", "name": "比特币"},
    "ETH": {"inst_id": "ETH-USDT-SWAP", "name": "以太坊"},
    "SOL": {"inst_id": "SOL-USDT-SWAP", "name": "Solana"},
    "DOGE": {"inst_id": "DOGE-USDT-SWAP", "name": "狗狗币"},
    "OKB": {"inst_id": "OKB-USDT-SWAP", "name": "OKB"},
}

# ============================================================
# 引擎参数
# ============================================================

# 赫斯特指数
HURST_TREND_THRESHOLD = 0.6
HURST_MEAN_REVERT_THRESHOLD = 0.4

# 信号阈值
SIGNAL_THRESHOLD_LONG = 3
SIGNAL_THRESHOLD_SHORT = -3

# ATR 止盈止损倍数
ATR_SL_MULTIPLIER = 1.5
ATR_TP_MULTIPLIER = 2.5

# 定时扫描间隔（秒）
SCAN_INTERVAL = 4 * 3600

# ============================================================
# 系统配置
# ============================================================

PID_FILE = "/tmp/h_v3_bot.pid"
LOG_FILE = "/tmp/h_v3.log"
VERSION = "3.0.0"
