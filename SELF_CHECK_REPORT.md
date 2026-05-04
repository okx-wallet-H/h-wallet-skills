# H Wallet Skills 业务逻辑自检报告

> 检验日期：2026-05-04
> 检验范围：12 个 Skill 的完整业务流程闭环

---

## 一、核心用户旅程验证

### 旅程 A：新用户注册 → CEX 合约交易

```
用户: "我是新用户，想做永续合约"

Step 1: [h-v1-wallet-auth] auth status → "not_logged_in"
Step 2: [h-v1-wallet-auth] config init → 引导输入邮箱+验证码+API Key
Step 3: [h-v1-wallet-auth] account balance → 确认 USDT 余额
Step 4: [h-v1-wallet-auth] account set-leverage → 设置杠杆
Step 5: [h-v1-perp-market] market ticker BTC-USDT-SWAP → 获取当前价格
Step 6: [h-v1-perp-trade] swap place → 开仓
Step 7: [h-v1-perp-trade] swap positions → 确认持仓
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | auth status 检测到未登录，引导 config init |
| 2→3 | ✅ 通过 | 配置完成后可查余额 |
| 3→4 | ✅ 通过 | 余额确认后设置杠杆 |
| 4→5 | ✅ 通过 | 杠杆设置后查行情 |
| 5→6 | ✅ 通过 | 行情确认后下单 |
| 6→7 | ✅ 通过 | 下单后确认持仓 |

**结论：✅ 完整闭环**

---

### 旅程 B：信号驱动交易

```
用户: "看看聪明钱怎么做的，跟着做"

Step 1: [h-v1-perp-signal] signal overview → 查看多币种聪明钱总览
Step 2: [h-v1-perp-signal] signal consensus --instId BTC-USDT-SWAP → 获取 BTC 共识
Step 3: [h-v1-perp-signal] traders --sort pnl → 查看顶级交易员
Step 4: [h-v1-perp-signal] trader --authorId xxx → 查看具体交易员持仓
Step 5: [h-v1-perp-market] market ticker BTC-USDT-SWAP → 确认当前价格
Step 6: [h-v1-perp-trade] swap place → 跟随开仓
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | overview 到单币种共识 |
| 2→3 | ✅ 通过 | 共识确认后看具体交易员 |
| 3→4 | ✅ 通过 | 排行榜到个人详情 |
| 4→5 | ✅ 通过 | 交易员持仓参考后确认价格 |
| 5→6 | ✅ 通过 | 价格确认后执行交易 |

**结论：✅ 完整闭环**

---

### 旅程 C：网格策略一键启动

```
用户: "帮我跑个 BTC 网格"

Step 1: [h-v1-wallet-auth] account balance → 确认余额
Step 2: [h-v1-perp-market] market ticker BTC-USDT-SWAP → 获取当前价
Step 3: [h-v1-perp-market] market candles --instId BTC-USDT-SWAP --bar 4H → 获取 K 线
Step 4: [h-v1-perp-grid] grid ai-params --instId BTC-USDT-SWAP → 获取 AI 推荐参数
Step 5: [h-v1-perp-grid] grid create → 创建网格（预优化参数 + 30% 止盈）
Step 6: [h-v1-perp-grid] grid status --botId xxx → 确认运行状态
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | 余额确认后查行情 |
| 2→3 | ✅ 通过 | 当前价后获取历史 K 线 |
| 3→4 | ✅ 通过 | K 线分析后获取 AI 参数 |
| 4→5 | ✅ 通过 | AI 参数直接用于创建 |
| 5→6 | ✅ 通过 | 创建后确认状态 |

**结论：✅ 完整闭环**

---

### 旅程 D：DCA 马丁格尔策略

```
用户: "ETH 跌了不少，帮我分批抄底"

