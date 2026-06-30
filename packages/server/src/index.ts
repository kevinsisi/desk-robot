import { buildApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = buildApp();

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`desk-robot server listening on ${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
