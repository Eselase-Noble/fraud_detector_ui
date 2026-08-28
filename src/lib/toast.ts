// Lightweight global toast notifications shared across the whole app.
// Usage:  import { toast } from '@/lib/toast';  toast.success('Saved')
import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'info'
export interface Toast { id: number; type: ToastType; message: string }

let _id = 0
export const toasts = reactive<Toast[]>([])

export function dismissToast(id: number) {
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

function push(type: ToastType, message: string, ttl: number) {
  const id = ++_id
  toasts.push({ id, type, message })
  setTimeout(() => dismissToast(id), ttl)
  // Keep the stack from growing without bound.
  if (toasts.length > 5) toasts.splice(0, toasts.length - 5)
}

export const toast = {
  success: (message: string) => push('success', message, 3000),
  error: (message: string) => push('error', message, 4500),
  info: (message: string) => push('info', message, 3000),
}
