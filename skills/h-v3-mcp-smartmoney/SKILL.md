# H_V3 MCP Smart Money Server

## 概述

聪明钱（Smart Money）MCP Server，封装 OKX Agent Trade Kit 的 Smart Money 数据，提供标准化的聪明钱分析能力。

## 架构角色

- **协议**: MCP (Model Context Protocol)
- **传输**: 同进程直接调用（可升级为 stdio/SSE）
- **数据源**: OKX Agent Trade Kit CLI (`okx smartmoney traders/trader`)
- **上游依赖**: Node.js + @okx_ai/okx-trade-mcp
- **下游消费者**: h_v3_mcp_engine.py（三维度交叉验证）

## 提供的 Tools

| Tool | 功能 | 参数 |
|------|------|------|
| `get_top_traders` | 聪明钱排行榜 Top N | period(7/30/90), limit, sort_type |
| `get_trader_positions` | 交易员持仓和最近交易 | author_id, period |
| `get_smart_money_consensus` | 指定币种的多空共识 | symbol, period, top_n |
| `get_smart_money_summary` | 一行式综合摘要（注入引擎） | symbol |

## 共识计算逻辑

1. 获取 Top N 交易员排行榜
2. 逐个查看前 5 名交易员的最近交易记录
3. 统计目标币种的最近一笔交易方向（buy/sell）
4. 计算多空比例，判断共识方向和信心度

**信心度判定规则：**
- `high`: 单方向占比 >= 70%
- `medium`: 单方向占比 >= 60%
- `low`: 无明显倾向

## 三维度整合权重

在 `h_v3_mcp_engine.py` 的 `scan_symbol()` 中：
- 技术面评分: 基础分数（-5 到 +5）
- 聪明钱加成: 最大 ±1.5 分
  - high 信心: ±1.5
  - medium 信心: ±1.0
  - low 信心: ±0.5
- 共振加分: 聪明钱方向与技术面一致时全额加分
- 对冲减分: 聪明钱方向与技术面相反时半额减分

## 部署要求

```bash
# VPS 上需要已安装 OKX Agent Trade Kit
npm install -g @okx_ai/okx-trade-mcp @okx_ai/okx-trade-cli

# 环境变量
export OKX_API_KEY="..."
export OKX_SECRET_KEY="..."
export OKX_PASSPHRASE="..."
```

## 文件清单

- `h_v3_mcp_smartmoney.py` — 聪明钱 MCP Server 主文件

## 测试

```bash
python3.11 h_v3_mcp_smartmoney.py BTC
# 输出：聪明钱共识方向、多空比、Top 3 交易员
```

## 品牌规范

- 对外展示: "聪明钱共识" / "机构级数据"
- 不暴露: OKX Agent Trade Kit、CLI 命令细节
- 水印格式: `聪明钱: 强共识做多 (80%多)`
