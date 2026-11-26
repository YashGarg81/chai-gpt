import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_ROOT = path.resolve(process.cwd(), ".chai-storage");

export interface StorageProvider {
  putObject(key: string, data: Buffer): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}

function resolveSafePath(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid storage key");
  }
  const full = path.resolve(STORAGE_ROOT, normalized);
  if (!full.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Storage path traversal rejected");
  }
  return full;
}

class LocalPrivateStorage implements StorageProvider {
  async putObject(key: string, data: Buffer): Promise<void> {
    const target = resolveSafePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async getObject(key: string): Promise<Buffer> {
    const target = resolveSafePath(key);
    return readFile(target);
  }

  async deleteObject(key: string): Promise<void> {
    const target = resolveSafePath(key);
    await unlink(target).catch(() => {});
  }
}

class S3CompatibleStorage implements StorageProvider {
  private readonly endpoint: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const bucket = process.env.S3_BUCKET?.trim();
    const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_BACKEND=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY"
      );
    }

    this.endpoint = endpoint.replace(/\/+$/, "");
    this.bucket = bucket;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
  }

  private objectUrl(key: string): string {
    const normalized = key.replace(/\\/g, "/");
    if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
      throw new Error("Invalid storage key");
    }
    return `${this.endpoint}/${this.bucket}/${normalized}`;
  }

  private authHeaders(method: string, key: string): Record<string, string> {
    const date = new Date().toUTCString();
    const sig = crypto
      .createHmac("sha256", this.secretAccessKey)
      .update(`${method}\n${date}\n/${this.bucket}/${key}`)
      .digest("base64");
    return {
      Date: date,
      Authorization: `AWS ${this.accessKeyId}:${sig}`,
    };
  }

  async putObject(key: string, data: Buffer): Promise<void> {
    const res = await fetch(this.objectUrl(key), {
      method: "PUT",
      headers: {
        ...this.authHeaders("PUT", key),
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(data),
    });
    if (!res.ok) {
      throw new Error(`S3 putObject failed with status ${res.status}`);
    }
  }

  async getObject(key: string): Promise<Buffer> {
    const res = await fetch(this.objectUrl(key), {
      method: "GET",
      headers: this.authHeaders("GET", key),
    });
    if (!res.ok) {
      throw new Error(`S3 getObject failed with status ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async deleteObject(key: string): Promise<void> {
    await fetch(this.objectUrl(key), {
      method: "DELETE",
      headers: this.authHeaders("DELETE", key),
    }).catch(() => {});
  }
}

export function createStorageProvider(): StorageProvider {
  if (process.env.STORAGE_BACKEND === "s3") {
    return new S3CompatibleStorage();
  }
  return new LocalPrivateStorage();
}

export const storage: StorageProvider = createStorageProvider();

/** Generates a non-guessable private storage key scoped to owner and conversation. */
export function createStorageKey(
  ownerId: string,
  conversationId: string,
  ext: string
): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${ownerId}/${conversationId}/${crypto.randomUUID()}.${safeExt}`;
}
