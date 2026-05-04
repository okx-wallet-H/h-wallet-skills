# H Wallet Skills 架构设计

H Wallet Skills 是一个深度集成 OKX V5 (CEX) 和 V6 (Onchain OS) 的模块化工具集。

## 核心架构
- **H_v1 (CEX)**: 对标 OKX V5，专注于中心化交易所业务，以永续合约交易和自动化策略（网格/DCA）为核心。
- **H_v2 (Web3)**: 对标 OKX V6 Onchain OS，专注于链上生态，以 Meme 币自动狙击、智能钱包和跨链操作为核心。

## 模块化设计
每个 Skill 都包含完整的命令参考、工作流指南和输出模板，确保 CLI 和 MCP 代理的一致性体验。
