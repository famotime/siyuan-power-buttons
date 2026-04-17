import { describe, expect, it, vi } from 'vitest';
import { executeBuiltinCommandStable } from '@/core/commands/builtin-stable';

describe('builtin stable runner', () => {
  it('opens Siyuan app settings for the config builtin command', async () => {
    const openAppSetting = vi.fn();
    const runBuiltinCommandByDom = vi.fn(() => false);

    const result = await executeBuiltinCommandStable('config', {
      app: { id: 'app' },
      openAppSetting,
      openTab: vi.fn(),
      fetchPost: vi.fn(),
      runBuiltinCommandByDom,
    });

    expect(result).toBe(true);
    expect(openAppSetting).toHaveBeenCalledWith({ id: 'app' });
    expect(runBuiltinCommandByDom).not.toHaveBeenCalled();
  });

  it('prefers the DOM runner for daily notes before falling back to the API workflow', async () => {
    const runBuiltinCommandByDom = vi.fn(() => true);
    const fetchPost = vi.fn();

    const result = await executeBuiltinCommandStable('dailyNote', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab: vi.fn(),
      fetchPost,
      runBuiltinCommandByDom,
    });

    expect(result).toBe(true);
    expect(runBuiltinCommandByDom).toHaveBeenCalledWith('dailyNote');
    expect(fetchPost).not.toHaveBeenCalled();
  });

  it('creates and opens today\'s daily note through the Siyuan API when no native control is found', async () => {
    const openTab = vi.fn();
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: {
          notebooks: [
            { id: 'notebook-a', name: 'A', icon: '', sort: 0, closed: false },
          ],
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          conf: {
            dailyNoteSavePath: '/daily/{{now | date "2006-01-02"}}',
          },
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: '/daily/2026-04-18',
      })
      .mockResolvedValueOnce({
        code: 0,
        data: [],
      })
      .mockResolvedValueOnce({
        code: 0,
        data: '20260418-daily-note',
      });

    const result = await executeBuiltinCommandStable('dailyNote', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab,
      fetchPost,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(fetchPost).toHaveBeenNthCalledWith(1, '/api/notebook/lsNotebooks', '');
    expect(fetchPost).toHaveBeenNthCalledWith(2, '/api/notebook/getNotebookConf', {
      notebook: 'notebook-a',
    });
    expect(fetchPost).toHaveBeenNthCalledWith(3, '/api/template/renderSprig', {
      template: '/daily/{{now | date "2006-01-02"}}',
    });
    expect(fetchPost).toHaveBeenNthCalledWith(4, '/api/query/sql', {
      stmt: "SELECT id FROM blocks WHERE box = 'notebook-a' AND hpath = '/daily/2026-04-18' AND type = 'd' LIMIT 1",
    });
    expect(fetchPost).toHaveBeenNthCalledWith(5, '/api/filetree/createDocWithMd', {
      notebook: 'notebook-a',
      path: '/daily/2026-04-18',
      markdown: '',
    });
    expect(openTab).toHaveBeenCalledWith({
      app: { id: 'app' },
      doc: {
        id: '20260418-daily-note',
      },
    });
  });

  it('opens an existing daily note without recreating it when the rendered path already exists', async () => {
    const openTab = vi.fn();
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: {
          notebooks: [
            { id: 'notebook-a', name: 'A', icon: '', sort: 0, closed: false },
          ],
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          conf: {
            dailyNoteSavePath: '/daily/{{now | date "2006-01-02"}}',
          },
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: '/daily/2026-04-18',
      })
      .mockResolvedValueOnce({
        code: 0,
        data: [
          { id: 'existing-daily-note' },
        ],
      });

    const result = await executeBuiltinCommandStable('dailyNote', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab,
      fetchPost,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(fetchPost).toHaveBeenCalledTimes(4);
    expect(openTab).toHaveBeenCalledWith({
      app: { id: 'app' },
      doc: {
        id: 'existing-daily-note',
      },
    });
  });
});
