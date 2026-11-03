export interface PresetColor {
  id: string
  label: string
  hex: string
}

export const PRESET_COLORS: PresetColor[] = [
  {
    id: 'rose',
    label: '樱花红',
    hex: '#f43f5e',
  },
  {
    id: 'orange',
    label: '活力橙',
    hex: '#f97316',
  },
  {
    id: 'amber',
    label: '琥珀黄',
    hex: '#f59e0b',
  },
  {
    id: 'emerald',
    label: '翡翠绿',
    hex: '#10b981',
  },
  {
    id: 'teal',
    label: '薄荷青',
    hex: '#14b8a6',
  },
  {
    id: 'blue',
    label: '晴空蓝',
    hex: '#3b82f6',
  },
  {
    id: 'indigo',
    label: '经典靛',
    hex: '#6366f1',
  },
  {
    id: 'purple',
    label: '优雅紫',
    hex: '#8b5cf6',
  },
  {
    id: 'pink',
    label: '浪漫粉',
    hex: '#ec4899',
  },
  {
    id: 'slate',
    label: '矿石灰',
    hex: '#64748b',
  },
]

/**
 * 将 3 位或 6 位的 HEX 颜色转为 RGBA 字符串
 */
export function hexToRgba(hex: string, alpha = 1): string {
  if (!hex || typeof hex !== 'string') {
    return ''
  }
  let cleanHex = hex.trim().replace(/^#/, '')
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('')
  }
  if (cleanHex.length !== 6) {
    return ''
  }
  const r = Number.parseInt(cleanHex.substring(0, 2), 16)
  const g = Number.parseInt(cleanHex.substring(2, 4), 16)
  const b = Number.parseInt(cleanHex.substring(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return ''
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * 为侧栏卡片计算 CSS 样式变量
 */
export function getDockCardColorStyle(color?: string): Record<string, string> {
  if (!color || typeof color !== 'string') {
    return {}
  }
  const trimmed = color.trim()
  if (!trimmed) {
    return {}
  }

  const bg = hexToRgba(trimmed, 0.12) || trimmed
  const hoverBg = hexToRgba(trimmed, 0.2) || trimmed
  const border = hexToRgba(trimmed, 0.28) || trimmed
  const activeBg = hexToRgba(trimmed, 0.26) || trimmed
  const accent = trimmed

  return {
    '--dock-card-custom-bg': bg,
    '--dock-card-custom-hover-bg': hoverBg,
    '--dock-card-custom-border': border,
    '--dock-card-custom-active-bg': activeBg,
    '--dock-card-custom-accent': accent,
  }
}
