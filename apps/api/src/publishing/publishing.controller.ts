import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { adminPermissions, publishOptionsSchema, type PublishOptions } from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { apiRoutes } from "../common/api-routes.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { PublisherAgentService } from "./publisher-agent.service.js";

@RequirePermissions(adminPermissions.readDashboardData)
@Controller()
export class PublishingController {
  constructor(
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  @Post(apiRoutes.publishDraft)
  @RequirePermissions(adminPermissions.publishDrafts)
  async publish(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    return this.publisher.publishDraft(id, options);
  }

  @Get(apiRoutes.publishedPosts)
  async list(@Query("fanpageId") fanpageId?: string) {
    return this.db.listPublishedPosts({
      ...(fanpageId ? { fanpageId } : {})
    });
  }
}
