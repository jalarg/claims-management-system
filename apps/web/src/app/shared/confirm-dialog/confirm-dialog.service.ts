import { Injectable, signal } from "@angular/core";

export type ConfirmDialogVariant = "default" | "danger";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmDialogVariant;
}

@Injectable({ providedIn: "root" })
export class ConfirmDialogService {
  private readonly dialogState = signal<ConfirmDialogOptions | null>(null);
  private resolveCurrent?: (confirmed: boolean) => void;

  readonly dialog = this.dialogState.asReadonly();

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolveCurrent) {
      this.close(false);
    }

    return new Promise<boolean>((resolve) => {
      this.resolveCurrent = resolve;
      this.dialogState.set(options);
    });
  }

  cancel(): void {
    this.close(false);
  }

  confirmCurrent(): void {
    this.close(true);
  }

  private close(confirmed: boolean): void {
    const resolve = this.resolveCurrent;

    if (!resolve) {
      return;
    }

    this.resolveCurrent = undefined;
    this.dialogState.set(null);
    resolve(confirmed);
  }
}
