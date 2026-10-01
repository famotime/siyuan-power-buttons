import { Dialog } from 'siyuan';

export interface PromptDialogOptions {
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export function promptDialog(options: PromptDialogOptions): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;

    const dialog = new Dialog({
      title: options.title,
      content: `
        <div class="b3-dialog__content" style="padding: 16px;">
          <input class="b3-text-field fn__block" placeholder="${escapeAttr(options.placeholder || '')}" value="${escapeAttr(options.initialValue || '')}" />
        </div>
        <div class="b3-dialog__action">
          <button class="b3-button b3-button--cancel">${escapeText(options.cancelText || '取消')}</button>
          <div class="fn__space"></div>
          <button class="b3-button b3-button--text">${escapeText(options.confirmText || '确定')}</button>
        </div>
      `,
      width: '420px',
      destroyCallback: () => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      },
    });

    const input = dialog.element.querySelector<HTMLInputElement>('input');
    const cancelBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--cancel');
    const confirmBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--text');

    const handleConfirm = () => {
      if (settled) return;
      settled = true;
      const value = input ? input.value : '';
      dialog.destroy();
      resolve(value);
    };

    const handleCancel = () => {
      if (settled) return;
      settled = true;
      dialog.destroy();
      resolve(null);
    };

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    });

    cancelBtn?.addEventListener('click', handleCancel);
    confirmBtn?.addEventListener('click', handleConfirm);

    setTimeout(() => {
      input?.focus();
      input?.select();
    }, 50);
  });
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const dialog = new Dialog({
      title: options.title,
      content: `
        <div class="b3-dialog__content" style="padding: 16px;">
          <div class="ft__breakword">${escapeText(options.message)}</div>
        </div>
        <div class="b3-dialog__action">
          <button class="b3-button b3-button--cancel">${escapeText(options.cancelText || '取消')}</button>
          <div class="fn__space"></div>
          <button class="b3-button b3-button--text">${escapeText(options.confirmText || '确定')}</button>
        </div>
      `,
      width: '420px',
      destroyCallback: () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      },
    });

    const cancelBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--cancel');
    const confirmBtn = dialog.element.querySelector<HTMLButtonElement>('.b3-button--text');

    const handleConfirm = () => {
      if (settled) return;
      settled = true;
      dialog.destroy();
      resolve(true);
    };

    const handleCancel = () => {
      if (settled) return;
      settled = true;
      dialog.destroy();
      resolve(false);
    };

    cancelBtn?.addEventListener('click', handleCancel);
    confirmBtn?.addEventListener('click', handleConfirm);
  });
}

function escapeAttr(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeText(val: string): string {
  return val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
