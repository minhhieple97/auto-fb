import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { envKeys } from "../common/app.constants.js";
import { publishQueueConfig } from "./queue.constants.js";
import { redisConnection } from "./redis-connection.js";

@Injectable()
export class PublishQueueService implements OnModuleDestroy {
  private readonly queue?: Queue;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const redisUrl = config.get<string>(envKeys.redisUrl);
    if (redisUrl) {
      this.queue = new Queue(publishQueueConfig.name, { connection: redisConnection(redisUrl) });
    }
  }

  async enqueue(draftId: string): Promise<void> {
    if (!this.queue) return;
    await this.queue.add(publishQueueConfig.jobName, { draftId }, {
      attempts: publishQueueConfig.attempts,
      backoff: { type: publishQueueConfig.backoffType, delay: publishQueueConfig.backoffDelayMs }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }
}
