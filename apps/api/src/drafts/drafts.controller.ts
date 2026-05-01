import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { draftStatusSchema, publishOptionsSchema, type DraftStatus, type PublishOptions } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { PublisherAgentService } from "../publishing/publisher-agent.service.js";

@Controller("drafts")
export class DraftsController {
  constructor(
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService
  ) {}

  @Get()
  async list(@Query("status") status?: DraftStatus) {
    const parsedStatus = status ? draftStatusSchema.parse(status) : undefined;
    return this.db.listDrafts(parsedStatus);
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    await this.db.updateDraftStatus(id, "APPROVED", "APPROVED");
    return this.publisher.publishDraft(id, options);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string) {
    return this.db.updateDraftStatus(id, "REJECTED", "REJECTED");
  }
}
