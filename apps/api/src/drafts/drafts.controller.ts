import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { draftStatusSchema, publishOptionsSchema, type DraftStatus, type PublishOptions } from "@auto-fb/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { InMemoryDatabase } from "../persistence/in-memory.database.js";
import { PublisherAgentService } from "../publishing/publisher-agent.service.js";

@Controller("drafts")
export class DraftsController {
  constructor(
    @Inject(InMemoryDatabase) private readonly db: InMemoryDatabase,
    @Inject(PublisherAgentService) private readonly publisher: PublisherAgentService
  ) {}

  @Get()
  list(@Query("status") status?: DraftStatus) {
    const parsedStatus = status ? draftStatusSchema.parse(status) : undefined;
    return this.db.listDrafts(parsedStatus);
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body(new ZodValidationPipe(publishOptionsSchema)) options: PublishOptions) {
    this.db.updateDraftStatus(id, "APPROVED", "APPROVED");
    return this.publisher.publishDraft(id, options);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string) {
    return this.db.updateDraftStatus(id, "REJECTED", "REJECTED");
  }
}
