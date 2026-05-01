import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { adminPermissions, createSourceSchema, type CreateSourceInput } from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { apiRoutes } from "../common/api-routes.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";

@RequirePermissions(adminPermissions.readDashboardData)
@Controller(apiRoutes.campaignSources)
export class SourcesController {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  @Post()
  @RequirePermissions(adminPermissions.manageSources)
  async create(
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createSourceSchema)) input: CreateSourceInput
  ) {
    return this.db.createSource(campaignId, input);
  }

  @Get()
  async list(@Param("campaignId") campaignId: string) {
    return this.db.listSources(campaignId);
  }
}
