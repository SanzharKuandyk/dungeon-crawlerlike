import { createGameServer } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const server = await createGameServer(config);
try {
  await server.listen();
} catch (error) {
  console.error(
    `Cannot listen on ${config.host}:${config.port}. ${error instanceof Error ? error.message : "Check the port."}`,
  );
  await server.close();
  process.exitCode = 1;
}
if (server.http.listening) {
  console.log(`Dungeon Crawlerlike: http://${config.host}:${config.port}`);
  if (config.testMode) console.log(`Solo playground: http://${config.host}:${config.port}/#/test`);
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
