# H_V3 MCP Backtest Server

基于 MCP 协议封装 VectorBT Pro 回测引擎，提供标准化的策略回测、参数优化、绩效分析服务。

## 定位

H_V3 引擎链路中的**回测验证环节**：

```
数据采集 → 指标计算 → 信号生成 → [回测验证] → AI 决策 → 推送执行
```

## 依赖

- Python 3.11+
- vectorbtpro >= 2026.4.x（付费版，需 License）
- numpy, pandas
- mcp SDK

## MCP Tools

### 1. `run_backtest`

运行单次策略回测。

**参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| symbol | str | "BTC" | 交易对符号 |
| timeframe | str | "1H" | K线周期 |
| days | int | 180 | 回测天数 |
| rsi_buy | int | 35 | RSI 买入阈值 |
| rsi_sell | int | 70 | RSI 卖出阈值 |
| hurst_threshold | float | 0.5 | 赫斯特阈值 |
| init_cash | float | 10000 | 初始资金 |
| direction | str | "longonly" | 交易方向 |

**返回：** 完整绩效报告（收益率、最大回撤、夏普比率、胜率、Alpha 等）

### 2. `optimize_params`

网格搜索参数优化。

**参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| symbol | str | "BTC" | 交易对 |
| rsi_buy_range | list[int] | [25,30,35,40,45] | RSI买入搜索范围 |
| rsi_sell_range | list[int] | [60,65,70,75,80] | RSI卖出搜索范围 |
| hurst_range | list[float] | [0.40,0.45,0.50,0.55,0.60] | 赫斯特搜索范围 |
| optimize_target | str | "sharpe" | 优化目标 |

**返回：** 最优参数组合 + TOP 5 结果

### 3. `get_performance`

快速获取策略绩效概览（含评级和风险评估）。

### 4. `compare_strategies`

对比多币种在同一策略下的表现，输出排名。

## 策略逻辑

**多因子趋势跟踪策略：**

做多条件（全部满足）：
1. RSI < rsi_buy（超卖区）
2. EMA20 > EMA50 或 价格 > EMA20（上升趋势）
3. MACD 柱状图 > 0 或转正（动量确认）
4. 赫斯特指数 > hurst_threshold（趋势市才交易）

平仓条件（满足任一）：
1. RSI > rsi_sell（超买区）
2. EMA20 < EMA50 且 价格 < EMA20（趋势反转）

## 使用示例

```python
# 作为 MCP Client 调用
result = await client.call_tool("run_backtest", {
    "symbol": "BTC",
    "timeframe": "1H",
    "days": 180
})

# 参数优化
best = await client.call_tool("optimize_params", {
    "symbol": "ETH",
    "optimize_target": "sharpe"
})
```

## 部署

```bash
# 确保 VectorBT Pro 已安装
pip install vectorbtpro

# 作为 MCP Server 运行
python3.11 h_v3_mcp_backtest.py
```

## 与 H_V3 Bot 集成

Bot 可在以下场景调用回测 Server：
1. 用户发送 `/backtest BTC` → 调用 `run_backtest`
2. 定时任务每周自动回测 → 调用 `get_performance`
3. 用户问"哪个币策略表现最好" → 调用 `compare_strategies`
4. 参数调优 → 调用 `optimize_params`

## 注意事项

- VectorBT Pro 是付费软件，不要将 License Key 提交到公开仓库
- 回测结果仅供参考，历史表现不代表未来收益
- 建议定期（每周）重新回测，监控策略衰减
