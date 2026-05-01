import { Module } from "@nestjs/common";
import { PublishingController } from "./publishing.controller.js";
import { PublisherAgentService } from "./publisher-agent.service.js";

@Module({
  controllers: [PublishingController],
  providers: [PublisherAgentService],
  exports: [PublisherAgentService]
})
export class PublishingModule {}
