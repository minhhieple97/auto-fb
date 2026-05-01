import { Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Query, Req, Sse, UnauthorizedException } from "@nestjs/common";
import { adminPermissions, agentWorkflowRunStatusSchema, workflowRunListLimits, type AgentWorkflowRunStatus } from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { type AuthenticatedRequest } from "../auth/supabase-jwt.guard.js";
import { apiRoutes } from "../common/api-routes.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { AgentWorkflowEventsService } from "./agent-workflow-events.service.js";
import { AgentWorkflowQueueService } from "./agent-workflow-queue.service.js";

@RequirePermissions(adminPermissions.readDashboardData)
@Controller()
export class AgentRunsController {
  constructor(
    private readonly queue: AgentWorkflowQueueService,
    private readonly events: AgentWorkflowEventsService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  @Post(apiRoutes.campaignRuns)
  @RequirePermissions(adminPermissions.runWorkflow)
  @HttpCode(HttpStatus.ACCEPTED)
  async run(@Param("campaignId") campaignId: string, @Req() request: AuthenticatedRequest) {
    if (!request.user) {
      throw new UnauthorizedException("Missing authenticated Supabase user");
    }
    return this.queue.enqueue(campaignId, request.user);
  }

  @Get(apiRoutes.agentRuns)
  async list(@Query("campaignId") campaignId?: string, @Query("graphRunId") graphRunId?: string) {
    return this.db.listAgentRuns({
      ...(campaignId ? { campaignId } : {}),
      ...(graphRunId ? { graphRunId } : {})
    });
  }

  @Get(apiRoutes.agentWorkflowRuns)
  async listWorkflowRuns(
    @Query("campaignId") campaignId?: string,
    @Query("status") status?: AgentWorkflowRunStatus,
    @Query("limit") limit?: string
  ) {
    const parsedStatus = status ? agentWorkflowRunStatusSchema.parse(status) : undefined;
    return this.db.listAgentWorkflowRuns({
      ...(campaignId ? { campaignId } : {}),
      ...(parsedStatus ? { status: parsedStatus } : {}),
      ...parsedLimit(limit)
    });
  }

  @Sse(apiRoutes.agentWorkflowRunsStream)
  stream(@Query("campaignId") campaignId?: string) {
    return this.events.stream(campaignId);
  }
}

function parsedLimit(limit: string | undefined): { limit?: number } {
  if (!limit) return {};
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) return {};
  return { limit: Math.min(Math.max(Math.trunc(parsed), workflowRunListLimits.min), workflowRunListLimits.max) };
}
