// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { findCanvasMountTarget } from '@/core/surfaces/canvas-mount-target';

describe('canvas mount target', () => {
  it('prefers the visible breadcrumb readonly anchor over the util host', () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar">
            <button data-type="readonly" class="protyle-breadcrumb__icon" type="button">只读</button>
          </div>
        </div>
        <div class="protyle-util">
          <div class="block__icons"></div>
        </div>
      </div>
    `;

    const target = findCanvasMountTarget(document);

    expect(target?.kind).toBe('breadcrumb');
    expect(target?.anchor?.getAttribute('data-type')).toBe('readonly');
  });

  it('falls back to the util host when the breadcrumb anchor is hidden', () => {
    document.body.innerHTML = `
      <div class="layout__center">
        <div class="protyle">
          <div class="protyle-breadcrumb__bar fn__hidden">
            <button data-type="readonly" class="protyle-breadcrumb__icon" type="button">只读</button>
          </div>
          <div class="protyle-util">
            <div class="block__icons"></div>
          </div>
        </div>
      </div>
    `;

    const target = findCanvasMountTarget(document);

    expect(target?.kind).toBe('util');
    expect(target?.anchor).toBeNull();
    expect(target?.container.classList.contains('block__icons')).toBe(true);
  });
});
