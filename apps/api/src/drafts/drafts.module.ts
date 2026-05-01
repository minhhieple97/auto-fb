import { Module } from "@nestjs/common";
import { PublishingModule } from "../publishing/publishing.module.js";
import { DraftsController } from "./drafts.controller.js";

@Module({
  imports: [PublishingModule],
  controllers: [DraftsController]
})
export class DraftsModule {}
