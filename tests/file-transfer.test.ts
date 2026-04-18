// @vitest-environment jsdom

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createDefaultConfig } from '@/core/config';
import { exportConfigFile } from '@/features/settings/file-transfer';

describe('file transfer', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('exports config files with a datetime suffix in the download filename', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T14:30:25'));

    const anchor = document.createElement('a');
    const ownerDocument = {
      createElement: vi.fn(() => anchor),
    } as unknown as Document;
    const urlApi = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    };

    exportConfigFile(createDefaultConfig(), ownerDocument, urlApi);

    expect(urlApi.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor.download).toBe('siyuan-power-buttons-config-20260418-143025.json');
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
