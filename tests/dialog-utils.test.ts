/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { confirmDialog, promptDialog } from '@/core/surfaces/dialog-utils';

describe('dialog utils', () => {
  it('promptDialog resolves with input value when confirm button is clicked', async () => {
    const promise = promptDialog({
      title: '测试输入',
      placeholder: '请输入内容',
      initialValue: '初始值',
    });

    const input = document.querySelector<HTMLInputElement>('.b3-dialog__content input');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('初始值');

    if (input) {
      input.value = '新输入的内容';
    }

    const confirmBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--text');
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();

    const result = await promise;
    expect(result).toBe('新输入的内容');
  });

  it('promptDialog resolves with input value when Enter key is pressed', async () => {
    const promise = promptDialog({
      title: '回车测试',
      initialValue: '回车值',
    });

    const input = document.querySelector<HTMLInputElement>('.b3-dialog__content input');
    expect(input).not.toBeNull();

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input?.dispatchEvent(enterEvent);

    const result = await promise;
    expect(result).toBe('回车值');
  });

  it('promptDialog resolves with null when cancel button is clicked', async () => {
    const promise = promptDialog({
      title: '取消测试',
    });

    const cancelBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--cancel');
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();

    const result = await promise;
    expect(result).toBeNull();
  });

  it('confirmDialog resolves with true when confirm button is clicked', async () => {
    const promise = confirmDialog({
      title: '确认删除',
      message: '确定要删除吗？',
    });

    const confirmBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--text');
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();

    const result = await promise;
    expect(result).toBe(true);
  });

  it('confirmDialog resolves with false when cancel button is clicked', async () => {
    const promise = confirmDialog({
      title: '取消确认',
      message: '取消操作测试',
    });

    const cancelBtn = document.querySelector<HTMLButtonElement>('.b3-dialog__action .b3-button--cancel');
    expect(cancelBtn).not.toBeNull();
    cancelBtn?.click();

    const result = await promise;
    expect(result).toBe(false);
  });
});
