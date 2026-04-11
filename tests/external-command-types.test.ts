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

  it("treats placeholder action ids as unset", () => {
    expect(parseExternalCommandActionId("__external__:__unset__")).toBeNull();
    expect(isExternalCommandActionId("__external__:__unset__")).toBe(false);
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

  it("rejects formatting the reserved placeholder pair", () => {
    expect(() => formatExternalCommandActionId("__external__", "__unset__")).toThrow();
  });
});
