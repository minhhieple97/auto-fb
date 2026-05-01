import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { publishOptionsSchema, type PublishOptions } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";
import { PublisherAgentService } from "./publisher-agent.service.js";

@Controller()
export class PublishingController {
  constructor(
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService,
    @Inject(InMemoryDatabase) private readonly db: InMemoryDatabase
  ) {}

  @Post("drafts/:id/publish")
  publish(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    return this.publisher.publishDraft(id, options);
  }

  @Get("published-posts")
  list() {
    return this.db.listPublishedPosts();
  }
}
