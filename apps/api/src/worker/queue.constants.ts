export const redisDefaults = {
  port: 6379
} as const;

export const agentWorkflowQueueConfig = {
  attempts: 1,
  jobName: "run-agent-workflow",
  name: "agent-workflow",
  removeOnComplete: 100,
  removeOnFail: 100
} as const;

export const publishQueueConfig = {
  attempts: 3,
  backoffDelayMs: 1000,
  backoffType: "exponential",
  jobName: "publish-draft",
  name: "publish"
} as const;
