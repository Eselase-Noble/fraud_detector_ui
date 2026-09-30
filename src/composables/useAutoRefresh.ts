import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Keep a view's data live without manual refresh.
 *
 * Calls `fn` once on mount, then every `intervalMs`. Pauses polling while the
 * browser tab is hidden (saves requests) and fires an immediate refresh when
 * the tab becomes visible again. Errors in `fn` are swallowed so one bad poll
 * never stops the loop — surface them inside `fn` if needed.
 *
 * Returns `lastUpdated` (Date | null) and `refreshing` for a "live" indicator,
 * plus `refresh()` to trigger manually.
 */
export function useAutoRefresh(fn: () => Promise<void> | void, intervalMs = 5000) {
  const lastUpdated = ref<Date | null>(null)
  const refreshing = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const refresh = async () => {
    if (refreshing.value) return
    refreshing.value = true
    try {
      await fn()
      lastUpdated.value = new Date()
    } catch {
      /* keep the loop alive */
    } finally {
      refreshing.value = false
    }
  }

  const start = () => {
    if (timer) return
    timer = setInterval(() => { if (!document.hidden) refresh() }, intervalMs)
  }
  const stop = () => { if (timer) { clearInterval(timer); timer = null } }

  const onVisibility = () => { if (!document.hidden) refresh() }

  onMounted(() => {
    refresh()
    start()
    document.addEventListener('visibilitychange', onVisibility)
  })
  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { lastUpdated, refreshing, refresh }
}