Step 1: [h-v1-wallet-auth] account balance → 确认余额
Step 2: [h-v1-perp-market] market ticker ETH-USDT-SWAP → 当前价
Step 3: [h-v1-perp-signal] signal consensus --instId ETH-USDT-SWAP → 确认聪明钱方向
Step 4: [h-v1-perp-dca] dca ai-params --instId ETH-USDT-SWAP → AI 推荐参数
Step 5: [h-v1-perp-dca] dca create → 创建 DCA 策略
Step 6: [h-v1-perp-dca] dca status --botId xxx → 确认运行
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | |
| 2→3 | ✅ 通过 | |
| 3→4 | ✅ 通过 | 信号确认方向后获取参数 |
| 4→5 | ✅ 通过 | |
| 5→6 | ✅ 通过 | |

**结论：✅ 完整闭环**

---

### 旅程 E：Meme 币链上狙击（完整流程）

```
用户: "帮我冲个 Meme 币，100U"

Step 1: [h-v2-agentic-wallet] wallet status → 检查链上钱包状态
Step 2: [h-v2-agentic-wallet] wallet balance-detail --chain 501 → 确认 SOL 链 USDT 余额
Step 3: [h-v2-meme-market] meme trending --chain 501 → 发现热门 Meme
Step 4: [h-v2-meme-market] meme analyze --token xxx → 深度分析目标
Step 5: [h-v2-security-guard] security scan --token xxx --chain 501 → 安全扫描
Step 6: [h-v2-security-guard] security simulate --token xxx --chain 501 → 模拟买卖
Step 7: [h-v2-meme-sniper] sniper buy --token xxx --chain 501 --amount 100 → 执行买入
Step 8: [h-v2-meme-sniper] sniper positions → 确认持仓
Step 9: [h-v2-meme-sniper] sniper sell --positionId xxx → 止盈卖出
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | 钱包存在后查余额 |
| 2→3 | ✅ 通过 | 余额足够后发现目标 |
| 3→4 | ✅ 通过 | 热门列表到深度分析 |
| 4→5 | ✅ 通过 | 分析后强制安全扫描 |
| 5→6 | ✅ 通过 | 基础扫描后模拟交易 |
| 6→7 | ✅ 通过 | 安全通过后执行买入 |
| 7→8 | ✅ 通过 | 买入后确认持仓 |
| 8→9 | ✅ 通过 | 持仓确认后可卖出 |

**结论：✅ 完整闭环**

---

### 旅程 F：全自动智能切换

```
用户: "帮我全自动跑，500U"

Step 1: [h-v1-wallet-auth] account balance → 确认 CEX 余额
Step 2: [h-v2-agentic-wallet] wallet status → 确认链上钱包
Step 3: [h-v2-agentic-wallet] wallet balance-detail → 确认链上余额
Step 4: [h-v2-smart-switch] switch start --totalAmount 500 → 启动守护进程
Step 5: [DAEMON] 检测市场状态 → 调用 h-v1-perp-market + h-v1-perp-signal + h-v2-meme-market
Step 6: [DAEMON] 根据状态启动对应策略:
         - 震荡 → h-v1-perp-grid
         - 趋势 → h-v1-perp-dca
         - Meme热潮 → h-v2-meme-sniper
Step 7: [DAEMON] 状态变化时:
         - 停止当前策略
         - 资金调拨（CEX↔Onchain）
         - 启动新策略
Step 8: [h-v2-smart-switch] switch status → 用户查看状态
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | CEX 余额确认后检查链上 |
| 2→3 | ✅ 通过 | 钱包存在后查余额 |
| 3→4 | ✅ 通过 | 双端余额确认后启动 |
| 4→5 | ✅ 通过 | 启动后 daemon 调用市场数据 |
| 5→6 | ⚠️ 发现问题 | 资金调拨命令缺失（见下方） |
| 6→7 | ⚠️ 发现问题 | CEX→Onchain 提币命令未定义 |
| 7→8 | ✅ 通过 | 状态查询正常 |

**结论：⚠️ 存在断点（资金调拨）**

---

### 旅程 G：安全维护

