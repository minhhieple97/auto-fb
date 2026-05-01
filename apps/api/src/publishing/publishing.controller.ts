import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { publishOptionsSchema, type PublishOptions } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { PublisherAgentService } from "./publisher-agent.service.js";

@Controller()
export class PublishingController {
  constructor(
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  @Post("drafts/:id/publish")
  async publish(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    return this.publisher.publishDraft(id, options);
  }

  @Get("published-posts")
  async list() {
    return this.db.listPublishedPosts();
  }
}
