import { handleAutoPay } from '../v2-autopay/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleAutoPay(args, flags.json); }
