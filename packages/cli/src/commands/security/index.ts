import { handleSecurity } from '../v2-security/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleSecurity(args, flags.json); }
