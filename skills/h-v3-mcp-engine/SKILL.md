# H-V3 MCP Engine Server

## 概述

基于 MCP 协议封装的技术面指标计算引擎。接收标准化 K 线数据，输出赫斯特指数、RSI、EMA、MACD、布林带、ATR 等指标，以及多因子评分和交易信号（含具体止盈止损价位）。

## 架构角色

**层级：** 能力层 (MCP Server)  
**协议：** MCP stdio 传输  
**计算：** 纯 Python 实现，无外部依赖  
**文件：** `h_v3_mcp_engine.py`

## MCP Tools

| Tool | 参数 | 返回 | 说明 |
|------|------|------|------|
| `calculate_hurst` | closes[], max_lag | hurst, market_state | 赫斯特指数（R/S 法） |
| `calculate_indicators` | candles[] | 全套指标字典 | RSI/EMA/MACD/ATR/BB |
| `generate_signal` | candles[] | direction, score, tp, sl | 多因子交易信号 |
| `scan_symbol` | symbol, timeframe | 完整扫描结果 | 高级 Tool（含数据获取） |

## 多因子评分模型

| 因子 | 权重 | 做多条件 | 做空条件 |
|------|------|----------|----------|
| EMA 交叉 | 1.5 | 金叉 | 死叉 |
| RSI | 1.0 | < 30 超卖 | > 70 超买 |
| MACD 柱状图 | 1.0 | 正值 | 负值 |
| 布林带位置 | 0.5 | 跌破下轨 | 突破上轨 |
| 赫斯特趋势确认 | 1.0 | H>0.6 且金叉 | H>0.6 且死叉 |

**信号阈值：** 净分 >= 3 做多 / <= -3 做空

## 止盈止损计算

- 止损 = 入场价 ± 1.5 × ATR
- 止盈 = 入场价 ± 2.5 × ATR

## 赫斯特指数解读

| 范围 | 状态 | 策略建议 |
|------|------|----------|
| H >= 0.7 | 强趋势 | 趋势跟踪 |
| 0.6 <= H < 0.7 | 弱趋势 | 顺势操作 |
| 0.4 <= H < 0.6 | 随机 | 降低仓位 |
| H < 0.4 | 均值回归 | 反转策略 |

## 使用方式

```python
from h_v3_mcp_engine import scan_symbol, generate_signal

# 单币种完整扫描
result = scan_symbol("BTC", "4H")
print(f"方向: {result['direction']}, 评分: {result['score']}")
print(f"入场: {result['entry_price']}, TP: {result['tp_price']}, SL: {result['sl_price']}")
```

## MCP Resources

- `config://engine_params` - 返回引擎参数配置

## 部署位置

- VPS: `/root/h_v3/h_v3_mcp_engine.py`
