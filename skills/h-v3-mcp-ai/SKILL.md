# H-V3 MCP AI Server

## 概述

基于 MCP 协议封装的大模型对话与情绪分析服务。支持多模型热切换（Grok / DeepSeek / OpenAI），通过修改一行配置即可秒级切换底层 AI 模型，上层业务代码无需任何改动。

## 架构角色

**层级：** 能力层 (MCP Server)  
**协议：** MCP stdio 传输  
**当前模型：** Grok (grok-3-mini-fast)  
**文件：** `h_v3_mcp_ai.py`

## MCP Tools

| Tool | 参数 | 返回 | 说明 |
|------|------|------|------|
| `chat` | query, engine_data, provider | response, model, provider | AI 对话（自动注入引擎数据） |
| `analyze_sentiment` | symbol, market_context | score, label, factors | 市场情绪分析 |
| `summarize_market` | symbols_data[] | summary, top_opportunity | 多币种市场总结 |
| `switch_provider` | provider | 切换确认 | 动态切换 AI 模型 |
| `list_providers` | - | 所有提供商状态 | 查看可用模型 |

## 热切换机制

### 支持的提供商

| 提供商 | 模型 | 状态 |
|--------|------|------|
| Grok | grok-3-mini-fast | ✅ 已配置 |
| DeepSeek | deepseek-chat / deepseek-reasoner | ⚪ 待配置 |
| OpenAI | gpt-4o-mini / gpt-4o | ⚪ 待配置 |

### 切换方式

```python
# 方式1: 修改配置文件
ACTIVE_AI_PROVIDER = "deepseek"  # 改这一行

# 方式2: 运行时动态切换
from h_v3_mcp_ai import switch_provider
switch_provider("deepseek")
```

## AI 人设

**交易顾问（代号"海豚"）：**
- 基于引擎实时数据给出专业交易建议
- 回答简洁精准，控制在 200 字以内
- 必须包含具体数字（价格、百分比）
- 止盈止损必须给出具体价位

## 使用方式

```python
from h_v3_mcp_ai import chat, analyze_sentiment

# AI 对话（注入引擎数据）
result = chat("ETH能做多吗？", engine_data=scan_result)
print(result["response"])

# 情绪分析
sentiment = analyze_sentiment("BTC", "BTC突破81000")
print(f"情绪: {sentiment['label']} ({sentiment['score']:+.2f})")
```

## MCP Resources

- `config://ai_providers` - 返回 AI 提供商配置（隐藏 Key）

## 部署位置

- VPS: `/root/h_v3/h_v3_mcp_ai.py`
