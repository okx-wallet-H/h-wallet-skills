#!/usr/bin/env node
/**
 * H Wallet MCP Server
 * 
 * Model Context Protocol server that exposes H Wallet Skills as tools
 * for AI Agents (Claude, GPT, Manus, etc.) to call.
 * 
 * Protocol: JSON-RPC 2.0 over stdio
 * Spec: https://modelcontextprotocol.io
 */

import { RestClient, OnchainClient, resolveConfig } from '@h-wallet/core';
import * as readline from 'readline';

// ─── Tool Registry ───────────────────────────────────────────────────────────

interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  handler: (params: Record<string, any>) => Promise<any>;
}

const cex = new RestClient(resolveConfig());
const onchain = new OnchainClient();

const tools: ToolDef[] = [
  // ─── H_v1: CEX Market ─────────────────────────────────────────────────────
  {
    name: 'h_v1_market_ticker',
    description: '获取永续合约实时行情（价格、24h涨跌、成交量）',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/market/ticker', { instId: p.instId }),
  },
  {
    name: 'h_v1_market_candles',
    description: '获取永续合约K线数据',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
        bar: { type: 'string', description: 'K线周期: 1m/5m/15m/1H/4H/1D', enum: ['1m', '5m', '15m', '1H', '4H', '1D'] },
        limit: { type: 'string', description: '返回数量，默认100' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/market/candles', { instId: p.instId, bar: p.bar || '1H', limit: p.limit || '100' }),
  },
  {
    name: 'h_v1_market_funding_rate',
    description: '获取永续合约当前资金费率',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/public/funding-rate', { instId: p.instId }),
  },
  {
    name: 'h_v1_market_open_interest',
    description: '获取永续合约持仓量（Open Interest）',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/public/open-interest', { instId: p.instId }),
  },
  {
    name: 'h_v1_market_depth',
    description: '获取永续合约订单簿深度',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
        sz: { type: 'string', description: '深度档位数，默认20' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/market/books', { instId: p.instId, sz: p.sz || '20' }),
  },

  // ─── H_v1: CEX Account ────────────────────────────────────────────────────
  {
    name: 'h_v1_account_balance',
    description: '获取交易账户余额（需要API Key认证）',
    inputSchema: {
      type: 'object',
      properties: {
        ccy: { type: 'string', description: '币种筛选，如 USDT,BTC' },
      },
      required: [],
    },
    handler: async (p) => cex.privateGet('/api/v5/account/balance', p.ccy ? { ccy: p.ccy } : {}),
  },
  {
    name: 'h_v1_account_positions',
    description: '获取当前持仓列表（需要API Key认证）',
    inputSchema: {
      type: 'object',
      properties: {
        instType: { type: 'string', description: '产品类型', enum: ['SWAP', 'FUTURES', 'OPTION'] },
        instId: { type: 'string', description: '合约ID筛选' },
      },
      required: [],
    },
    handler: async (p) => {
      const params: any = {};
      if (p.instType) params.instType = p.instType;
      if (p.instId) params.instId = p.instId;
      return cex.privateGet('/api/v5/account/positions', params);
    },
  },

  // ─── H_v1: CEX Trade ──────────────────────────────────────────────────────
  {
    name: 'h_v1_swap_place_order',
    description: '永续合约下单（开多/开空/平多/平空）',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
        tdMode: { type: 'string', description: '保证金模式', enum: ['cross', 'isolated'] },
        side: { type: 'string', description: '方向', enum: ['buy', 'sell'] },
        posSide: { type: 'string', description: '持仓方向（双向持仓时必填）', enum: ['long', 'short', 'net'] },
        ordType: { type: 'string', description: '订单类型', enum: ['market', 'limit', 'post_only', 'fok', 'ioc'] },
        sz: { type: 'string', description: '委托数量（张）' },
        px: { type: 'string', description: '委托价格（限价单必填）' },
      },
      required: ['instId', 'tdMode', 'side', 'ordType', 'sz'],
    },
    handler: async (p) => {
      const body: any = { instId: p.instId, tdMode: p.tdMode, side: p.side, ordType: p.ordType, sz: p.sz };
      if (p.posSide) body.posSide = p.posSide;
      if (p.px) body.px = p.px;
      return cex.privatePost('/api/v5/trade/order', body);
    },
  },
  {
    name: 'h_v1_swap_close_position',
    description: '一键平仓指定合约的所有持仓',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
        mgnMode: { type: 'string', description: '保证金模式', enum: ['cross', 'isolated'] },
        posSide: { type: 'string', description: '持仓方向', enum: ['long', 'short', 'net'] },
      },
      required: ['instId', 'mgnMode'],
    },
    handler: async (p) => {
      const body: any = { instId: p.instId, mgnMode: p.mgnMode };
      if (p.posSide) body.posSide = p.posSide;
      return cex.privatePost('/api/v5/trade/close-position', body);
    },
  },

  // ─── H_v1: Grid Bot ────────────────────────────────────────────────────────
  {
    name: 'h_v1_grid_ai_params',
    description: '获取AI推荐的网格策略参数',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/tradingBot/grid/ai-param', { algoOrdType: 'contract_grid', instId: p.instId }),
  },
  {
    name: 'h_v1_grid_create',
    description: '创建合约网格策略',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID' },
        algoOrdType: { type: 'string', description: '网格类型', enum: ['grid', 'contract_grid'] },
        maxPx: { type: 'string', description: '区间最高价' },
        minPx: { type: 'string', description: '区间最低价' },
        gridNum: { type: 'string', description: '网格数量' },
        lever: { type: 'string', description: '杠杆倍数' },
        sz: { type: 'string', description: '投入金额(USDT)' },
        direction: { type: 'string', description: '方向', enum: ['long', 'short', 'neutral'] },
        tpRatio: { type: 'string', description: '止盈比例，如 0.3 表示30%' },
      },
      required: ['instId', 'algoOrdType', 'maxPx', 'minPx', 'gridNum', 'sz'],
    },
    handler: async (p) => {
      const body: any = { ...p };
      if (!body.lever) body.lever = '5';
      if (!body.direction) body.direction = 'neutral';
      if (!body.tpRatio) body.tpRatio = '0.3';
      return cex.privatePost('/api/v5/tradingBot/grid/order-algo', body);
    },
  },

  // ─── H_v1: Signal ──────────────────────────────────────────────────────────
  {
    name: 'h_v1_signal_traders',
    description: '获取聪明钱交易员排行榜',
    inputSchema: {
      type: 'object',
      properties: {
        instId: { type: 'string', description: '合约ID，如 BTC-USDT-SWAP' },
      },
      required: ['instId'],
    },
    handler: async (p) => cex.publicGet('/api/v5/rubik/stat/contracts-long-short-account-ratio', { instId: p.instId }),
  },

  // ─── H_v2: Agentic Wallet ─────────────────────────────────────────────────
  {
    name: 'h_v2_wallet_status',
    description: '查询链上智能钱包状态',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => onchain.walletStatus(),
  },
  {
    name: 'h_v2_wallet_login',
    description: '通过邮箱发送OTP验证码登录/注册链上钱包',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: '邮箱地址' },
      },
      required: ['email'],
    },
    handler: async (p) => onchain.walletLogin(p.email),
  },
  {
    name: 'h_v2_wallet_verify',
    description: '验证OTP完成登录（新用户自动创建钱包）',
    inputSchema: {
      type: 'object',
      properties: {
        otp: { type: 'string', description: '6位验证码' },
      },
      required: ['otp'],
    },
    handler: async (p) => onchain.walletVerify(p.otp),
  },
  {
    name: 'h_v2_wallet_balance',
    description: '查询链上钱包余额（支持多链）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID: 1(ETH)/56(BSC)/501(SOL)/196(X Layer)' },
      },
      required: [],
    },
    handler: async (p) => onchain.walletBalance(p.chain),
  },
  {
    name: 'h_v2_wallet_send',
    description: '链上转账',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        to: { type: 'string', description: '接收地址' },
        amount: { type: 'string', description: '金额' },
        token: { type: 'string', description: '代币合约地址（原生币可不填）' },
      },
      required: ['chain', 'to', 'amount'],
    },
    handler: async (p) => onchain.walletSend(p.chain, p.to, p.amount, p.token),
  },

  // ─── H_v2: Meme Market ────────────────────────────────────────────────────
  {
    name: 'h_v2_meme_trending',
    description: '获取链上热门Meme代币列表（按交易量和市值排序）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID: 501(Solana)/1(ETH)/56(BSC)' },
      },
      required: ['chain'],
    },
    handler: async (p) => onchain.tokenHotTokens(p.chain),
  },
  {
    name: 'h_v2_meme_analyze',
    description: '深度分析指定Meme代币（持有人、流动性、交易历史）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        address: { type: 'string', description: '代币合约地址' },
      },
      required: ['chain', 'address'],
    },
    handler: async (p) => onchain.workflowTokenResearch(p.chain, { address: p.address }),
  },

  // ─── H_v2: Meme Sniper ────────────────────────────────────────────────────
  {
    name: 'h_v2_sniper_scan',
    description: '扫描代币安全性（貔貅盘检测）+ 获取报价',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        address: { type: 'string', description: '代币合约地址' },
        amount: { type: 'string', description: '买入金额(USDT)' },
      },
      required: ['chain', 'address', 'amount'],
    },
    handler: async (p) => {
      const security = onchain.securityTokenScan(p.chain, p.address);
      const quote = onchain.swapQuote(p.chain, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', p.address, p.amount);
      return { security, quote };
    },
  },
  {
    name: 'h_v2_sniper_execute',
    description: '执行Meme代币买入（自动安全检查+DEX兑换）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        address: { type: 'string', description: '代币合约地址' },
        amount: { type: 'string', description: '买入金额' },
        slippage: { type: 'string', description: '滑点容忍度，默认0.05(5%)' },
      },
      required: ['chain', 'address', 'amount'],
    },
    handler: async (p) => onchain.swapExecute(p.chain, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', p.address, p.amount, p.slippage || '0.05'),
  },

  // ─── H_v2: Security ───────────────────────────────────────────────────────
  {
    name: 'h_v2_security_token_scan',
    description: '扫描代币合约安全性（蜜罐/貔貅盘检测）',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        address: { type: 'string', description: '代币合约地址' },
      },
      required: ['chain', 'address'],
    },
    handler: async (p) => onchain.securityTokenScan(p.chain, p.address),
  },
  {
    name: 'h_v2_security_approvals',
    description: '查询钱包的代币授权列表',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: '链ID' },
        address: { type: 'string', description: '钱包地址' },
      },
      required: ['chain', 'address'],
    },
    handler: async (p) => onchain.securityApprovals(p.chain, p.address),
  },

  // ─── H_v2: Smart Switch ───────────────────────────────────────────────────
  {
    name: 'h_v2_switch_assess',
    description: '评估当前市场环境，推荐最优策略（网格/DCA/狙击）',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const btcTicker = await cex.publicGet('/api/v5/market/ticker', { instId: 'BTC-USDT-SWAP' });
      const funding = await cex.publicGet('/api/v5/public/funding-rate', { instId: 'BTC-USDT-SWAP' });
      const memeHot = onchain.tokenHotTokens('501');
      return { btcTicker, funding, memeHot, recommendation: '根据市场数据综合判断最优策略' };
    },
  },
];

