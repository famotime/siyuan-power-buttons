import { describe, expect, it } from 'vitest';
import {
  PRESET_COLORS,
  getDockCardColorStyle,
  hexToRgba,
} from '@/shared/color-utils';

describe('color utils', () => {
  it('converts 6-digit hex to rgba correctly', () => {
    expect(hexToRgba('#f43f5e', 0.12)).toBe('rgba(244, 63, 94, 0.12)');
    expect(hexToRgba('#3b82f6', 1)).toBe('rgba(59, 130, 246, 1)');
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
  });

  it('converts 3-digit hex to rgba correctly', () => {
    expect(hexToRgba('#f00', 0.2)).toBe('rgba(255, 0, 0, 0.2)');
    expect(hexToRgba('#fff', 0.8)).toBe('rgba(255, 255, 255, 0.8)');
  });

  it('handles invalid or empty hex gracefully', () => {
    expect(hexToRgba('')).toBe('');
    expect(hexToRgba('not-a-color')).toBe('');
    expect(hexToRgba(null as unknown as string)).toBe('');
  });

  it('generates dock card CSS variables when color is specified', () => {
    const style = getDockCardColorStyle('#3b82f6');
    expect(style['--dock-card-custom-bg']).toBe('rgba(59, 130, 246, 0.12)');
    expect(style['--dock-card-custom-hover-bg']).toBe('rgba(59, 130, 246, 0.2)');
    expect(style['--dock-card-custom-border']).toBe('rgba(59, 130, 246, 0.28)');
    expect(style['--dock-card-custom-active-bg']).toBe('rgba(59, 130, 246, 0.26)');
    expect(style['--dock-card-custom-accent']).toBe('#3b82f6');
  });

  it('returns empty object when color is missing or empty', () => {
    expect(getDockCardColorStyle(undefined)).toEqual({});
    expect(getDockCardColorStyle('')).toEqual({});
    expect(getDockCardColorStyle('   ')).toEqual({});
  });

  it('contains expected preset colors', () => {
    expect(PRESET_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(PRESET_COLORS.some(c => c.id === 'blue')).toBe(true);
    expect(PRESET_COLORS.some(c => c.id === 'rose')).toBe(true);
    expect(PRESET_COLORS.some(c => c.id === 'emerald')).toBe(true);
  });
});
