# H-V3 Bot (MCP Client / 编排中心)

## 概述

H_V3 的主调度中心，作为 MCP Client 连接所有 MCP Server（OKX Market / Engine / AI），并通过 Telegram Bot 与用户交互。自身不包含任何业务逻辑计算，所有能力通过调用 MCP Server 的 Tools 实现。

## 架构角色

**层级：** 编排层 (MCP Client)  
**职责：** 命令路由、消息监听、进程锁、定时调度  
**文件：** `h_v3_bot.py`

## 核心特性

### 进程锁（防多实例）

使用 `fcntl.flock` 文件锁，启动时获取排他锁。第二个实例尝试启动时立即报错退出，彻底杜绝 Telegram 409 冲突。

### 命令路由

| 命令 | 功能 | 调用的 MCP Server |
|------|------|-------------------|
| `/scan` | 全币种扫描 | Engine.scan_symbol × 5 |
| `/signal` | 最佳交易信号 | Engine.scan_symbol × 5 |
| `/btc` `/eth` `/sol` `/doge` `/okb` | 单币种分析 | Engine.scan_symbol |
| `/sentiment` | 市场情绪 | OKX Market + AI.analyze_sentiment |
| `/status` | 系统状态 | AI.list_providers |
| `/version` | 版本信息 | - |
| `/providers` | AI 模型列表 | AI.list_providers |
| 自由文本 | AI 对话 | Engine.scan_symbol + AI.chat |

### AI 对话流程

```
用户消息 → 检测币种 → 调用 Engine 获取数据 → 注入 AI 上下文 → AI 回答 → 加水印 → 推送
```

### 定时扫描

每 4 小时自动扫描所有币种，有明确信号时推送到群。

## systemd 服务

```ini
[Unit]
Description=H_V3 Dolphin AI Strategy Engine (MCP Protocol)
After=network-online.target
StartLimitIntervalSec=300
StartLimitBurst=5

[Service]
Type=simple
WorkingDirectory=/root/h_v3
ExecStart=/usr/bin/python3.11 /root/h_v3/h_v3_bot.py
Restart=on-failure
RestartSec=30
```

## 运维命令

```bash
systemctl start h_v3     # 启动
systemctl stop h_v3      # 停止
systemctl restart h_v3   # 重启
systemctl status h_v3    # 状态
tail -f /tmp/h_v3.log    # 实时日志
```

## 部署位置

- VPS: `/root/h_v3/h_v3_bot.py`
- 服务: `/etc/systemd/system/h_v3.service`
- 日志: `/tmp/h_v3.log`
- PID: `/tmp/h_v3_bot.pid`
