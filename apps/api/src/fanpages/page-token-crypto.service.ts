import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { envKeys, nodeEnvironments } from "../common/app.constants.js";

const ENCRYPTION_VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const LOCAL_DEV_SECRET = "auto-fb-local-page-token-key";

@Injectable()
export class PageTokenCryptoService {
  private readonly key: Buffer;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const secret = config.get<string>(envKeys.facebookPageTokenEncryptionKey);
    const nodeEnv = config.get<string>(envKeys.nodeEnv);
    if (!secret && nodeEnv === nodeEnvironments.production) {
      throw new Error(`${envKeys.facebookPageTokenEncryptionKey} is required in production`);
    }
    this.key = createHash("sha256").update(secret ?? LOCAL_DEV_SECRET).digest();
  }

  encrypt(token: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv, { authTagLength: AUTH_TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [ENCRYPTION_VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
  }

  decrypt(payload: string): string {
    const [version, ivBase64, tagBase64, ciphertextBase64] = payload.split(":");
    if (version !== ENCRYPTION_VERSION || !ivBase64 || !tagBase64 || !ciphertextBase64) {
      throw new Error("Unsupported encrypted Page Access Token format");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(ivBase64, "base64"), {
      authTagLength: AUTH_TAG_BYTES
    });
    decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextBase64, "base64")), decipher.final()]).toString("utf8");
  }

  mask(token: string): string {
    return `****${token.slice(-4)}`;
  }
}
