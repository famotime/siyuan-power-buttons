import { describe, expect, it } from "vitest";
import {
  createDefaultConfig,
  exportConfigAsJson,
  importConfigFromJson,
} from "@/core/config";

describe("config import and export", () => {
  it("exports formatted json that can be imported back", () => {
    const config = createDefaultConfig();

    const serialized = exportConfigAsJson(config);
    const imported = importConfigFromJson(serialized);

    expect(imported).toEqual(config);
  });

  it("rejects invalid json documents", () => {
    expect(() => importConfigFromJson("{ broken json")).toThrow(/JSON/);
  });
});
