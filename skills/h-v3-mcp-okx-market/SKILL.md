# H-V3 MCP OKX Market Server

## 概述

基于 MCP (Model Context Protocol) 协议封装的 OKX V5 行情数据服务。提供标准化的实时行情、K线、深度、资金费率等数据接口，可被任何 MCP Client 无缝调用。

## 架构角色

**层级：** 能力层 (MCP Server)  
**协议：** MCP stdio 传输  
**数据源：** OKX V5 REST API  
**文件：** `h_v3_mcp_okx_market.py`

## MCP Tools

| Tool | 参数 | 返回 | 说明 |
|------|------|------|------|
| `get_ticker` | symbol: str | price, change_24h, volume | 单币种实时行情 |
| `get_tickers` | symbols: list[str] | 批量行情字典 | 多币种批量查询 |
| `get_klines` | symbol, timeframe, limit | candles[] | K线历史数据 |
| `get_orderbook` | symbol, depth | bids[], asks[] | 盘口深度 |
| `get_funding_rate` | symbol | rate, next_rate, time | 永续合约资金费率 |

## 支持的交易对

- BTC-USDT-SWAP（比特币永续）
- ETH-USDT-SWAP（以太坊永续）
- SOL-USDT-SWAP（Solana 永续）
- DOGE-USDT-SWAP（狗狗币永续）
- OKB-USDT-SWAP（OKB 永续）

## 使用方式

### 同进程直接调用

```python
from h_v3_mcp_okx_market import get_ticker, get_klines

ticker = get_ticker("BTC")
klines = get_klines("ETH", "4H", 200)
```

### MCP stdio 协议调用

```bash
python3.11 h_v3_mcp_okx_market.py
```

## 热切换说明

如需切换到 Binance 数据源，只需编写 `h_v3_mcp_binance_market.py` 实现相同的 Tool 接口签名即可，主程序无需修改。

## 依赖

- Python 3.11+
- MCP SDK (`pip install mcp`)
- 无需额外依赖（使用 urllib 标准库）

## 部署位置

- VPS: `/root/h_v3/h_v3_mcp_okx_market.py`
