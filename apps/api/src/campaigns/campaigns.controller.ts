import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { createCampaignSchema, updateCampaignSchema, type CreateCampaignInput, type UpdateCampaignInput } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";

@Controller("campaigns")
export class CampaignsController {
  constructor(@Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository) {}

  @Post()
  async create(@Body(new ZodValidationPipe(createCampaignSchema)) input: CreateCampaignInput) {
    return this.db.createCampaign(input);
  }

  @Get()
  async list() {
    return this.db.listCampaigns();
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return this.db.getCampaign(id);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body(new ZodValidationPipe(updateCampaignSchema)) input: UpdateCampaignInput) {
    return this.db.updateCampaign(id, input);
  }
}