```
用户: "帮我检查一下钱包安全"

Step 1: [h-v2-security-guard] security approvals → 查看所有授权
Step 2: [h-v2-security-guard] security approvals --riskOnly → 筛选高风险
Step 3: [h-v2-security-guard] security revoke-all --riskLevel high → 批量撤销
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | |
| 2→3 | ✅ 通过 | |

**结论：✅ 完整闭环**

---

### 旅程 H：自动支付配置

```
用户: "开启自动支付"

Step 1: [h-v2-agentic-wallet] wallet balance-detail --chain 196 → 确认 X Layer USDT
Step 2: [h-v2-auto-pay] autopay enable --dailyLimit 10 → 开启
Step 3: [h-v2-auto-pay] autopay status → 确认状态
Step 4: [RUNTIME] 策略运行时遇到 402 → 自动支付
Step 5: [h-v2-auto-pay] autopay history → 查看消费记录
```

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1→2 | ✅ 通过 | |
| 2→3 | ✅ 通过 | |
| 3→4 | ✅ 通过 | x402 流程文档完整 |
| 4→5 | ✅ 通过 | |

**结论：✅ 完整闭环**

---

## 二、跨 Skill 依赖关系验证

### 依赖图

```
h-v2-smart-switch (编排层)
├── h-v1-perp-market (数据源)
├── h-v1-perp-signal (信号源)
├── h-v2-meme-market (链上数据源)
├── h-v1-perp-grid (CEX策略)
├── h-v1-perp-dca (CEX策略)
├── h-v2-meme-sniper (链上策略)
│   ├── h-v2-security-guard (强制前置)
│   └── h-v2-agentic-wallet (钱包)
└── [资金调拨] ← ⚠️ 断点
    ├── h-v1-wallet-auth (CEX 端)
    └── h-v2-agentic-wallet (Onchain 端)
