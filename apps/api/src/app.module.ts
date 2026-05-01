import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { CampaignsModule } from "./campaigns/campaigns.module.js";
import { SourcesModule } from "./sources/sources.module.js";
import { DraftsModule } from "./drafts/drafts.module.js";
import { PublishingModule } from "./publishing/publishing.module.js";
import { AgentRunsModule } from "./workflow/agent-runs.module.js";
import { PersistenceModule } from "./persistence/persistence.module.js";
import { LlmModule } from "./llm/llm.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { WorkerModule } from "./worker/worker.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { FanpagesModule } from "./fanpages/fanpages.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [resolve(process.cwd(), "../../.env"), ".env"] }),
    PersistenceModule,
    AuthModule,
    LlmModule,
    StorageModule,
    FanpagesModule,
    CampaignsModule,
    SourcesModule,
    AgentRunsModule,
    DraftsModule,
    PublishingModule,
    WorkerModule
  ]
})
export class AppModule {}
