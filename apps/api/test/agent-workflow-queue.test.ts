import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentWorkflowQueueService } from "../src/workflow/agent-workflow-queue.service.js";
import { buildAgentRun, buildAgentWorkflowRun } from "./helpers.js";

const bullmqMocks = vi.hoisted(() => ({
  add: vi.fn(),
  closeQueue: vi.fn(),
  closeWorker: vi.fn(),
  processor: undefined as undefined | ((job: { data: { campaignId: string; graphRunId: string } }) => Promise<void>),
  Queue: vi.fn(function Queue(name: string, options: unknown) {
    return { add: bullmqMocks.add, close: bullmqMocks.closeQueue, name, options };
  }),
  Worker: vi.fn(function Worker(name: string, processor: (job: { data: { campaignId: string; graphRunId: string } }) => Promise<void>, options: unknown) {
    bullmqMocks.processor = processor;
    return { close: bullmqMocks.closeWorker, name, options };
  })
}));

vi.mock("bullmq", () => ({
  Queue: bullmqMocks.Queue,
  Worker: bullmqMocks.Worker
}));

describe("AgentWorkflowQueueService", () => {
  beforeEach(() => {
    bullmqMocks.add.mockReset().mockResolvedValue({});
    bullmqMocks.closeQueue.mockReset().mockResolvedValue(undefined);
    bullmqMocks.closeWorker.mockReset().mockResolvedValue(undefined);
    bullmqMocks.Queue.mockClear();
    bullmqMocks.Worker.mockClear();
    bullmqMocks.processor = undefined;
  });

  it("fails clearly when Redis is not configured", async () => {
    const service = new AgentWorkflowQueueService(new ConfigService(), {} as never, {} as never, {} as never);

    await expect(service.enqueue("camp_1", { id: "user_1" })).rejects.toThrow("REDIS_URL is required");
    expect(bullmqMocks.Queue).not.toHaveBeenCalled();
  });

  it("creates workflow run metadata and enqueues the BullMQ job", async () => {
    const run = buildAgentWorkflowRun();
    const db = {
      createAgentWorkflowRun: vi.fn().mockResolvedValue(run)
    };
    const events = { emit: vi.fn() };
    const service = new AgentWorkflowQueueService(
      new ConfigService({ REDIS_URL: "redis://:secret@localhost:6380" }),
      db as never,
      {} as never,
      events as never
    );

    await expect(service.enqueue("camp_1", { id: "user_1", email: "admin@example.com" })).resolves.toEqual(run);

    expect(db.createAgentWorkflowRun).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "camp_1",
        status: "QUEUED",
        triggeredByUserId: "user_1",
        triggeredByEmail: "admin@example.com"
      })
    );
    expect(bullmqMocks.add).toHaveBeenCalledWith(
      "run-agent-workflow",
      expect.objectContaining({ campaignId: "camp_1" }),
      expect.objectContaining({ attempts: 1 })
    );
    expect(events.emit).toHaveBeenCalledWith(run);
    await service.onModuleDestroy();
  });

  it("updates workflow state around worker step transitions", async () => {
    const run = buildAgentWorkflowRun({ status: "RUNNING" });
    const db = {
      updateAgentWorkflowRun: vi.fn().mockResolvedValue(run),
      getAgentWorkflowRun: vi.fn().mockResolvedValue(buildAgentWorkflowRun({ status: "RUNNING", steps: [buildAgentRun()] }))
    };
    const workflow = {
      run: vi.fn().mockImplementation(async (_campaignId: string, options: { onStepStarted: (run: unknown) => Promise<void>; onStepCompleted: (run: unknown) => Promise<void> }) => {
        await options.onStepStarted(buildAgentRun({ status: "RUNNING", nodeName: "load_campaign" }));
        await options.onStepCompleted(buildAgentRun({ status: "SUCCESS", nodeName: "load_campaign" }));
      })
    };
    const events = { emit: vi.fn() };
    new AgentWorkflowQueueService(new ConfigService({ REDIS_URL: "redis://localhost:6379" }), db as never, workflow as never, events as never);

    const processor = bullmqMocks.processor;
    expect(processor).toBeDefined();
    await expect(processor!({ data: { campaignId: "camp_1", graphRunId: "graph_1" } })).resolves.toBeUndefined();

    expect(workflow.run).toHaveBeenCalledWith(
      "camp_1",
      expect.objectContaining({
        graphRunId: "graph_1"
      })
    );
    expect(db.updateAgentWorkflowRun).toHaveBeenCalledWith("graph_1", expect.objectContaining({ status: "RUNNING" }));
    expect(db.updateAgentWorkflowRun).toHaveBeenCalledWith(
      "graph_1",
      expect.objectContaining({ status: "RUNNING", currentNodeName: "load_campaign" })
    );
    expect(db.updateAgentWorkflowRun).toHaveBeenCalledWith(
      "graph_1",
      expect.objectContaining({ status: "SUCCESS", currentNodeName: null })
    );
  });
});
