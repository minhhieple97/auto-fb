import { Module } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller.js";

@Module({
  controllers: [CampaignsController]
})
export class CampaignsModule {}
