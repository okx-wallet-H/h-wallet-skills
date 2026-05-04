import { handleMeme } from '../v2-meme/index.js';
export async function execute(args: string[], flags: { json: boolean }): Promise<void> { await handleMeme(args, flags.json); }
