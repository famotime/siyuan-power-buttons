import { describe, expect, it } from "vitest";
import {
  formatExternalCommandActionId,
  isExternalCommandActionId,
  parseExternalCommandActionId,
} from "@/core/commands/external-command-types";

describe("external command action ids", () => {
  it("formats and parses provider command ids", () => {
    const actionId = formatExternalCommandActionId("siyuan-doc-assist", "insert-doc-summary");

    expect(actionId).toBe("siyuan-doc-assist:insert-doc-summary");
    expect(parseExternalCommandActionId(actionId)).toEqual({
      providerId: "siyuan-doc-assist",
      commandId: "insert-doc-summary",
    });
    expect(isExternalCommandActionId(actionId)).toBe(true);
  });

  it("rejects malformed external command ids", () => {
    expect(parseExternalCommandActionId("missing-separator")).toBeNull();
    expect(parseExternalCommandActionId(":insert-doc-summary")).toBeNull();
    expect(isExternalCommandActionId("")).toBe(false);
  });
});
