// Client-side pagination for a reactive array. Pass the (already filtered) rows;
// it returns the current page slice and clamps/resets as data or size changes.
import { computed, ref, watch, type Ref } from 'vue'

export function usePagination<T>(source: Ref<T[]>, initialSize = 10) {
  const page = ref(1)
  const pageSize = ref(initialSize)

  const total = computed(() => source.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const from = computed(() => (total.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1))
  const to = computed(() => Math.min(total.value, page.value * pageSize.value))
  const paged = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return source.value.slice(start, start + pageSize.value)
  })

  // When the (filtered) data set changes, jump back to the first page.
  watch(total, () => { page.value = 1 })
  // Keep the current page in range if the size grows or data shrinks.
  watch([pageCount, pageSize], () => { if (page.value > pageCount.value) page.value = pageCount.value })

  return { page, pageSize, total, pageCount, from, to, paged }
}
