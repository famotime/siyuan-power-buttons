import type {
  ClickSequenceStep,
  ExperimentalClickSequenceConfig,
  PowerButtonItem,
} from "@/shared/types";
import { findElementBySmartSelector } from "@/core/commands/dom-query";

type StepError = {
  index: number;
  selector: string;
};

function defaultClickSequenceStep(actionId: string, input?: Partial<ClickSequenceStep>): ClickSequenceStep {
  const normalizedValue = typeof input?.value === "string" && input.value.length > 0
    ? input.value
    : undefined;

  return {
    selector: input?.selector || actionId || "text:设置",
    value: normalizedValue,
    valueMode: input?.valueMode === "text" ? "text" : "value",
    timeoutMs: input?.timeoutMs ?? 5000,
    retryCount: input?.retryCount ?? 2,
    retryDelayMs: input?.retryDelayMs ?? 300,
    delayAfterMs: input?.delayAfterMs ?? 200,
  };
}

function defaultExperimentalClickSequence(
  actionId: string,
  input?: ExperimentalClickSequenceConfig,
): ExperimentalClickSequenceConfig {
  return {
    steps: input?.steps?.length
      ? input.steps.map(step => defaultClickSequenceStep(actionId, step))
      : [defaultClickSequenceStep(actionId)],
    stopOnFailure: input?.stopOnFailure ?? true,
  };
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeOptionText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

async function waitForElement(
  selector: string,
  options: {
    root: ParentNode;
    timeoutMs: number;
    pollIntervalMs?: number;
  },
): Promise<HTMLElement | null> {
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  const startedAt = Date.now();

  do {
    const element = findElementBySmartSelector(selector, options.root);
    if (element) {
      return element;
    }
    if (Date.now() - startedAt >= options.timeoutMs) {
      return null;
    }
    await sleep(pollIntervalMs);
  } while (true);
}

async function resolveStepElement(step: ClickSequenceStep, root: ParentNode): Promise<HTMLElement | null> {
  const attempts = Math.max(0, step.retryCount) + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const element = await waitForElement(step.selector, {
      root,
      timeoutMs: step.timeoutMs,
    });
    if (element) {
      return element;
    }
    if (attempt < attempts - 1) {
      await sleep(step.retryDelayMs);
    }
  }

  return null;
}

function clickElement(element: HTMLElement, windowTarget: Window): boolean {
  const pickerElement = element as HTMLElement & {
    showPicker?: () => void;
  };

  if (typeof pickerElement.showPicker === 'function') {
    try {
      element.focus();
      pickerElement.showPicker();
      return true;
    } catch {
      // Fall through to click-based activation when the picker API is blocked.
    }
  }

  try {
    element.click();
    return true;
  } catch {
    return element.dispatchEvent(new windowTarget.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: windowTarget,
    }));
  }
}

function dispatchFormEvents(element: HTMLElement, windowTarget: Window): void {
  element.dispatchEvent(new windowTarget.Event("input", { bubbles: true }));
  element.dispatchEvent(new windowTarget.Event("change", { bubbles: true }));
}

function setFormControlValue(step: ClickSequenceStep, element: HTMLElement, windowTarget: Window): boolean {
  if (element instanceof windowTarget.HTMLSelectElement) {
    const options = Array.from(element.options);
    const match = step.valueMode === "text"
      ? options.find(option => normalizeOptionText(option.textContent) === step.value)
      : options.find(option => option.value === step.value);

    if (!match) {
      return false;
    }

    element.value = match.value;
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  if (element instanceof windowTarget.HTMLTextAreaElement) {
    element.value = step.value || "";
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  if (element instanceof windowTarget.HTMLInputElement) {
    const unsupportedTypes = new Set(["checkbox", "radio"]);
    if (unsupportedTypes.has((element.type || "text").toLowerCase())) {
      return false;
    }

    element.value = step.value || "";
    dispatchFormEvents(element, windowTarget);
    return true;
  }

  return false;
}

export async function executeExperimentalClickSequence(
  item: Pick<PowerButtonItem, "actionId" | "experimentalClickSequence">,
  options: {
    document?: Document;
    root?: ParentNode;
    windowTarget?: Window;
    onStepError?: (error: StepError) => void | Promise<void>;
  } = {},
): Promise<boolean> {
  const clickSequence = defaultExperimentalClickSequence(item.actionId, item.experimentalClickSequence);
  const ownerDocument = options.document || document;
  const root = options.root || ownerDocument;
  const windowTarget = options.windowTarget || window;
  let allStepsSucceeded = true;

  for (let index = 0; index < clickSequence.steps.length; index += 1) {
    const step = clickSequence.steps[index];
    const element = await resolveStepElement(step, root);
    const isValueStep = typeof step.value === "string";

    if (!element || !(isValueStep ? setFormControlValue(step, element, windowTarget) : clickElement(element, windowTarget))) {
      allStepsSucceeded = false;
      await options.onStepError?.({
        index,
        selector: step.selector,
      });
      if (clickSequence.stopOnFailure) {
        return false;
      }
      continue;
    }

    await sleep(step.delayAfterMs);
  }

  return allStepsSucceeded;
}
