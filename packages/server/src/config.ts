export const SERVER_VERSION = '0.2.4';

export interface ServerConfig {
  host: string;
  port: number;
}

export function getConfig(env = process.env): ServerConfig {
  return {
    host: env.HOST ?? '0.0.0.0',
    port: Number(env.PORT ?? 8723),
  };
}
