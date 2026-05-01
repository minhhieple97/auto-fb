import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  adminPermissions,
  approvalStatuses,
  draftStatuses,
  draftStatusSchema,
  publishOptionsSchema,
  type DraftStatus,
  type PublishOptions
} from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { apiRoutes } from "../common/api-routes.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { PublisherAgentService } from "../publishing/publisher-agent.service.js";

@RequirePermissions(adminPermissions.readDashboardData)
@Controller(apiRoutes.drafts)
export class DraftsController {
  constructor(
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService
  ) {}

  @Get()
  async list(@Query("status") status?: DraftStatus) {
    const parsedStatus = status ? draftStatusSchema.parse(status) : undefined;
    return this.db.listDrafts(parsedStatus);
  }

  @Post(apiRoutes.draftApprove)
  @RequirePermissions(adminPermissions.reviewDrafts, adminPermissions.publishDrafts)
  async approve(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    await this.db.updateDraftStatus(id, draftStatuses.approved, approvalStatuses.approved);
    return this.publisher.publishDraft(id, options);
  }

  @Post(apiRoutes.draftReject)
  @RequirePermissions(adminPermissions.reviewDrafts)
  async reject(@Param("id") id: string) {
    return this.db.updateDraftStatus(id, draftStatuses.rejected, approvalStatuses.rejected);
  }
}
