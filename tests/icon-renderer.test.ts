/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  renderBuiltinIconMarkup,
  renderIconMarkup,
} from "@/shared/icon-renderer";

describe("builtin icon renderer", () => {
  it("uses host sprite symbols when the icon id exists", () => {
    document.body.innerHTML = `
      <svg aria-hidden="true">
        <symbol id="iconSearch" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></symbol>
      </svg>
    `;

    const markup = renderBuiltinIconMarkup("iconSearch", document);

    expect(markup).toContain("xlink:href=\"#iconSearch\"");
  });

  it("falls back to bundled svg markup when the host sprite does not include the icon id", () => {
    document.body.innerHTML = `
      <svg aria-hidden="true">
        <symbol id="iconSearch" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" /></symbol>
      </svg>
    `;

    const markup = renderBuiltinIconMarkup("iconHome", document);

    expect(markup).not.toContain("xlink:href=\"#iconHome\"");
    expect(markup).toContain("<path");
    expect(markup).toContain("viewBox=\"0 0 24 24\"");
  });

  it("renders IconPark markup from the generated local catalog", () => {
    const markup = renderIconMarkup({
      iconType: "iconpark",
      iconValue: "iconpark:Search",
    }, document);

    expect(markup).toContain("<svg");
    expect(markup).toContain("viewBox=");
    expect(markup).toContain("currentColor");
  });

  it("falls back to the default IconPark icon when an IconPark id is unknown", () => {
    const markup = renderIconMarkup({
      iconType: "iconpark",
      iconValue: "iconpark:DoesNotExist",
    }, document);

    expect(markup).toContain("<svg");
    expect(markup).toContain("currentColor");
  });
});
