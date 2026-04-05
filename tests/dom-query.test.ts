import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { findElementBySmartSelector } from "@/core/commands";

describe("dom query", () => {
  it("finds elements by simple identifier priority", () => {
    const dom = new JSDOM(`
      <div>
        <button id="barSettings">设置</button>
        <button data-id="barSettings">重复设置</button>
      </div>
    `);

    const result = findElementBySmartSelector("barSettings", dom.window.document);

    expect(result?.id).toBe("barSettings");
  });

  it("finds elements by text: selector", () => {
    const dom = new JSDOM(`
      <div>
        <button>复制块引用</button>
      </div>
    `);

    const result = findElementBySmartSelector("text:复制块引用", dom.window.document);

    expect(result?.textContent?.trim()).toBe("复制块引用");
  });

  it("supports raw css selectors", () => {
    const dom = new JSDOM(`
      <div>
        <button class="b3-menu__item">菜单</button>
      </div>
    `);

    const result = findElementBySmartSelector(".b3-menu__item", dom.window.document);

    expect(result?.className).toBe("b3-menu__item");
  });
});
