// Local filesystem storage driver — dev-only, zero-cost, no account needed.
// Files live under STORAGE_LOCAL_ROOT (default ./.data/storage, gitignored)
// and are served back through src/routes/api/storage/$.ts.
import { mkdir, readFile, writeFile, unlink, access } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import type { PutObjectInput, StorageDriver, StoredObject } from "./types";

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
};

function guessContentType(key: string): string | undefined {
  const dot = key.lastIndexOf(".");
  if (dot === -1) return undefined;
  return EXTENSION_CONTENT_TYPES[key.slice(dot).toLowerCase()];
}

export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;
  private readonly baseUrl: string;

  constructor(root: string, baseUrl: string) {
    this.root = resolve(root);
    this.baseUrl = baseUrl;
  }

  /** Resolves a key to an absolute path, rejecting anything that would escape `root`. */
  private resolveKey(key: string): string {
    if (!key || key.startsWith("/") || key.includes("\0")) {
      throw new Error(`Invalid storage key: "${key}"`);
    }
    const resolved = resolve(this.root, normalize(key));
    if (resolved !== this.root && !resolved.startsWith(this.root + sep)) {
      throw new Error(`Invalid storage key: "${key}" escapes the storage root`);
    }
    return resolved;
  }

  async put(input: PutObjectInput): Promise<{ key: string; url: string }> {
    const path = this.resolveKey(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.data);
    if (input.contentType) {
      await writeFile(`${path}.contenttype`, input.contentType, "utf8");
    }
    return { key: input.key, url: this.getUrl(input.key) };
  }

  async get(key: string): Promise<StoredObject | null> {
    const path = this.resolveKey(key);
    try {
      const data = await readFile(path);
      let contentType: string | undefined;
      try {
        contentType = await readFile(`${path}.contenttype`, "utf8");
      } catch {
        contentType = guessContentType(key);
      }
      return { data: new Uint8Array(data), contentType };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    const path = this.resolveKey(key);
    for (const target of [path, `${path}.contenttype`]) {
      try {
        await unlink(target);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
