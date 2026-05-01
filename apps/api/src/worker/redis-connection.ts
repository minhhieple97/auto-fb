import { redisDefaults } from "./queue.constants.js";

export function redisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : redisDefaults.port,
    ...(parsed.password ? { password: parsed.password } : {})
  };
}