```

### 依赖验证结果

| 调用方 | 被调用方 | 接口是否匹配 | 状态 |
|--------|---------|-------------|------|
| smart-switch → perp-market | `market ticker`, `market candles` | ✅ 匹配 | 通过 |
| smart-switch → perp-signal | `signal consensus` | ✅ 匹配 | 通过 |
| smart-switch → meme-market | `meme trending` | ✅ 匹配 | 通过 |
| smart-switch → perp-grid | `grid create`, `grid stop` | ✅ 匹配 | 通过 |
| smart-switch → perp-dca | `dca create`, `dca stop` | ✅ 匹配 | 通过 |
| smart-switch → meme-sniper | `sniper buy`, `sniper sell-all` | ✅ 匹配 | 通过 |
| meme-sniper → security-guard | `security scan` | ✅ 匹配 | 通过 |
| meme-sniper → agentic-wallet | `wallet balance-detail` | ✅ 匹配 | 通过 |
| smart-switch → **CEX提币** | ❓ 未定义 | ❌ 缺失 | **断点** |
| smart-switch → **Onchain充值CEX** | ❓ 未定义 | ❌ 缺失 | **断点** |
| perp-trade → wallet-auth | `account balance`, `account set-leverage` | ✅ 匹配 | 通过 |
| perp-grid → wallet-auth | `account balance` | ✅ 匹配 | 通过 |
| auto-pay → agentic-wallet | `wallet balance-detail` | ✅ 匹配 | 通过 |

---

## 三、发现的问题清单

### 🔴 严重问题 (阻断业务流程)

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 1 | **CEX↔Onchain 资金调拨命令缺失** | `h-v2-smart-switch` | Smart Switch 需要在 CEX 和 Onchain 之间转移资金，但目前没有任何 Skill 提供"从 CEX 提币到链上地址"或"从链上充值到 CEX"的命令。`h-v1-wallet-auth` 的 `account transfer` 只支持 CEX 内部划转（资金账户↔交易账户），不支持提币/充值。 |

### 🟡 中等问题 (功能不完整但不阻断)

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 2 | **h-v1-wallet-auth 缺少充值/提币地址查询** | 旅程 F | 用户想从外部充值到 CEX 时，无法获取充值地址 |
| 3 | **h-v2-agentic-wallet 缺少"从 CEX 接收"的引导** | 旅程 F | 当 Smart Switch 需要从 CEX 转资金到链上时，需要知道 Agentic Wallet 的接收地址 |
| 4 | **h-v1-perp-market 缺少 RSI/ATR/MACD 计算** | `h-v2-smart-switch` | Smart Switch 依赖 RSI、ATR、MACD 来判断市场状态，但 perp-market 只提供原始 K 线数据，没有技术指标计算命令 |
| 5 | **h-v2-meme-market 缺少 DEX 总交易量汇总** | `h-v2-smart-switch` | Smart Switch 需要"Onchain DEX Volume"来判断是否进入 Meme Season，但 meme-market 只有单币种分析，缺少全链 DEX 交易量汇总 |

### 🟢 轻微问题 (体验优化)

| # | 问题 | 影响范围 | 详情 |
|---|------|---------|------|
| 6 | **h-v1-perp-trade 的 `swap open` 命令名不一致** | workflows.md | workflows.md 中 Manual Override 示例用了 `swap open`，但命令索引中是 `swap place` |
| 7 | **h-v2-smart-switch 的 Manual Override 示例命令不一致** | smart-switch | 示例中 `grid stop --botId xxx` 但 grid 的实际命令是 `h-wallet grid stop --botId xxx` |
| 8 | **缺少统一的错误码文档** | 全局 | 各 Skill 各自定义错误处理，但没有统一的错误码映射表 |

---

## 四、修复方案

### 修复 #1：新增 `h-v1-wallet-deposit` 命令组（或扩展 h-v1-wallet-auth）

在 `h-v1-wallet-auth` 中增加以下命令：

```
account deposit-address --ccy USDT --chain <chain>   → 获取 CEX 充值地址
account withdraw --ccy USDT --amt <n> --toAddr <addr> --chain <chain> → CEX 提币到链上
account withdraw-status --wdId <id>                  → 查询提币状态
account deposit-history                              → 充值记录
account withdraw-history                             → 提币记录
```

### 修复 #2：h-v1-perp-market 增加技术指标命令

```
market indicators --instId BTC-USDT-SWAP --bar 4H    → 返回 RSI, ATR, MACD, EMA
```

或者在 Smart Switch 内部自行计算（从 K 线数据推导），不依赖 market 模块。

### 修复 #3：h-v2-meme-market 增加全链 DEX 汇总

```
meme dex-volume --chain all --period 24h             → 返回各链 DEX 总交易量
```

### 修复 #4：命令名称一致性修正

- workflows.md 中 `swap open` → `swap place`
- smart-switch 中补全 `h-wallet` 前缀

---

## 五、总结

| 维度 | 评分 | 说明 |
|------|------|------|
| **H_v1 内部闭环** | ✅ 95% | 6 个 Skill 之间流程完整，仅缺充值/提币 |
| **H_v2 内部闭环** | ✅ 90% | 6 个 Skill 之间流程完整，缺 DEX 总量汇总 |
| **H_v1 ↔ H_v2 跨版本闭环** | ⚠️ 70% | 资金调拨是关键断点 |
| **命令一致性** | ⚠️ 85% | 少量命名不一致 |
| **参数完整性** | ✅ 95% | 参数表详尽 |
| **错误处理** | ✅ 90% | Edge Cases 覆盖良好 |
| **安全规则** | ✅ 95% | 安全门、限额、确认机制完整 |

### 最终结论

**H_v1 和 H_v2 各自内部的业务流程基本跑通**，但 **跨版本（CEX↔Onchain）的资金调拨是唯一的严重断点**。修复方案是在 `h-v1-wallet-auth` 中增加充值/提币命令组（5 个命令），并在 `h-v1-perp-market` 和 `h-v2-meme-market` 中补充 Smart Switch 所需的聚合数据命令。
