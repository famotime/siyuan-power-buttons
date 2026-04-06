import { fetchSyncPost } from "siyuan";
import { getAppVersion } from "@/core/system/app-version";

export async function version(): Promise<string | null> {
  return getAppVersion((url, data) => fetchSyncPost(url, data));
}
