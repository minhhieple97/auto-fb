import { Inject, Injectable } from "@nestjs/common";
import type { Campaign, ImageAsset } from "@auto-fb/shared";
import { StorageService } from "../storage/storage.service.js";
import type { UnderstoodContent } from "./agent.types.js";

@Injectable()
export class ImageAgent {
  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  async prepare(campaign: Campaign, understood: UnderstoodContent): Promise<ImageAsset | undefined> {
    const imageUrl = understood.item.imageUrls[0];
    if (!imageUrl) return undefined;
    return this.storage.uploadRemoteImage({ campaignId: campaign.id, sourceUrl: imageUrl });
  }
}
