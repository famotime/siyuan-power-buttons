import { describe, expect, it, vi } from "vitest";
import { getAppVersion } from "@/core/system/app-version";

describe("app version adapter", () => {
  it("reads the current Siyuan version through the kernel api", async () => {
    const fetchSyncPost = vi.fn().mockResolvedValue({
      code: 0,
      data: "3.5.7",
    });

    await expect(getAppVersion(fetchSyncPost as never)).resolves.toBe("3.5.7");
    expect(fetchSyncPost).toHaveBeenCalledWith("/api/system/version", "");
  });

  it("returns null when the kernel api reports a failure", async () => {
    const fetchSyncPost = vi.fn().mockResolvedValue({
      code: -1,
      data: "ignored",
    });

    await expect(getAppVersion(fetchSyncPost as never)).resolves.toBeNull();
  });
});
