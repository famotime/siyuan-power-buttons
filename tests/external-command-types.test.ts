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
    expect(parseExternalCommandActionId("siyuan-doc-assist:")).toBeNull();
    expect(parseExternalCommandActionId("siyuan-doc-assist:insert:doc-summary")).toBeNull();
    expect(parseExternalCommandActionId(" siyuan-doc-assist:insert-doc-summary")).toBeNull();
    expect(parseExternalCommandActionId("siyuan-doc-assist:insert-doc-summary ")).toBeNull();
    expect(parseExternalCommandActionId("siyuan-doc-assist: insert-doc-summary")).toBeNull();
    expect(parseExternalCommandActionId("siyuan-doc-assist :insert-doc-summary")).toBeNull();
    expect(isExternalCommandActionId("")).toBe(false);
  });

  it("preserves provider-specific unset placeholders", () => {
    expect(parseExternalCommandActionId("empty-provider:__unset__")).toEqual({
      providerId: "empty-provider",
      commandId: "__unset__",
    });
    expect(isExternalCommandActionId("empty-provider:__unset__")).toBe(true);
  });

  it("refuses to format invalid action id parts", () => {
    expect(() => formatExternalCommandActionId("", "cmd")).toThrow();
    expect(() => formatExternalCommandActionId(" ", "cmd")).toThrow();
    expect(() => formatExternalCommandActionId("a:b", "cmd")).toThrow();
    expect(() => formatExternalCommandActionId("provider", "")).toThrow();
    expect(() => formatExternalCommandActionId("provider", "cmd:extra")).toThrow();
    expect(() => formatExternalCommandActionId(" provider", "cmd")).toThrow();
    expect(() => formatExternalCommandActionId("provider", "cmd ")).toThrow();
  });

  it("allows provider-specific unset placeholders", () => {
    expect(formatExternalCommandActionId("empty-provider", "__unset__")).toBe("empty-provider:__unset__");
  });
});
