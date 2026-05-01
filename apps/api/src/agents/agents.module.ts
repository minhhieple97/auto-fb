import { Module } from "@nestjs/common";
import { CollectorService } from "../collector/collector.service.js";
import { StorageModule } from "../storage/storage.module.js";
import { LlmModule } from "../llm/llm.module.js";
import { ApprovalGateAgent } from "./approval-gate.agent.js";
import { CollectorAgent } from "./collector.agent.js";
import { CopywritingAgent } from "./copywriting.agent.js";
import { ImageAgent } from "./image.agent.js";
import { QaComplianceAgent } from "./qa-compliance.agent.js";
import { SourceDiscoveryAgent } from "./source-discovery.agent.js";
import { UnderstandingAgent } from "./understanding.agent.js";

@Module({
  imports: [LlmModule, StorageModule],
  providers: [
    CollectorService,
    SourceDiscoveryAgent,
    CollectorAgent,
    UnderstandingAgent,
    CopywritingAgent,
    ImageAgent,
    QaComplianceAgent,
    ApprovalGateAgent
  ],
  exports: [
    SourceDiscoveryAgent,
    CollectorAgent,
    UnderstandingAgent,
    CopywritingAgent,
    ImageAgent,
    QaComplianceAgent,
    ApprovalGateAgent
  ]
})
export class AgentsModule {}
