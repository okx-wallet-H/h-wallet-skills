/**
 * onchainos CLI TypeScript Wrapper
 *
 * 封装 onchainos CLI (v3.0.0) 的调用，为 H_v2 链上模块提供统一的执行接口。
 * onchainos 是 OKX Onchain OS 的官方 Rust 二进制工具，通过 execSync 调用。
 *
 * 环境变量要求：
 *   OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE, OKX_PROJECT_ID
 */

import { execSync } from "child_process";
import { HWalletError, AuthenticationError, NetworkError } from "../utils/errors.js";

// ─── Types ───────────────────────────────────────────────────────────

export interface OnchainResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface OnchainClientOptions {
  apiKey?: string;
  secretKey?: string;
  passphrase?: string;
  projectId?: string;
  baseUrl?: string;
  timeout?: number; // ms, default 30000
}

// ─── Client ──────────────────────────────────────────────────────────

export class OnchainClient {
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private projectId: string;
  private baseUrl?: string;
  private timeout: number;
  private binPath: string;

  constructor(opts: OnchainClientOptions = {}) {
    this.apiKey = opts.apiKey || process.env.OKX_API_KEY || "";
    this.secretKey = opts.secretKey || process.env.OKX_SECRET_KEY || "";
    this.passphrase = opts.passphrase || process.env.OKX_PASSPHRASE || "";
    this.projectId = opts.projectId || process.env.OKX_PROJECT_ID || "";
    this.baseUrl = opts.baseUrl;
    this.timeout = opts.timeout || 30000;
    this.binPath = `${process.env.HOME}/.local/bin/onchainos`;
  }

