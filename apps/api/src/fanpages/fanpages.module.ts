import { Module } from "@nestjs/common";
import { LlmModule } from "../llm/llm.module.js";
import { AgentRunsModule } from "../workflow/agent-runs.module.js";
import { FanpagesController } from "./fanpages.controller.js";
import { FanpagesService } from "./fanpages.service.js";
import { PageTokenCryptoService } from "./page-token-crypto.service.js";

@Module({
  imports: [AgentRunsModule, LlmModule],
  controllers: [FanpagesController],
  providers: [FanpagesService, PageTokenCryptoService],
  exports: [FanpagesService, PageTokenCryptoService]
})
export class FanpagesModule {}
