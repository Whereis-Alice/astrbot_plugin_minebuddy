import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  minecraft: {
    host: process.env.MC_HOST || 'localhost',
    port: toInt(process.env.MC_PORT, 25565),
    username: process.env.MC_USERNAME || 'LLM_Bot',
    version: process.env.MC_VERSION || '1.20.1',
    connectTimeoutMs: Math.max(5000, toInt(process.env.MC_CONNECT_TIMEOUT_MS, 30000)),
  },

  service: {
    port: toInt(process.env.BOT_SERVICE_PORT, 3001),
  },

  viewer: {
    enabled: process.env.VIEWER_ENABLED === 'true',
    port: toInt(process.env.VIEWER_PORT, 3007),
    firstPerson: process.env.VIEWER_FIRST_PERSON === 'true',
  },

  autoConnect: process.env.AUTO_CONNECT === 'true',

  debug: process.env.DEBUG === 'true',
};

export default config;
