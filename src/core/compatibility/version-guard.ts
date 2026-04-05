export type ExperimentalFeatureKey = "shortcutAdapter" | "clickSequenceAdapter";

type FrontendType = "desktop" | "desktop-window" | "browser-desktop" | "mobile" | "browser-mobile" | string;

const DESKTOP_FRONTENDS = new Set<FrontendType>([
  "desktop",
  "desktop-window",
  "browser-desktop",
]);

const FEATURE_LABELS: Record<ExperimentalFeatureKey, string> = {
  shortcutAdapter: "实验快捷键适配",
  clickSequenceAdapter: "实验点击序列",
};

function normalizeVersionParts(version: string): number[] {
  return version
    .split(".")
    .map(part => Number.parseInt(part.replace(/[^\d].*$/, ""), 10))
    .map(part => (Number.isFinite(part) ? part : 0));
}

export function compareVersionStrings(left: string, right: string): number {
  const leftParts = normalizeVersionParts(left);
  const rightParts = normalizeVersionParts(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart > rightPart) {
      return 1;
    }
    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

export function getExperimentalFeatureSupport(input: {
  feature: ExperimentalFeatureKey;
  enabled: boolean;
  frontend: FrontendType;
  appVersion?: string | null;
  minAppVersion: string;
}): { supported: boolean; reason?: string } {
  const label = FEATURE_LABELS[input.feature];
  if (!input.enabled) {
    return {
      supported: false,
      reason: `${label}当前未启用。`,
    };
  }

  if (!DESKTOP_FRONTENDS.has(input.frontend)) {
    return {
      supported: false,
      reason: `${label}当前仅支持桌面端，当前前端：${input.frontend}。`,
    };
  }

  if (input.appVersion && compareVersionStrings(input.appVersion, input.minAppVersion) < 0) {
    return {
      supported: false,
      reason: `${label}要求思源版本 >= ${input.minAppVersion}，当前版本：${input.appVersion}。`,
    };
  }

  return {
    supported: true,
  };
}
