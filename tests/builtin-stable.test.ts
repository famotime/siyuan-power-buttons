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

  it('restarts plugins by toggling bazaar plugin availability off and on', async () => {
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: null,
      })
      .mockResolvedValueOnce({
        code: 0,
        data: null,
      });
    const reloadWindow = vi.fn();

    const result = await executeBuiltinCommandStable('restartPlugins', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab: vi.fn(),
      fetchPost,
      getBazaarConfig: () => ({
        trust: true,
        petalDisabled: false,
      }),
      reloadWindow,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(fetchPost).toHaveBeenNthCalledWith(1, '/api/setting/setBazaar', {
      trust: true,
      petalDisabled: true,
    });
    expect(fetchPost).toHaveBeenNthCalledWith(2, '/api/setting/setBazaar', {
      trust: true,
      petalDisabled: false,
    });
    expect(reloadWindow).toHaveBeenCalledTimes(1);
  });

  it('returns false when plugin re-enable fails after a successful disable', async () => {
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: null,
      })
      .mockResolvedValueOnce({
        code: 1,
        msg: 'enable failed',
      });

    const result = await executeBuiltinCommandStable('restartPlugins', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab: vi.fn(),
      fetchPost,
      getBazaarConfig: () => ({
        trust: true,
        petalDisabled: false,
      }),
      reloadWindow: vi.fn(),
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(false);
    expect(fetchPost).toHaveBeenCalledTimes(2);
  });

  it('does not reload the window when the plugin restart sequence fails', async () => {
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: null,
      })
      .mockResolvedValueOnce({
        code: 1,
        msg: 'enable failed',
      });
    const reloadWindow = vi.fn();

    const result = await executeBuiltinCommandStable('restartPlugins', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab: vi.fn(),
      fetchPost,
      getBazaarConfig: () => ({
        trust: true,
        petalDisabled: false,
      }),
      reloadWindow,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(false);
    expect(reloadWindow).not.toHaveBeenCalled();
  });

  it('returns false without calling the API when bazaar config is unavailable for plugin restart', async () => {
    const fetchPost = vi.fn();

    const result = await executeBuiltinCommandStable('restartPlugins', {
      app: { id: 'app' },
      openAppSetting: vi.fn(),
      openTab: vi.fn(),
      fetchPost,
      getBazaarConfig: () => null,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(false);
    expect(fetchPost).not.toHaveBeenCalled();
  });

  it('skips notebooks without a daily note path and falls back to the next available notebook', async () => {
    const openTab = vi.fn();
    const fetchPost = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        data: {
          notebooks: [
            { id: 'notebook-a', name: 'A', icon: '', sort: 0, closed: false },
            { id: 'notebook-b', name: 'B', icon: '', sort: 1, closed: false },
          ],
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          conf: {
            dailyNoteSavePath: '',
          },
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
          { id: 'existing-daily-note-b' },
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
    expect(fetchPost).toHaveBeenNthCalledWith(1, '/api/notebook/lsNotebooks', '');
    expect(fetchPost).toHaveBeenNthCalledWith(2, '/api/notebook/getNotebookConf', {
      notebook: 'notebook-a',
    });
    expect(fetchPost).toHaveBeenNthCalledWith(3, '/api/notebook/getNotebookConf', {
      notebook: 'notebook-b',
    });
    expect(fetchPost).toHaveBeenNthCalledWith(4, '/api/template/renderSprig', {
      template: '/daily/{{now | date "2006-01-02"}}',
    });
    expect(fetchPost).toHaveBeenNthCalledWith(5, '/api/query/sql', {
      stmt: "SELECT id FROM blocks WHERE box = 'notebook-b' AND hpath = '/daily/2026-04-18' AND type = 'd' LIMIT 1",
    });
    expect(openTab).toHaveBeenCalledWith({
      app: { id: 'app' },
      doc: {
        id: 'existing-daily-note-b',
      },
    });
  });

  it('toggles left, right, and bottom dock layout via layout togglePin', async () => {
    const leftTogglePin = vi.fn();
    const rightTogglePin = vi.fn();
    const bottomTogglePin = vi.fn();

    const layout = {
      leftDock: { togglePin: leftTogglePin, isFloating: () => false },
      rightDock: { togglePin: rightTogglePin, isFloating: () => false },
      bottomDock: { togglePin: bottomTogglePin, isFloating: () => false },
    };

    const leftResult = await executeBuiltinCommandStable('switchLeftDock', {
      getLayout: () => layout,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(leftResult).toBe(true);
    expect(leftTogglePin).toHaveBeenCalledTimes(1);

    const rightResult = await executeBuiltinCommandStable('switchRightDock', {
      getLayout: () => layout,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(rightResult).toBe(true);
    expect(rightTogglePin).toHaveBeenCalledTimes(1);

    const bottomResult = await executeBuiltinCommandStable('switchBottomDock', {
      getLayout: () => layout,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(bottomResult).toBe(true);
    expect(bottomTogglePin).toHaveBeenCalledTimes(1);
  });

  it('falls back to globalCommand when dock layout is not available', async () => {
    const globalCommand = vi.fn(() => true);

    const result = await executeBuiltinCommandStable('switchLeftDock', {
      globalCommand,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(globalCommand).toHaveBeenCalledWith('switchLeftDock');
  });

  it('falls back to DOM runner when layout and globalCommand are not available', async () => {
    const runBuiltinCommandByDom = vi.fn(() => true);

    const result = await executeBuiltinCommandStable('switchLeftDock', {
      runBuiltinCommandByDom,
    });

    expect(result).toBe(true);
    expect(runBuiltinCommandByDom).toHaveBeenCalledWith('switchLeftDock');
  });

  it('handles switchAllDock by making all docks floating when some are fixed', async () => {
    const leftTogglePin = vi.fn();
    const rightTogglePin = vi.fn();
    const bottomTogglePin = vi.fn();

    const layout = {
      leftDock: { togglePin: leftTogglePin, isFloating: () => true },
      rightDock: { togglePin: rightTogglePin, isFloating: () => false },
      bottomDock: { togglePin: bottomTogglePin, isFloating: () => false },
    };

    const result = await executeBuiltinCommandStable('switchAllDock', {
      getLayout: () => layout,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    // Left was already floating, so it should not be toggled
    expect(leftTogglePin).not.toHaveBeenCalled();
    // Right and bottom were fixed, so they should be toggled to floating
    expect(rightTogglePin).toHaveBeenCalledTimes(1);
    expect(bottomTogglePin).toHaveBeenCalledTimes(1);
  });

  it('handles switchAllDock by toggling all docks to fixed when all are floating', async () => {
    const leftTogglePin = vi.fn();
    const rightTogglePin = vi.fn();
    const bottomTogglePin = vi.fn();

    const layout = {
      leftDock: { togglePin: leftTogglePin, isFloating: () => true },
      rightDock: { togglePin: rightTogglePin, isFloating: () => true },
      bottomDock: { togglePin: bottomTogglePin, isFloating: () => true },
    };

    const result = await executeBuiltinCommandStable('switchAllDock', {
      getLayout: () => layout,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(leftTogglePin).toHaveBeenCalledTimes(1);
    expect(rightTogglePin).toHaveBeenCalledTimes(1);
    expect(bottomTogglePin).toHaveBeenCalledTimes(1);
  });

  it('handles switchAllDock fallback to globalCommand when layout is absent', async () => {
    const globalCommand = vi.fn();

    const result = await executeBuiltinCommandStable('switchAllDock', {
      globalCommand,
      runBuiltinCommandByDom: vi.fn(() => false),
    });

    expect(result).toBe(true);
    expect(globalCommand).toHaveBeenCalledWith('switchLeftDock');
    expect(globalCommand).toHaveBeenCalledWith('switchRightDock');
    expect(globalCommand).toHaveBeenCalledWith('switchBottomDock');
  });

  it('delegates dataHistory, dailyNote, and recentDocs to globalCommand when available', async () => {
    const globalCommand = vi.fn((cmd: string) => cmd === 'dataHistory' || cmd === 'dailyNote' || cmd === 'recentDocs');

    const historyResult = await executeBuiltinCommandStable('dataHistory', {
      globalCommand,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(historyResult).toBe(true);
    expect(globalCommand).toHaveBeenCalledWith('dataHistory');

    const dailyResult = await executeBuiltinCommandStable('dailyNote', {
      globalCommand,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(dailyResult).toBe(true);
    expect(globalCommand).toHaveBeenCalledWith('dailyNote');

    const recentResult = await executeBuiltinCommandStable('recentDocs', {
      globalCommand,
      runBuiltinCommandByDom: vi.fn(() => false),
    });
    expect(recentResult).toBe(true);
    expect(globalCommand).toHaveBeenCalledWith('recentDocs');
  });
});

