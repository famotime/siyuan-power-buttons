import { describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { executeExperimentalClickSequence } from "@/core/commands";

describe("experimental click sequence", () => {
  it("executes a simple two-step click sequence in order", async () => {
    const dom = new JSDOM(`
      <div>
        <button id="barSettings">设置</button>
        <button>复制块引用</button>
      </div>
    `);
    const first = dom.window.document.getElementById("barSettings") as HTMLButtonElement;
    const second = dom.window.document.querySelectorAll("button")[1] as HTMLButtonElement;
    const events: string[] = [];

    first.addEventListener("click", () => {
      events.push("first");
    });
    second.addEventListener("click", () => {
      events.push("second");
    });

    const result = await executeExperimentalClickSequence({
      actionId: "barSettings",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "barSettings",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
          {
            selector: "text:复制块引用",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect(events).toEqual(["first", "second"]);
  });

  it("stops on the failing step when stopOnFailure is enabled", async () => {
    const dom = new JSDOM(`
      <div>
        <button id="barSettings">设置</button>
      </div>
    `);
    const onStepError = vi.fn();

    const result = await executeExperimentalClickSequence({
      actionId: "barSettings",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "barSettings",
            timeoutMs: 50,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
          {
            selector: "text:不存在",
            timeoutMs: 50,
            retryCount: 1,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
      onStepError,
    });

    expect(result).toBe(false);
    expect(onStepError).toHaveBeenCalledWith({
      index: 1,
      selector: "text:不存在",
    });
  });

  it("matches simple identifiers against data-name during click sequences", async () => {
    const dom = new JSDOM(`
      <div>
        <button data-name="copyBlockRef">复制块引用</button>
      </div>
    `);
    const button = dom.window.document.querySelector("button") as HTMLButtonElement;
    const clickHandler = vi.fn();
    button.addEventListener("click", clickHandler);

    const result = await executeExperimentalClickSequence({
      actionId: "copyBlockRef",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "copyBlockRef",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  it("uses showPicker for select elements during click sequences when available", async () => {
    const dom = new JSDOM(`
      <div>
        <select id="lang" class="b3-select fn__flex-center fn__size200">
          <option value="en_US">English (en_US)</option>
          <option value="zh_CN" selected>简体中文 (zh_CN)</option>
        </select>
      </div>
    `);
    const select = dom.window.document.getElementById("lang") as HTMLSelectElement & {
      showPicker?: () => void;
    };
    const showPicker = vi.fn();
    select.showPicker = showPicker;

    const result = await executeExperimentalClickSequence({
      actionId: "lang",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "lang",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it("sets select values by option value and dispatches input plus change", async () => {
    const dom = new JSDOM(`
      <select id="lang">
        <option value="en_US">English (en_US)</option>
        <option value="zh_CN" selected>简体中文 (zh_CN)</option>
      </select>
    `);
    const select = dom.window.document.getElementById("lang") as HTMLSelectElement;
    const events: string[] = [];

    select.addEventListener("input", () => {
      events.push("input");
    });
    select.addEventListener("change", () => {
      events.push("change");
    });

    const result = await executeExperimentalClickSequence({
      actionId: "lang",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "lang",
            value: "en_US",
            valueMode: "value",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect(select.value).toBe("en_US");
    expect(events).toEqual(["input", "change"]);
  });

  it("sets select values by option text", async () => {
    const dom = new JSDOM(`
      <select id="lang">
        <option value="en_US">English (en_US)</option>
        <option value="zh_CN" selected>简体中文 (zh_CN)</option>
      </select>
    `);

    const result = await executeExperimentalClickSequence({
      actionId: "lang",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "lang",
            value: "English (en_US)",
            valueMode: "text",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect((dom.window.document.getElementById("lang") as HTMLSelectElement).value).toBe("en_US");
  });

  it("sets input and textarea values through the same step model", async () => {
    const dom = new JSDOM(`
      <input id="keyword" value="" />
      <textarea id="note"></textarea>
    `);

    const result = await executeExperimentalClickSequence({
      actionId: "keyword",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "keyword",
            value: "english",
            valueMode: "value",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
          {
            selector: "note",
            value: "Line 1",
            valueMode: "text",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
    });

    expect(result).toBe(true);
    expect((dom.window.document.getElementById("keyword") as HTMLInputElement).value).toBe("english");
    expect((dom.window.document.getElementById("note") as HTMLTextAreaElement).value).toBe("Line 1");
  });

  it("fails when a value step cannot match a select option", async () => {
    const dom = new JSDOM(`
      <select id="lang">
        <option value="zh_CN" selected>简体中文 (zh_CN)</option>
      </select>
    `);
    const onStepError = vi.fn();

    const result = await executeExperimentalClickSequence({
      actionId: "lang",
      experimentalClickSequence: {
        stopOnFailure: true,
        steps: [
          {
            selector: "lang",
            value: "en_US",
            valueMode: "value",
            timeoutMs: 100,
            retryCount: 0,
            retryDelayMs: 0,
            delayAfterMs: 0,
          },
        ],
      },
    }, {
      document: dom.window.document,
      root: dom.window.document,
      windowTarget: dom.window,
      onStepError,
    });

    expect(result).toBe(false);
    expect(onStepError).toHaveBeenCalledWith({
      index: 0,
      selector: "lang",
    });
  });
});
