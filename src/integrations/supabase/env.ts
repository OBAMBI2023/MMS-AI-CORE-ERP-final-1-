// Helper for reading environment variables safely across different environments
export function readEnvVar(...names: string[]): string | undefined {
  const importMetaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env;
  for (const name of names) {
    const value = importMetaEnv?.[name];
    if (value) return value;
  }
  if (typeof process !== "undefined" && process?.env) {
    for (const name of names) {
      const value = process.env[name];
      if (value) return value;
    }
  }
  return undefined;
}