  /**
   * 构造 onchainos 执行环境
   */
  private getEnv(): Record<string, string> {
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      OKX_API_KEY: this.apiKey,
      OKX_SECRET_KEY: this.secretKey,
      OKX_PASSPHRASE: this.passphrase,
      OKX_PROJECT_ID: this.projectId,
    };
    return env;
  }

  /**
   * 执行 onchainos CLI 命令并返回解析后的 JSON
   */
  exec<T = any>(args: string): OnchainResult<T> {
    const baseUrlFlag = this.baseUrl ? ` --base-url ${this.baseUrl}` : "";
    const cmd = `${this.binPath}${baseUrlFlag} ${args}`;

    try {
      const result = execSync(cmd, {
        env: this.getEnv(),
        encoding: "utf-8",
        timeout: this.timeout,
        stdio: ["pipe", "pipe", "pipe"],
      });

      try {
        return JSON.parse(result.trim());
      } catch {
        // 非 JSON 输出，包装为结果
        return { ok: true, data: result.trim() as any };
      }
    } catch (err: any) {
      const output = err.stdout || err.stderr || err.message || "";

      // 尝试解析错误输出中的 JSON
      try {
        const parsed = JSON.parse(output.trim());
        if (parsed.ok === false) {
          return parsed;
        }
        return { ok: false, error: output.trim() };
      } catch {
        // 检查常见错误类型
        if (output.includes("401") || output.includes("Unauthorized")) {
          throw new AuthenticationError("Onchain OS 认证失败，请检查 API Key 配置");
        }
        if (output.includes("ENOTFOUND") || output.includes("timeout")) {
          throw new NetworkError("无法连接到 Onchain OS 服务");
        }
        if (output.includes("unexpected argument")) {
          return { ok: false, error: `参数错误: ${output.trim()}` };
        }
        return { ok: false, error: output.trim() || "Unknown error" };
      }
    }
  
  }
  // ─── Wallet Commands ─────────────────────────────────────────────

  walletStatus(): OnchainResult {
    return this.exec("wallet status");
  }

  walletLogin(email: string): OnchainResult {
    return this.exec(`wallet login ${email}`);
  }

  walletVerify(otp: string): OnchainResult {
    return this.exec(`wallet verify ${otp}`);
  }

  walletCreate(name: string): OnchainResult {
    return this.exec(`wallet create --name "${name}"`);
  }

  walletAccounts(): OnchainResult {
    return this.exec("wallet accounts");
  }

  walletSwitch(accountId: string): OnchainResult {
    return this.exec(`wallet switch --account-id ${accountId}`);
  }

  walletAddresses(): OnchainResult {
    return this.exec("wallet addresses");
  }

  walletBalance(chain?: string): OnchainResult {
    const chainFlag = chain ? ` --chain ${chain}` : "";
    return this.exec(`wallet balance${chainFlag}`);
  }

  walletSend(chain: string, to: string, amount: string, token?: string): OnchainResult {
    const tokenFlag = token ? ` --token ${token}` : "";
    return this.exec(`wallet send --chain ${chain} --to ${to} --amount ${amount}${tokenFlag}`);
  }

  walletLogout(): OnchainResult {
    return this.exec("wallet logout");
  }

  // ─── Market Commands ─────────────────────────────────────────────

  marketPrice(chain: string, address: string): OnchainResult {
    return this.exec(`market price --chain ${chain} --address ${address}`);
  }

  marketKline(chain: string, address: string, bar?: string, limit?: number): OnchainResult {
    let args = `market kline --chain ${chain} --address ${address}`;
    if (bar) args += ` --bar ${bar}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  // ─── Token Commands ──────────────────────────────────────────────

  tokenSearch(query: string, chain?: string): OnchainResult {
    let args = `token search --query "${query}"`;
    if (chain) args += ` --chain ${chain}`;
    return this.exec(args);
  }

  tokenInfo(chain: string, address: string): OnchainResult {
    return this.exec(`token info --chain ${chain} --address ${address}`);
  }

  tokenHotTokens(chain: string, limit?: number): OnchainResult {
    let args = `token hot-tokens --chain ${chain}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  tokenAdvancedInfo(chain: string, address: string): OnchainResult {
    return this.exec(`token advanced-info --chain ${chain} --address ${address}`);
  }

  tokenHolders(chain: string, address: string): OnchainResult {
    return this.exec(`token holders --chain ${chain} --address ${address}`);
  }

  tokenTopTrader(chain: string, address: string): OnchainResult {
    return this.exec(`token top-trader --chain ${chain} --address ${address}`);
  }

  tokenTrades(chain: string, address: string, limit?: number): OnchainResult {
    let args = `token trades --chain ${chain} --address ${address}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  tokenClusterOverview(chain: string, address: string): OnchainResult {
    return this.exec(`token cluster-overview --chain ${chain} --address ${address}`);
  }

  tokenReport(chain: string, address: string): OnchainResult {
    return this.exec(`token report --chain ${chain} --address ${address}`);
  }

  tokenPriceInfo(chain: string, address: string): OnchainResult {
    return this.exec(`token price-info --chain ${chain} --address ${address}`);
  }

  tokenLiquidity(chain: string, address: string): OnchainResult {
    return this.exec(`token liquidity --chain ${chain} --address ${address}`);
  }

  // ─── Memepump Commands ───────────────────────────────────────────

  memepumpChains(): OnchainResult {
    return this.exec("memepump chains");
  }

  memepumpTokens(chain: string): OnchainResult {
    return this.exec(`memepump tokens --chain ${chain}`);
  }

  memepumpTokenDetails(chain: string, address: string): OnchainResult {
    return this.exec(`memepump token-details --chain ${chain} --address ${address}`);
  }

  memepumpTokenDevInfo(chain: string, address: string): OnchainResult {
    return this.exec(`memepump token-dev-info --chain ${chain} --address ${address}`);
  }

  memepumpSimilarTokens(chain: string, address: string): OnchainResult {
    return this.exec(`memepump similar-tokens --chain ${chain} --address ${address}`);
  }

  memepumpBundleInfo(chain: string, address: string): OnchainResult {
    return this.exec(`memepump token-bundle-info --chain ${chain} --address ${address}`);
  }

  memepumpApedWallet(chain: string, address: string): OnchainResult {
    return this.exec(`memepump aped-wallet --chain ${chain} --address ${address}`);
  }

  // ─── Signal Commands ─────────────────────────────────────────────

  signalChains(): OnchainResult {
    return this.exec("signal chains");
  }

  signalList(chain: string, limit?: number): OnchainResult {
    let args = `signal list --chain ${chain}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  // ─── Leaderboard Commands ────────────────────────────────────────

  leaderboard(chain: string, period?: string, limit?: number): OnchainResult {
    let args = `leaderboard --chain ${chain}`;
    if (period) args += ` --period ${period}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  // ─── Swap Commands ───────────────────────────────────────────────

  swapChains(): OnchainResult {
    return this.exec("swap chains");
  }

  swapTokens(chain: string): OnchainResult {
    return this.exec(`swap tokens --chain ${chain}`);
  }

  swapQuote(chain: string, fromToken: string, toToken: string, amount: string): OnchainResult {
    return this.exec(`swap quote --chain ${chain} --from-token ${fromToken} --to-token ${toToken} --amount ${amount}`);
  }

  swapExecute(chain: string, fromToken: string, toToken: string, amount: string, slippage?: string): OnchainResult {
    let args = `swap execute --chain ${chain} --from-token ${fromToken} --to-token ${toToken} --amount ${amount}`;
    if (slippage) args += ` --slippage ${slippage}`;
    return this.exec(args);
  }

  swapStatus(chain: string, txHash: string): OnchainResult {
    return this.exec(`swap status --chain ${chain} --tx-hash ${txHash}`);
  }

  // ─── Security Commands ───────────────────────────────────────────

  securityTokenScan(chain: string, address: string): OnchainResult {
    return this.exec(`security token-scan --chain ${chain} --address ${address}`);
  }

  securityDappScan(url: string): OnchainResult {
    return this.exec(`security dapp-scan --url "${url}"`);
  }

  securityTxScan(chain: string, txData: string): OnchainResult {
    return this.exec(`security tx-scan --chain ${chain} --tx-data '${txData}'`);
  }

  securityApprovals(chain: string, address: string): OnchainResult {
    return this.exec(`security approvals --chain ${chain} --address ${address}`);
  }

  // ─── Payment Commands ────────────────────────────────────────────

  paymentX402(args: string): OnchainResult {
    return this.exec(`payment x402-pay ${args}`);
  }

  paymentDefault(asset?: string): OnchainResult {
    const assetFlag = asset ? ` --asset ${asset}` : "";
    return this.exec(`payment default${assetFlag}`);
  }

  // ─── Cross-Chain Commands ────────────────────────────────────────

  crossChainQuote(fromChain: string, toChain: string, fromToken: string, toToken: string, amount: string): OnchainResult {
    return this.exec(`cross-chain quote --from-chain ${fromChain} --to-chain ${toChain} --from-token ${fromToken} --to-token ${toToken} --amount ${amount}`);
  }

  crossChainExecute(fromChain: string, toChain: string, fromToken: string, toToken: string, amount: string): OnchainResult {
    return this.exec(`cross-chain execute --from-chain ${fromChain} --to-chain ${toChain} --from-token ${fromToken} --to-token ${toToken} --amount ${amount}`);
  }

  crossChainStatus(txHash?: string, orderId?: string): OnchainResult {
    if (txHash) return this.exec(`cross-chain status --tx-hash ${txHash}`);
    if (orderId) return this.exec(`cross-chain status --order-id ${orderId}`);
    return { ok: false, error: "需要提供 --tx-hash 或 --order-id" };
  }

  // ─── DeFi Commands ───────────────────────────────────────────────

  defiProtocols(chain: string): OnchainResult {
    return this.exec(`defi protocols --chain ${chain}`);
  }

  defiProducts(chain: string, protocol?: string): OnchainResult {
    let args = `defi products --chain ${chain}`;
    if (protocol) args += ` --protocol ${protocol}`;
    return this.exec(args);
  }

  defiPositions(chain: string, address: string): OnchainResult {
    return this.exec(`defi positions --chain ${chain} --address ${address}`);
  }

  // ─── Workflow Commands ───────────────────────────────────────────

  workflowTokenResearch(chain: string, opts: { address?: string; query?: string }): OnchainResult {
    let args = `workflow token-research --chain ${chain}`;
    if (opts.address) args += ` --address ${opts.address}`;
    if (opts.query) args += ` --query "${opts.query}"`;
    return this.exec(args);
  }

  workflowSmartMoney(chain: string): OnchainResult {
    return this.exec(`workflow smart-money --chain ${chain}`);
  }

  workflowNewTokens(chain: string): OnchainResult {
    return this.exec(`workflow new-tokens --chain ${chain}`);
  }

  workflowWalletAnalysis(chain: string, address: string): OnchainResult {
    return this.exec(`workflow wallet-analysis --chain ${chain} --address ${address}`);
  }

  workflowPortfolio(chain?: string): OnchainResult {
    const chainFlag = chain ? ` --chain ${chain}` : "";
    return this.exec(`workflow portfolio${chainFlag}`);
  }

  // ─── Gateway Commands ────────────────────────────────────────────

  gatewayGas(chain: string): OnchainResult {
    return this.exec(`gateway gas --chain ${chain}`);
  }

  gatewaySimulate(chain: string, txData: string): OnchainResult {
    return this.exec(`gateway simulate --chain ${chain} --tx-data '${txData}'`);
  }

  gatewayBroadcast(chain: string, signedTx: string): OnchainResult {
    return this.exec(`gateway broadcast --chain ${chain} --signed-tx '${signedTx}'`);
  }

  // ─── Tracker Commands ────────────────────────────────────────────

  trackerActivities(chain: string, address: string, limit?: number): OnchainResult {
    let args = `tracker activities --chain ${chain} --address ${address}`;
    if (limit) args += ` --limit ${limit}`;
    return this.exec(args);
  }

  // ─── WebSocket Commands ──────────────────────────────────────────

  wsChannels(): OnchainResult {
    return this.exec("ws channels");
  }

  wsStart(channel: string, chain: string, params?: string): OnchainResult {
    let args = `ws start --channel ${channel} --chain ${chain}`;
    if (params) args += ` --params '${params}'`;
    return this.exec(args);
  }

  wsPoll(sessionId: string): OnchainResult {
    return this.exec(`ws poll --id ${sessionId}`);
  }

  wsStop(sessionId?: string): OnchainResult {
    const idFlag = sessionId ? ` --id ${sessionId}` : "";
    return this.exec(`ws stop${idFlag}`);
  }

  // ─── Additional Security Methods (for h-v2-security-guard) ────────
  securityContractScan(chain: string, address: string): OnchainResult {
    return this.exec(`security token-scan --chain ${chain} --address ${address}`);
  }
  securityApprovalList(chain: string): OnchainResult {
    // 需要钱包地址，使用 wallet addresses 获取后调用
    const addrs = this.walletAddresses();
    const addr = addrs.ok && Array.isArray(addrs.data) ? addrs.data[0]?.address : "";
    if (!addr) return { ok: false, error: "无法获取钱包地址" };
    return this.securityApprovals(chain, addr);
  }
  securityRevoke(chain: string, spender: string, token?: string): OnchainResult {
    let args = `security revoke --chain ${chain} --spender ${spender}`;
    if (token) args += ` --token ${token}`;
    return this.exec(args);
  }

  // x402 payment convenience methods
  x402Pay(url: string): OnchainResult {
    return this.exec(`payment x402 --url "${url}"`);
  }

  x402Check(url: string): OnchainResult {
    return this.exec(`payment x402 --url "${url}" --check`);
  }

  x402History(): OnchainResult {
    return this.exec('payment x402 --history');
  }

}
