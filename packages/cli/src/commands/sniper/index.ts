import { handleSniper } from '../v2-sniper/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleSniper(args, flags.json); }
