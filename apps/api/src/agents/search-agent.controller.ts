import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import {
  adminPermissions,
  agentSearchInputSchema,
  generateFromSearchInputSchema,
  type AgentSearchInput,
  type GenerateFromSearchInput
} from "@auto-fb/shared";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { apiRoutes } from "../common/api-routes.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { SearchContentAgent } from "./search-content.agent.js";

@RequirePermissions(adminPermissions.runWorkflow)
@Controller()
export class SearchAgentController {
  constructor(@Inject(SearchContentAgent) private readonly searchAgent: SearchContentAgent) {}

  @Post(apiRoutes.campaignAgentSearch)
  async search(@Param("campaignId") campaignId: string, @Body(new ZodValidationPipe(agentSearchInputSchema)) input: AgentSearchInput) {
    return this.searchAgent.search(campaignId, input);
  }

  @Post(apiRoutes.campaignAgentSearchGenerate)
  async generate(
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(generateFromSearchInputSchema)) input: GenerateFromSearchInput
  ) {
    return this.searchAgent.generate(campaignId, input);
  }
}
