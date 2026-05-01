import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishQueueService } from "../src/worker/publish-queue.service.js";

const queueMocks = vi.hoisted(() => ({
  add: vi.fn(),
  close: vi.fn(),
  Queue: vi.fn(function Queue(name: string, options: unknown) {
    return { add: queueMocks.add, close: queueMocks.close, name, options };
  })
}));

vi.mock("bullmq", () => ({
  Queue: queueMocks.Queue
}));

describe("PublishQueueService", () => {
  beforeEach(() => {
    queueMocks.add.mockReset().mockResolvedValue({});
    queueMocks.close.mockReset().mockResolvedValue(undefined);
    queueMocks.Queue.mockClear();
  });

  it("is a no-op when Redis is not configured", async () => {
    const service = new PublishQueueService(new ConfigService());

    await expect(service.enqueue("draft_1")).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(queueMocks.Queue).not.toHaveBeenCalled();
  });

  it("creates a BullMQ publish queue from REDIS_URL and enqueues draft IDs", async () => {
    const service = new PublishQueueService(new ConfigService({ REDIS_URL: "redis://:secret@localhost:6380" }));

    await service.enqueue("draft_1");
    await service.onModuleDestroy();

    expect(queueMocks.Queue).toHaveBeenCalledWith("publish", {
      connection: { host: "localhost", port: 6380, password: "secret" }
    });
    expect(queueMocks.add).toHaveBeenCalledWith("publish-draft", { draftId: "draft_1" }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
    expect(queueMocks.close).toHaveBeenCalledTimes(1);
  });
});
