import { handleWalletV2 } from '../v2-wallet/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleWalletV2(args, flags.json); }
