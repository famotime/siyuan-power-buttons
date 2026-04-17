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

  it("falls back to built-in alias ids across id, data-id, data-menu-id and data-type", () => {
    document.body.innerHTML = `
      <button data-id="barSettings" type="button"></button>
      <button data-menu-id="menuRecent" type="button"></button>
      <button data-type="toolbarMore" type="button"></button>
    `;

    const configButton = document.querySelector('[data-id="barSettings"]') as HTMLButtonElement;
    const recentButton = document.querySelector('[data-menu-id="menuRecent"]') as HTMLButtonElement;
    const menuButton = document.querySelector('[data-type="toolbarMore"]') as HTMLButtonElement;
    const configClick = vi.fn();
    const recentClick = vi.fn();
    const menuClick = vi.fn();

    configButton.addEventListener("click", configClick);
    recentButton.addEventListener("click", recentClick);
    menuButton.addEventListener("click", menuClick);

    expect(executeBuiltinCommandByDom("config", document)).toBe(true);
    expect(executeBuiltinCommandByDom("recentDocs", document)).toBe(true);
    expect(executeBuiltinCommandByDom("mainMenu", document)).toBe(true);
    expect(configClick).toHaveBeenCalledTimes(1);
    expect(recentClick).toHaveBeenCalledTimes(1);
    expect(menuClick).toHaveBeenCalledTimes(1);
  });

  it("finds toolbar buttons by svg icon alias and dispatches a mouse event when click throws", () => {
    document.body.innerHTML = `
      <button type="button">
        <svg><use href="#iconMore"></use></svg>
      </button>
    `;

    const button = document.querySelector("button") as HTMLButtonElement;
    const nativeClick = vi.spyOn(button, "click").mockImplementation(() => {
      throw new Error("click not supported");
    });
    const dispatchedClick = vi.fn();
    button.addEventListener("click", dispatchedClick);

    expect(executeBuiltinCommandByDom("mainMenu", document)).toBe(true);
    expect(nativeClick).toHaveBeenCalledTimes(1);
    expect(dispatchedClick).toHaveBeenCalledTimes(1);
  });

  it("falls back to the builtin command title when the native control only exposes an aria label", () => {
    document.body.innerHTML = `
      <button aria-label="今日日记" type="button">
        <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></svg>
      </button>
    `;

    const dailyNoteButton = document.querySelector('button[aria-label="今日日记"]') as HTMLButtonElement;
    const dailyNoteClick = vi.fn();

    dailyNoteButton.addEventListener("click", dailyNoteClick);

    expect(executeBuiltinCommandByDom("dailyNote", document)).toBe(true);
    expect(dailyNoteClick).toHaveBeenCalledTimes(1);
  });
});
