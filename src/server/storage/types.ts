// Storage abstraction — nothing in the app uses file storage yet (no
// avatar/logo upload UI exists), but Presence/Settings will eventually want
// one. Keep this interface small and swap the driver in server/storage/index.ts
// when a real bucket (S3-compatible, R2, etc.) replaces local disk.
export type PutObjectInput = {
  /** Storage key/path, e.g. "org/<id>/logo.png". No leading slash, no "..". */
  key: string;
  data: Uint8Array;
  contentType?: string | undefined;
};

export type StoredObject = {
  data: Uint8Array;
  contentType: string | undefined;
};

export interface StorageDriver {
  put(input: PutObjectInput): Promise<{ key: string; url: string }>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Where this key is reachable from the browser. */
  getUrl(key: string): string;
}
