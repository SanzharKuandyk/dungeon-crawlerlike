export type Config = {
  port: number;
  host: string;
  testMode: boolean;
  production: boolean;
  dataDir: string;
};

export function readConfig(args = process.argv.slice(2)): Config {
  const option = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : (args[i + 1] ?? fallback);
  };
  const host = option("--host", "127.0.0.1");
  const testMode = args.includes("--test");
  if (testMode && !["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error("Test mode requires a loopback host.");
  const port = Number(option("--port", process.env.PORT ?? "47831"));
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Use a port from 1 to 65535.");
  return {
    port,
    host,
    testMode,
    production: args.includes("--production"),
    dataDir: option("--data-dir", "data/rules-v9"),
  };
}
