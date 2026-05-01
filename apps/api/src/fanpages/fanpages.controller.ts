import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Req, UnauthorizedException } from "@nestjs/common";
import {
  adminPermissions,
  createFanpageSchema,
  createSourceSchema,
  updateFanpageScheduleSchema,
  updateFanpageSchema,
  updateFanpageTokenSchema,
  type CreateFanpageInput,
  type CreateSourceInput,
  type UpdateFanpageInput,
  type UpdateFanpageScheduleInput,
  type UpdateFanpageTokenInput
} from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import type { AuthenticatedRequest } from "../auth/supabase-jwt.guard.js";
import { apiRoutes } from "../common/api-routes.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { AgentWorkflowQueueService } from "../workflow/agent-workflow-queue.service.js";
import { FanpagesService } from "./fanpages.service.js";

@RequirePermissions(adminPermissions.readDashboardData)
@Controller(apiRoutes.fanpages)
export class FanpagesController {
  constructor(
    private readonly fanpages: FanpagesService,
    private readonly queue: AgentWorkflowQueueService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  @Post()
  @RequirePermissions(adminPermissions.manageCampaigns)
  create(@Body(new ZodValidationPipe(createFanpageSchema)) input: CreateFanpageInput) {
    return this.fanpages.create(input);
  }

  @Get()
  list() {
    return this.fanpages.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.fanpages.get(id);
  }

  @Patch(":id")
  @RequirePermissions(adminPermissions.manageCampaigns)
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateFanpageSchema)) input: UpdateFanpageInput) {
    return this.fanpages.update(id, input);
  }

  @Patch(apiRoutes.fanpageSchedule)
  @RequirePermissions(adminPermissions.manageCampaigns)
  updateSchedule(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFanpageScheduleSchema)) input: UpdateFanpageScheduleInput
  ) {
    return this.fanpages.updateSchedule(id, input);
  }

  @Patch(apiRoutes.fanpageToken)
  @RequirePermissions(adminPermissions.manageCampaigns)
  updateToken(@Param("id") id: string, @Body(new ZodValidationPipe(updateFanpageTokenSchema)) input: UpdateFanpageTokenInput) {
    return this.fanpages.updateToken(id, input);
  }

  @Post(apiRoutes.fanpageTestConnection)
  @RequirePermissions(adminPermissions.manageCampaigns)
  testConnection(@Param("id") id: string) {
    return this.fanpages.testConnection(id);
  }

  @Post(apiRoutes.fanpageSources)
  @RequirePermissions(adminPermissions.manageSources)
  async createSource(@Param("id") id: string, @Body(new ZodValidationPipe(createSourceSchema)) input: CreateSourceInput) {
    const fanpage = await this.db.getFanpage(id);
    return this.db.createSource(fanpage.campaignId, input);
  }

  @Get(apiRoutes.fanpageSources)
  async listSources(@Param("id") id: string) {
    const fanpage = await this.db.getFanpage(id);
    return this.db.listSources(fanpage.campaignId);
  }

  @Post(apiRoutes.fanpageRuns)
  @RequirePermissions(adminPermissions.runWorkflow)
  @HttpCode(HttpStatus.ACCEPTED)
  async run(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    if (!request.user) {
      throw new UnauthorizedException("Missing authenticated Supabase user");
    }
    const fanpage = await this.db.getFanpage(id);
    return this.queue.enqueue(fanpage.campaignId, request.user);
  }
}
