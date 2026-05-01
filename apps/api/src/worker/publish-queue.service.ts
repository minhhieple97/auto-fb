import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

@Injectable()
export class PublishQueueService implements OnModuleDestroy {
  private readonly queue?: Queue;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const redisUrl = config.get<string>("REDIS_URL");
    if (redisUrl) {
      const parsed = new URL(redisUrl);
      this.queue = new Queue("publish", {
        connection: {
          host: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : 6379,
          ...(parsed.password ? { password: parsed.password } : {})
        }
      });
    }
  }

  async enqueue(draftId: string): Promise<void> {
    if (!this.queue) return;
    await this.queue.add("publish-draft", { draftId }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
