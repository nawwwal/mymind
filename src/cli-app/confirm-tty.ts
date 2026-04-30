export async function confirmTty(message: string): Promise<boolean> {
  if (process.env.MYMIND_NO_INPUT === "1" || process.argv.includes("--no-input")) return false;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const prompts = await import("@clack/prompts");
  const result = await prompts.confirm({ message });
  return result === true;
}

