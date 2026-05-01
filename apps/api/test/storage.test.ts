import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryDatabase } from "../src/persistence/in-memory.database.js";
import { StorageService } from "../src/storage/storage.service.js";
import { binaryResponse, jsonResponse } from "./helpers.js";

const s3Mocks = vi.hoisted(() => ({
  send: vi.fn(),
  S3Client: vi.fn(function S3Client(config: unknown) {
    return { config, send: s3Mocks.send };
  }),
  PutObjectCommand: vi.fn(function PutObjectCommand(input: unknown) {
    return { input };
  })
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3Mocks.S3Client,
  PutObjectCommand: s3Mocks.PutObjectCommand
}));

describe("StorageService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    s3Mocks.send.mockReset().mockResolvedValue({});
    s3Mocks.S3Client.mockClear();
    s3Mocks.PutObjectCommand.mockClear();
  });

  it("builds public URLs with a single slash separator", () => {
    const service = new StorageService(new ConfigService({ R2_PUBLIC_BASE_URL: "https://cdn.example.com/assets/" }), new InMemoryDatabase());

    expect(service.publicUrlForKey("campaigns/camp_1/image.png")).toBe("https://cdn.example.com/assets/campaigns/camp_1/image.png");
  });

  it("stores remote image metadata locally when R2 is not configured", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(binaryResponse("png", "image/png"));
    const db = new InMemoryDatabase();
    const service = new StorageService(new ConfigService({ R2_PUBLIC_BASE_URL: "https://cdn.example.com" }), db);

    const asset = await service.uploadRemoteImage({ campaignId: "camp_1", sourceUrl: "https://example.com/image.png" });

    expect(asset).toMatchObject({
      campaignId: "camp_1",
      sourceUrl: "https://example.com/image.png",
      publicUrl: expect.stringMatching(/^https:\/\/cdn\.example\.com\/campaigns\/camp_1\/.+\.png$/),
      mimeType: "image/png"
    });
    expect(db.getImageAsset(asset.id)).toEqual(asset);
    expect(s3Mocks.S3Client).not.toHaveBeenCalled();
  });

  it("uploads to R2 when the full R2 configuration exists", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(binaryResponse("jpeg", "image/jpeg"));
    const service = new StorageService(
      new ConfigService({
        R2_ACCOUNT_ID: "account_1",
        R2_ACCESS_KEY_ID: "access",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "bucket_1"
      }),
      new InMemoryDatabase()
    );

    const asset = await service.uploadRemoteImage({ campaignId: "camp_1", sourceUrl: "https://example.com/image.jpg" });

    expect(s3Mocks.S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "auto",
        endpoint: "https://account_1.r2.cloudflarestorage.com",
        credentials: { accessKeyId: "access", secretAccessKey: "secret" }
      })
    );
    expect(s3Mocks.PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "bucket_1",
        Key: asset.r2Key,
        Body: expect.any(Buffer),
        ContentType: "image/jpeg"
      })
    );
    expect(s3Mocks.send).toHaveBeenCalledTimes(1);
  });

  it("rejects failed or non-image remote responses", async () => {
    const service = new StorageService(new ConfigService(), new InMemoryDatabase());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ error: "missing" }, { status: 404 }));
    await expect(service.uploadRemoteImage({ campaignId: "camp_1", sourceUrl: "https://example.com/missing.png" })).rejects.toThrow(
      "Image source https://example.com/missing.png returned 404"
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(binaryResponse("html", "text/html"));
    await expect(service.uploadRemoteImage({ campaignId: "camp_1", sourceUrl: "https://example.com/page" })).rejects.toThrow(
      "Unsupported image mime type text/html"
    );
  });
});
