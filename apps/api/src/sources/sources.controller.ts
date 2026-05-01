import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { createSourceSchema, type CreateSourceInput } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";

@Controller("campaigns/:campaignId/sources")
export class SourcesController {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  @Post()
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
