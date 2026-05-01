import { Module } from "@nestjs/common";
import { AgentsModule } from "../agents/agents.module.js";
import { AgentRunsController } from "./agent-runs.controller.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

@Module({
  imports: [AgentsModule],
  controllers: [AgentRunsController],
  providers: [MultiAgentWorkflow],
  exports: [MultiAgentWorkflow]
})
export class AgentRunsModule {}
