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
});
