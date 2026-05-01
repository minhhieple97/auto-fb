import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

@Controller()
export class AgentRunsController {
  constructor(
    @Inject(MultiAgentWorkflow) private readonly workflow: MultiAgentWorkflow,
    @Inject(InMemoryDatabase) private readonly db: InMemoryDatabase
  ) {}

  @Post("campaigns/:campaignId/runs")
  run(@Param("campaignId") campaignId: string) {
    return this.workflow.run(campaignId);
  }

  @Get("agent-runs")
  list(@Query("campaignId") campaignId?: string) {
    return this.db.listAgentRuns(campaignId);
  }
}
