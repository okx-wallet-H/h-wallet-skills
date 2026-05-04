/**
 * Output formatting utilities for H Wallet CLI.
 * Supports JSON mode and human-readable table output.
 */

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  width?: number;
}

/**
 * Print data in JSON or table format based on global flag.
 */
export function printResult(data: unknown, json: boolean, columns?: TableColumn[]): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data) && columns) {
    printTable(data, columns);
  } else if (typeof data === 'object' && data !== null) {
    printKeyValue(data as Record<string, unknown>);
  } else {
    console.log(data);
  }
}

/**
 * Print key-value pairs in aligned format.
 */
export function printKeyValue(obj: Record<string, unknown>): void {
  const maxKeyLen = Math.max(...Object.keys(obj).map(k => k.length));

  for (const [key, value] of Object.entries(obj)) {
    const paddedKey = key.padEnd(maxKeyLen);
    const displayValue = formatValue(value);
    console.log(`  ${paddedKey}  ${displayValue}`);
  }
}

/**
 * Print array data as a formatted table.
 */
export function printTable(rows: Record<string, unknown>[], columns: TableColumn[]): void {
  if (rows.length === 0) {
    console.log('  (no data)');
    return;
  }

  // Calculate column widths
  const widths = columns.map(col => {
    const headerLen = col.label.length;
    const maxDataLen = Math.max(...rows.map(row => String(row[col.key] ?? '').length));
    return col.width ?? Math.max(headerLen, maxDataLen);
  });

  // Print header
  const header = columns.map((col, i) => col.label.padEnd(widths[i])).join('  ');
  console.log(`  ${header}`);
  console.log(`  ${columns.map((_, i) => '─'.repeat(widths[i])).join('  ')}`);

  // Print rows
  for (const row of rows) {
    const line = columns.map((col, i) => {
      const val = String(row[col.key] ?? '');
      return col.align === 'right' ? val.padStart(widths[i]) : val.padEnd(widths[i]);
    }).join('  ');
    console.log(`  ${line}`);
  }
}

/**
 * Print success message.
 */
export function printSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

/**
 * Print error message.
 */
export function printError(message: string, json = false): void {
  if (json) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(`✗ Error: ${message}`);
  }
}

/**
 * Print warning message.
 */
export function printWarning(message: string): void {
  console.warn(`⚠ ${message}`);
}

/**
 * Print the global help message.
 */
export function printHelp(): void {
  console.log(`
h-wallet — H Wallet Trade CLI v1.0.0

USAGE:
  h-wallet <command> <subcommand> [flags]

COMMAND GROUPS:
  auth        Authentication & login
  account     Account balance, positions, margin config
  market      Market data (tickers, candles, funding rates)
  swap        Perpetual swap trading (place/cancel/amend orders)
  grid        Grid bot strategy management
  dca         DCA / Martingale strategy management
  signal      Smart money signals & trader analysis
  meme        Meme coin market data (onchain)
  sniper      Meme coin auto-sniper (onchain)
  wallet      Agentic wallet management (onchain)
  security    Token security scanning & approval management
  switch      Smart strategy switching daemon
  autopay     x402 auto-payment configuration
  config      CLI configuration management

GLOBAL FLAGS:
  --json      Output in JSON format
  --profile   Select config profile (default: "default")
  --demo      Use demo/testnet mode

EXAMPLES:
  h-wallet account balance --json
  h-wallet market ticker BTC-USDT-SWAP
  h-wallet swap place --instId BTC-USDT-SWAP --side buy --sz 100 --ordType market
  h-wallet grid create --instId BTC-USDT-SWAP --gridNum 50 --maxPx 100000 --minPx 90000
  h-wallet signal consensus --instId BTC-USDT-SWAP
  h-wallet meme trending --chain 501
  h-wallet sniper buy --token 0x123... --chain 501 --amount 100
  h-wallet switch start --totalAmount 500
`);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}
