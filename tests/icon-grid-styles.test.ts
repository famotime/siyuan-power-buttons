import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("icon grid styles", () => {
  const stylesheet = readFileSync(path.resolve(process.cwd(), "src/index.scss"), "utf8");

  it("removes visible borders from IconPark grid items", () => {
    expect(stylesheet).toContain(".icon-grid__item {");
    expect(stylesheet).toContain("border: 0;");
    expect(stylesheet).toContain("background: transparent;");
    expect(stylesheet).toContain("box-shadow: none;");
  });

  it("renders larger icon previews in the IconPark grid", () => {
    expect(stylesheet).toContain(".icon-grid__preview {");
    expect(stylesheet).toContain("width: 40px;");
    expect(stylesheet).toContain("height: 40px;");
  });
});
