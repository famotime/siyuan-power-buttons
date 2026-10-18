import { describe, expect, it } from 'vitest';
import { getCharPinyinInitial, getPinyinInitials, matchKeyword } from '@/core/plugins/pinyin';

describe('pinyin matcher', () => {
  it('extracts pinyin initials correctly', () => {
    expect(getPinyinInitials('随心按')).toBe('sxa');
    expect(getPinyinInitials('思源笔记')).toBe('sybj');
    expect(getPinyinInitials('文档助手')).toBe('wdzs');
    expect(getPinyinInitials('设置')).toBe('sz');
    expect(getPinyinInitials('PowerButtons')).toBe('powerbuttons');
  });

  it('matches keyword by direct text or pinyin initials', () => {
    expect(matchKeyword('随心按', '随心')).toBe(true);
    expect(matchKeyword('随心按', 'sx')).toBe(true);
    expect(matchKeyword('随心按', 'sxa')).toBe(true);
    expect(matchKeyword('随心按', 'sxb')).toBe(false);
    expect(matchKeyword('思源笔记插件', 'sybj')).toBe(true);
    expect(matchKeyword('Power Buttons', 'power')).toBe(true);
  });
});
