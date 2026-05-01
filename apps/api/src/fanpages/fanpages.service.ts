import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  CreateFanpageInput,
  Fanpage,
  TestFanpageConnectionResponse,
  UpdateFanpageInput,
  UpdateFanpageScheduleInput,
  UpdateFanpageTokenInput
} from "@auto-fb/shared";
import { appDefaults, envKeys } from "../common/app.constants.js";
import {
  DATABASE_REPOSITORY,
  type DatabaseRepository,
  type FanpageTokenRecord,
  type UpdateFanpageRecordInput
} from "../persistence/database.repository.js";
import { PageTokenCryptoService } from "./page-token-crypto.service.js";

@Injectable()
export class FanpagesService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository,
    private readonly tokenCrypto: PageTokenCryptoService
  ) {}

  async create(input: CreateFanpageInput): Promise<Fanpage> {
    const tokenPatch = this.encryptTokenPatch(input.pageAccessToken);
    return this.db.createFanpage({
      name: input.name,
      facebookPageId: input.facebookPageId,
      environment: input.environment,
      topic: input.topic,
      language: input.language,
      brandVoice: input.brandVoice,
      llmProvider: input.llmProvider,
      llmModel: input.llmModel,
      scheduleConfig: input.scheduleConfig,
      ...tokenPatch
    });
  }

  list(): Promise<Fanpage[]> {
    return Promise.resolve(this.db.listFanpages());
  }

  get(id: string): Promise<Fanpage> {
    return Promise.resolve(this.db.getFanpage(id));
  }

  async update(id: string, input: UpdateFanpageInput): Promise<Fanpage> {
    const { pageAccessToken, ...rest } = input;
    const recordInput: UpdateFanpageRecordInput = { ...rest };
    if (pageAccessToken !== undefined) {
      Object.assign(recordInput, this.encryptTokenPatch(pageAccessToken));
    }
    return this.db.updateFanpage(id, recordInput);
  }

  updateSchedule(id: string, input: UpdateFanpageScheduleInput): Promise<Fanpage> {
    return Promise.resolve(this.db.updateFanpageSchedule(id, input));
  }

  updateToken(id: string, input: UpdateFanpageTokenInput): Promise<Fanpage> {
    return Promise.resolve(this.db.updateFanpage(id, this.encryptTokenPatch(input.pageAccessToken)));
  }

  async testConnection(id: string): Promise<TestFanpageConnectionResponse> {
    const record = await this.db.getFanpageTokenRecord(id);
    const token = this.decryptRequiredToken(record);
    const version = this.config.get<string>(envKeys.metaGraphApiVersion, appDefaults.metaGraphApiVersion);
    const url = new URL(`https://graph.facebook.com/${version}/${record.fanpage.facebookPageId}`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const response = await fetch(url);
    const result = (await response.json()) as { id?: string; name?: string; error?: { message?: string } };
    if (!response.ok) {
      throw new BadRequestException(result.error?.message ?? `Meta Graph API returned ${response.status}`);
    }
    if (result.id && result.id !== record.fanpage.facebookPageId) {
      throw new BadRequestException("Meta Graph API returned a different Page ID");
    }
    return {
      ok: true,
      facebookPageId: record.fanpage.facebookPageId,
      environment: record.fanpage.environment,
      ...(result.name ? { pageName: result.name } : {})
    };
  }

  private encryptTokenPatch(pageAccessToken: string | undefined): {
    encryptedPageAccessToken?: string;
    pageAccessTokenMask?: string;
  } {
    if (!pageAccessToken) return {};
    return {
      encryptedPageAccessToken: this.tokenCrypto.encrypt(pageAccessToken),
      pageAccessTokenMask: this.tokenCrypto.mask(pageAccessToken)
    };
  }

  private decryptRequiredToken(record: FanpageTokenRecord): string {
    if (!record.encryptedPageAccessToken) {
      throw new BadRequestException(`Fanpage ${record.fanpage.id} is missing a Page Access Token`);
    }
    return this.tokenCrypto.decrypt(record.encryptedPageAccessToken);
  }
}
