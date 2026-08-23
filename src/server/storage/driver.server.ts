// The one place that picks a StorageDriver. Swapping to a real bucket later
// (S3-compatible, R2, etc.) means adding a driver class next to
// LocalStorageDriver and changing the instantiation below — nothing else in
// the app should import a concrete driver directly.
import { LocalStorageDriver } from "./local-driver.server";
import type { StorageDriver } from "./types";

function createStorage(): StorageDriver {
  const root = process.env["STORAGE_LOCAL_ROOT"] || "./.data/storage";
  const baseUrl = process.env["STORAGE_BASE_URL"] || "/api/storage";
  return new LocalStorageDriver(root, baseUrl);
}

let _storage: StorageDriver | undefined;

export const storage: StorageDriver = new Proxy({} as StorageDriver, {
  get(_, prop, receiver) {
    if (!_storage) _storage = createStorage();
    return Reflect.get(_storage, prop, receiver);
  },
});
