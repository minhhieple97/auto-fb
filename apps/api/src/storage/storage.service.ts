import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ImageAsset } from "@auto-fb/shared";
import { randomUUID } from "node:crypto";
import { appDefaults, envKeys } from "../common/app.constants.js";
import { DATABASE_REPOSITORY, type DatabaseRepository } from "../persistence/database.repository.js";
import { storageDefaults } from "./storage.constants.js";

type UploadImageInput = {
  campaignId: string;
  sourceUrl: string;
};

@Injectable()
export class StorageService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DATABASE_REPOSITORY) private readonly db: DatabaseRepository
  ) {}

  async uploadRemoteImage(input: UploadImageInput): Promise<ImageAsset> {
    const response = await fetch(input.sourceUrl);
    if (!response.ok) {
      throw new Error(`Image source ${input.sourceUrl} returned ${response.status}`);
    }

    const mimeType = response.headers.get("content-type") ?? storageDefaults.octetStreamMimeType;
    if (!mimeType.startsWith(storageDefaults.imageMimePrefix)) {
      throw new Error(`Unsupported image mime type ${mimeType}`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    const extension = mimeType.split("/")[1]?.split(";")[0] ?? storageDefaults.binaryExtension;
    const key = `${storageDefaults.objectKeyRoot}/${input.campaignId}/${randomUUID()}.${extension}`;
    const publicUrl = this.publicUrlForKey(key);

    if (this.hasR2Config()) {
      await this.client().send(
        new PutObjectCommand({
          Bucket: this.config.get<string>(envKeys.r2Bucket) ?? appDefaults.r2Bucket,
          Key: key,
          Body: body,
          ContentType: mimeType
        })
      );
    }

    return this.db.createImageAsset({
      campaignId: input.campaignId,
      sourceUrl: input.sourceUrl,
      r2Key: key,
      ...(publicUrl ? { publicUrl } : {}),
      mimeType
    });
  }

  publicUrlForKey(key: string): string | undefined {
    const baseUrl = this.config.get<string>(envKeys.r2PublicBaseUrl);
    if (!baseUrl) return undefined;
    return `${baseUrl.replace(/\/$/, "")}/${key}`;
  }

  private client(): S3Client {
    const accountId = this.config.getOrThrow<string>(envKeys.r2AccountId);
    return new S3Client({
      region: appDefaults.r2Region,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>(envKeys.r2AccessKeyId),
        secretAccessKey: this.config.getOrThrow<string>(envKeys.r2SecretAccessKey)
      }
    });
  }

  private hasR2Config(): boolean {
    return Boolean(
      this.config.get<string>(envKeys.r2AccountId) &&
        this.config.get<string>(envKeys.r2AccessKeyId) &&
        this.config.get<string>(envKeys.r2SecretAccessKey) &&
        this.config.get<string>(envKeys.r2Bucket)
    );
  }
}
