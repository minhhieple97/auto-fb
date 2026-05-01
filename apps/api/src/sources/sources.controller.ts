import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { createSourceSchema, type CreateSourceInput } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";

@Controller("campaigns/:campaignId/sources")
export class SourcesController {
  constructor(@Inject(InMemoryDatabase) private readonly db: InMemoryDatabase) {}

  @Post()
  create(
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createSourceSchema)) input: CreateSourceInput
  ) {
    return this.db.createSource(campaignId, input);
  }

  @Get()
  list(@Param("campaignId") campaignId: string) {
    return this.db.listSources(campaignId);
  }
}
