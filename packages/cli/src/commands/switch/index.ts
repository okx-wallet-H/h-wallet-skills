import { handleSwitch } from '../v2-switch/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleSwitch(args, flags.json); }
