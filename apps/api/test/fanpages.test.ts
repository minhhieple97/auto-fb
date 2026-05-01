import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FanpagesService } from "../src/fanpages/fanpages.service.js";
import { PageTokenCryptoService } from "../src/fanpages/page-token-crypto.service.js";
import { FakeDatabase } from "./fake-database.js";
import { buildFanpageInput, jsonResponse } from "./helpers.js";

function service(db: FakeDatabase, config = new ConfigService({ META_GRAPH_API_VERSION: "v20.0" })) {
  return new FanpagesService(config, db, new PageTokenCryptoService(config));
}

describe("FanpagesService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("stores encrypted Page Access Tokens and returns only redacted token metadata", async () => {
    const db = new FakeDatabase();

    const fanpage = await service(db).create(buildFanpageInput({ pageAccessToken: "secret_page_token_1234" }));
    const tokenRecord = db.getFanpageTokenRecord(fanpage.id);

    expect(fanpage).toMatchObject({
      hasPageAccessToken: true,
      pageAccessTokenMask: "****1234",
      facebookPageId: "page_1"
    });
    expect(tokenRecord.encryptedPageAccessToken).toBeDefined();
    expect(tokenRecord.encryptedPageAccessToken).not.toContain("secret_page_token_1234");
  });

  it("tests the configured token and Page ID without creating a post", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse({ id: "page_1", name: "Sandbox Page" }));
    const db = new FakeDatabase();
    const fanpage = await service(db).create(buildFanpageInput({ pageAccessToken: "secret_page_token_1234" }));

    await expect(service(db).testConnection(fanpage.id)).resolves.toEqual({
      ok: true,
      facebookPageId: "page_1",
      environment: "sandbox",
      pageName: "Sandbox Page"
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("https://graph.facebook.com/v20.0/page_1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("fields=id%2Cname");
  });

  it("fails connection tests when the fanpage has no token", async () => {
    const db = new FakeDatabase();
    const fanpage = await service(db).create(buildFanpageInput());

    await expect(service(db).testConnection(fanpage.id)).rejects.toThrow(BadRequestException);
  });
});