// ─── MCP Protocol Handler ────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

function sendResponse(res: JsonRpcResponse): void {
  const msg = JSON.stringify(res);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

function handleRequest(req: JsonRpcRequest): JsonRpcResponse {
  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'h-wallet-mcp', version: '1.0.0' },
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };

    case 'tools/call':
      // Handled async below
      return { jsonrpc: '2.0', id: req.id, result: null };

    default:
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32601, message: `Method not found: ${req.method}` },
      };
  }
}

async function handleToolCall(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { name, arguments: args } = req.params || {};
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32602, message: `Unknown tool: ${name}` },
    };
  }
  try {
    const result = await tool.handler(args || {});
    return {
      jsonrpc: '2.0',
      id: req.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      },
    };
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      result: {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true,
      },
    };
  }
}

// ─── Stdio Transport ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // If --list-tools flag, print tools and exit (for debugging)
  if (process.argv.includes('--list-tools')) {
    console.log(JSON.stringify(tools.map(t => ({ name: t.name, description: t.description })), null, 2));
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin });
  let buffer = '';
  let contentLength = -1;

  rl.on('line', async (line) => {
    if (line.startsWith('Content-Length:')) {
      contentLength = parseInt(line.slice(15).trim(), 10);
      return;
    }
    if (line.trim() === '' && contentLength > 0) {
      // Next chunk is the body
      return;
    }
    if (contentLength > 0) {
      buffer += line;
      if (Buffer.byteLength(buffer) >= contentLength) {
        try {
          const req: JsonRpcRequest = JSON.parse(buffer);
          let res: JsonRpcResponse;
          if (req.method === 'tools/call') {
            res = await handleToolCall(req);
          } else {
            res = handleRequest(req);
          }
          sendResponse(res);
        } catch (e: any) {
          sendResponse({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: `Parse error: ${e.message}` },
          });
        }
        buffer = '';
        contentLength = -1;
      }
    }
  });

  // Also support newline-delimited JSON (simpler mode)
  process.stdin.on('data', async (chunk) => {
    const lines = chunk.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      if (line.startsWith('{')) {
        try {
          const req: JsonRpcRequest = JSON.parse(line);
          let res: JsonRpcResponse;
          if (req.method === 'tools/call') {
            res = await handleToolCall(req);
          } else {
            res = handleRequest(req);
          }
          console.log(JSON.stringify(res));
        } catch { /* ignore non-JSON lines */ }
      }
    }
  });

  process.stderr.write('H Wallet MCP Server v1.0.0 started (stdio mode)\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
