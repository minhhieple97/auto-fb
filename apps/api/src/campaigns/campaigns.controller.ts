import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { createCampaignSchema, updateCampaignSchema, type CreateCampaignInput, type UpdateCampaignInput } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";

@Controller("campaigns")
export class CampaignsController {
  constructor(@Inject(InMemoryDatabase) private readonly db: InMemoryDatabase) {}

  @Post()
  create(@Body(new ZodValidationPipe(createCampaignSchema)) input: CreateCampaignInput) {
    return this.db.createCampaign(input);
  }

  @Get()
  list() {
    return this.db.listCampaigns();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.db.getCampaign(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodValidationPipe(updateCampaignSchema)) input: UpdateCampaignInput) {
    return this.db.updateCampaign(id, input);
  }
}
