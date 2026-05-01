import { Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { MultiAgentWorkflow } from "./multi-agent.workflow.js";

@Controller()
export class AgentRunsController {
  constructor(
    @Inject(MultiAgentWorkflow) private readonly workflow: MultiAgentWorkflow,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  @Post("campaigns/:campaignId/runs")
  async run(@Param("campaignId") campaignId: string) {
    return this.workflow.run(campaignId);
  }

  @Get("agent-runs")
  async list(@Query("campaignId") campaignId?: string) {
    return this.db.listAgentRuns(campaignId);
  }
}
