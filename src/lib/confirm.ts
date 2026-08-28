// Tiny promise-based confirm dialog shared across the whole app.
// Usage:  if (await confirm({ title, message, tone: 'danger' })) { ...act... }
import { reactive } from 'vue'

export interface ConfirmOptions {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

export const confirmState = reactive({
  open: false,
  title: 'Are you sure?',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'default' as 'danger' | 'default',
  _resolve: null as null | ((v: boolean) => void),
})

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  confirmState.title = opts.title ?? 'Are you sure?'
  confirmState.message = opts.message ?? ''
  confirmState.confirmLabel = opts.confirmLabel ?? 'Confirm'
  confirmState.cancelLabel = opts.cancelLabel ?? 'Cancel'
  confirmState.tone = opts.tone ?? 'default'
  confirmState.open = true
  return new Promise<boolean>((resolve) => { confirmState._resolve = resolve })
}

export function settleConfirm(value: boolean) {
  confirmState.open = false
  confirmState._resolve?.(value)
  confirmState._resolve = null
}
