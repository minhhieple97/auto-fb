import { Module } from "@nestjs/common";
import { AgentsModule } from "../agents/agents.module.js";
import { AgentRunsController } from "./agent-runs.controller.js";
import { AgentWorkflowEventsService } from "./agent-workflow-events.service.js";
import { AgentWorkflowQueueService } from "./agent-workflow-queue.service.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

@Module({
  imports: [AgentsModule],
  controllers: [AgentRunsController],
  providers: [MultiAgentWorkflow, AgentWorkflowEventsService, AgentWorkflowQueueService],
  exports: [MultiAgentWorkflow, AgentWorkflowQueueService]
})
export class AgentRunsModule {}
