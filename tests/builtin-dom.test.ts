/* @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { executeBuiltinCommandByDom } from "@/core/commands";

describe("builtin dom command runner", () => {
  it("clicks matching native controls for supported builtin commands", () => {
    document.body.innerHTML = `
      <button data-menu-id="menuRecent" type="button"></button>
      <div id="dockRight">
        <button class="dock__item" data-type="backlinks" type="button"></button>
      </div>
    `;

    const recentButton = document.querySelector<HTMLButtonElement>('[data-menu-id="menuRecent"]');
    const backlinksButton = document.querySelector<HTMLButtonElement>("#dockRight .dock__item[data-type='backlinks']");
    const recentClick = vi.fn();
    const backlinksClick = vi.fn();

    recentButton?.addEventListener("click", recentClick);
    backlinksButton?.addEventListener("click", backlinksClick);

    expect(executeBuiltinCommandByDom("recentDocs", document)).toBe(true);
    expect(executeBuiltinCommandByDom("backlinks", document)).toBe(true);
    expect(recentClick).toHaveBeenCalledTimes(1);
    expect(backlinksClick).toHaveBeenCalledTimes(1);
  });

  it("returns false when no mapped native control is available", () => {
    document.body.innerHTML = `<div id="empty"></div>`;

    expect(executeBuiltinCommandByDom("recentDocs", document)).toBe(false);
    expect(executeBuiltinCommandByDom("not-supported", document)).toBe(false);
  });

  it("falls back to built-in alias ids across id, data-id, data-menu-id and data-type", () => {
    document.body.innerHTML = `
      <button data-id="barSettings" type="button"></button>
      <button data-menu-id="menuRecent" type="button"></button>
      <button data-type="barRiffCard" type="button"></button>
    `;

    const configButton = document.querySelector('[data-id="barSettings"]') as HTMLButtonElement;
    const recentButton = document.querySelector('[data-menu-id="menuRecent"]') as HTMLButtonElement;
    const riffCardButton = document.querySelector('[data-type="barRiffCard"]') as HTMLButtonElement;
    const configClick = vi.fn();
    const recentClick = vi.fn();
    const riffCardClick = vi.fn();

    configButton.addEventListener("click", configClick);
    recentButton.addEventListener("click", recentClick);
    riffCardButton.addEventListener("click", riffCardClick);

    expect(executeBuiltinCommandByDom("config", document)).toBe(true);
    expect(executeBuiltinCommandByDom("recentDocs", document)).toBe(true);
    expect(executeBuiltinCommandByDom("riffCard", document)).toBe(true);
    expect(configClick).toHaveBeenCalledTimes(1);
    expect(recentClick).toHaveBeenCalledTimes(1);
    expect(riffCardClick).toHaveBeenCalledTimes(1);
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

  it("ignores plugin-owned buttons when matching a builtin command by title fallback", () => {
    document.body.innerHTML = `
      <button aria-label="今日日记" data-power-buttons-owned="true" type="button"></button>
      <button id="native-daily-note" aria-label="今日日记" type="button"></button>
    `;

    const pluginOwnedButton = document.querySelector('button[data-power-buttons-owned="true"]') as HTMLButtonElement;
    const nativeButton = document.getElementById("native-daily-note") as HTMLButtonElement;
    const pluginOwnedClick = vi.fn();
    const nativeClick = vi.fn();

    pluginOwnedButton.addEventListener("click", pluginOwnedClick);
    nativeButton.addEventListener("click", nativeClick);

    expect(executeBuiltinCommandByDom("dailyNote", document)).toBe(true);
    expect(pluginOwnedClick).not.toHaveBeenCalled();
    expect(nativeClick).toHaveBeenCalledTimes(1);
  });

  it("returns false when the only matching element is owned by the plugin itself", () => {
    document.body.innerHTML = `
      <button aria-label="今日日记" data-power-buttons-owned="true" type="button"></button>
    `;

    const pluginOwnedButton = document.querySelector('button[data-power-buttons-owned="true"]') as HTMLButtonElement;
    const pluginOwnedClick = vi.fn();

    pluginOwnedButton.addEventListener("click", pluginOwnedClick);

    expect(executeBuiltinCommandByDom("dailyNote", document)).toBe(false);
    expect(pluginOwnedClick).not.toHaveBeenCalled();
  });
});
