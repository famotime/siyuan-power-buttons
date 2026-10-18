const ZH_BOUNDARIES = '啊芭擦搭蛾发噶哈击喀垃妈拿哦啪期然撒塌挖昔压匝座';
const ZH_LETTERS = 'abcdefghjklmnopqrstwxyz';

/**
 * 获取单个汉字的拼音首字母（小写）
 * 非汉字或超出范围则原样返回小写或空字符
 */
export function getCharPinyinInitial(char: string): string {
  if (!char) return '';
  if (/[a-zA-Z0-9]/.test(char)) {
    return char.toLowerCase();
  }

  for (let i = 0; i < ZH_LETTERS.length; i++) {
    if (
      char.localeCompare(ZH_BOUNDARIES[i], 'zh-CN') >= 0
      && char.localeCompare(ZH_BOUNDARIES[i + 1], 'zh-CN') < 0
    ) {
      return ZH_LETTERS[i];
    }
  }

  return '';
}

/**
 * 提取文本中所有汉字/字母的拼音首字母串
 */
export function getPinyinInitials(text: string): string {
  if (!text) return '';
  let result = '';
  for (const char of text) {
    const initial = getCharPinyinInitial(char);
    if (initial) {
      result += initial;
    }
  }
  return result;
}

/**
 * 模糊匹配关键词
 * 支持：
 * 1. 目标字符串直接包含关键词（不区分大小写）
 * 2. 目标字符串拼音首字母包含关键词（小写）
 */
export function matchKeyword(target: string, query: string, initials?: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (!target) return false;

  const lowerTarget = target.toLowerCase();
  if (lowerTarget.includes(q)) {
    return true;
  }

  const targetInitials = initials ?? getPinyinInitials(target);
  if (targetInitials.includes(q)) {
    return true;
  }

  return false;
}
