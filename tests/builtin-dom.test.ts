/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { executeBuiltinCommandByDom } from "@/core/commands";

describe("builtin dom command runner", () => {
  it("clicks matching native controls for supported builtin commands", () => {
    document.body.innerHTML = `
      <button id="barSearch" type="button"></button>
      <div id="dockLeft">
        <button class="dock__item" data-type="outline" type="button"></button>
      </div>
    `;

    const searchButton = document.getElementById("barSearch") as HTMLButtonElement;
    const outlineButton = document.querySelector<HTMLButtonElement>("#dockLeft .dock__item[data-type='outline']");
    const searchClick = vi.fn();
    const outlineClick = vi.fn();

    searchButton.addEventListener("click", searchClick);
    outlineButton?.addEventListener("click", outlineClick);

    expect(executeBuiltinCommandByDom("globalSearch", document)).toBe(true);
    expect(executeBuiltinCommandByDom("outline", document)).toBe(true);
    expect(searchClick).toHaveBeenCalledTimes(1);
    expect(outlineClick).toHaveBeenCalledTimes(1);
  });

  it("returns false when no mapped native control is available", () => {
    document.body.innerHTML = `<div id="empty"></div>`;

    expect(executeBuiltinCommandByDom("globalSearch", document)).toBe(false);
    expect(executeBuiltinCommandByDom("not-supported", document)).toBe(false);
  });
});
