import { Module } from "@nestjs/common";
import { FanpagesModule } from "../fanpages/fanpages.module.js";
import { PublishingController } from "./publishing.controller.js";
import { PublisherAgentService } from "./publisher-agent.service.js";

@Module({
  imports: [FanpagesModule],
  controllers: [PublishingController],
  providers: [PublisherAgentService],
  exports: [PublisherAgentService]
})
export class PublishingModule {}
