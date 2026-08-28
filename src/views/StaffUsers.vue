<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listStaff, createStaff, updateStaff, deleteStaff, type StaffUserFull } from '@/api/platform'
import { staffUser } from '@/platform/auth'
import SectionCard from '@/components/ui/SectionCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { usePagination } from '@/lib/usePagination'
import { confirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'

const ROLES = ['admin', 'operator', 'viewer'] as const
const isAdmin = computed(() => staffUser.value?.role === 'admin')
const meId = computed(() => staffUser.value?.id)

const rows = ref<StaffUserFull[]>([])
const loading = ref(true)
const error = ref('')
const { page, pageSize, total, pageCount, from, to, paged } = usePagination(rows, 25)
const showForm = ref(false)
const form = ref({ email: '', name: '', role: 'operator', password: '' })
const saving = ref(false)

const load = async () => {
  loading.value = true; error.value = ''
  try { rows.value = await listStaff() }
  catch (e: unknown) {
    error.value = (e as { response?: { status?: number } })?.response?.status === 403
      ? 'Only admins can manage staff.' : 'Could not load staff.'
  } finally { loading.value = false }
}
onMounted(load)

const add = async () => {
  if (!form.value.email.trim() || form.value.password.length < 6) { error.value = 'Email and a 6+ char password are required.'; return }
  saving.value = true; error.value = ''
  try {
    await createStaff({ email: form.value.email.trim(), name: form.value.name.trim() || undefined, role: form.value.role, password: form.value.password })
    form.value = { email: '', name: '', role: 'operator', password: '' }
    showForm.value = false
    toast.success('Staff member added')
    await load()
  } catch (e: unknown) {
    error.value = (e as { response?: { status?: number } })?.response?.status === 409 ? 'That email is already in use.' : 'Could not add the user.'
    toast.error(error.value)
  } finally { saving.value = false }
}
const setRole = async (u: StaffUserFull, role: string) => { await updateStaff(u.id, { role }).then(() => toast.success('Role updated')).catch(() => toast.error('Update failed')); await load() }
const toggleActive = async (u: StaffUserFull) => {
  if (u.is_active && !(await confirm({
    title: `Disable ${u.name || u.email}?`,
    message: 'They will lose access to the operator console until re-enabled.',
    confirmLabel: 'Disable', tone: 'danger',
  }))) return
  await updateStaff(u.id, { is_active: !u.is_active }).then(() => toast.success(u.is_active ? 'Staff disabled' : 'Staff enabled')).catch(() => toast.error('Update failed')); await load()
}
const remove = async (u: StaffUserFull) => {
  if (!(await confirm({
    title: `Remove ${u.name || u.email}?`,
    message: 'This permanently deletes their staff account. This cannot be undone.',
    confirmLabel: 'Remove staff', tone: 'danger',
  }))) return
  await deleteStaff(u.id).then(() => toast.success('Staff removed')).catch(() => toast.error('Remove failed')); await load()
}

const roleTone: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  operator: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  viewer: 'bg-slate-100 text-slate-600 ring-slate-400/20',
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Staff &amp; access</h2>
        <p class="text-sm text-slate-500">Sentinel operators who can sign into this console.</p>
      </div>
      <button v-if="isAdmin" @click="showForm = !showForm" class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm">
        {{ showForm ? 'Cancel' : '+ Add staff' }}
      </button>
    </div>

    <SectionCard v-if="showForm && isAdmin" title="Add a staff member">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block"><span class="text-xs font-medium text-slate-500">Email</span>
          <input v-model="form.email" type="email" placeholder="person@sentinel.local" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" /></label>
        <label class="block"><span class="text-xs font-medium text-slate-500">Name</span>
          <input v-model="form.name" placeholder="Full name" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" /></label>
        <label class="block"><span class="text-xs font-medium text-slate-500">Role</span>
          <select v-model="form.role" class="mt-1 h-9 w-full px-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
            <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
          </select></label>
        <label class="block"><span class="text-xs font-medium text-slate-500">Temporary password</span>
          <input v-model="form.password" type="text" placeholder="share securely" class="mt-1 h-9 w-full px-3 text-sm bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" /></label>
      </div>
      <div class="mt-4 flex justify-end"><button @click="add" :disabled="saving" class="h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{{ saving ? 'Adding…' : 'Add staff' }}</button></div>
    </SectionCard>

    <SectionCard>
      <template #flush />
      <div v-if="error" class="p-4 text-sm text-rose-600">{{ error }}</div>
      <div v-if="loading" class="p-6 text-sm text-slate-400">Loading…</div>
      <div v-else-if="rows.length" class="overflow-x-auto">
      <table class="w-full text-sm min-w-[520px]">
        <thead>
          <tr class="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
            <th class="text-left px-4 py-2.5 font-semibold">User</th>
            <th class="text-left px-4 py-2.5 font-semibold">Role</th>
            <th class="text-left px-4 py-2.5 font-semibold">Status</th>
            <th class="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="u in paged" :key="u.id" class="hover:bg-slate-50/60">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">{{ u.name || u.email }}<span v-if="u.id === meId" class="ml-1.5 text-[10px] font-semibold text-indigo-600">you</span></div>
              <div class="text-xs text-slate-400">{{ u.email }}</div>
            </td>
            <td class="px-4 py-3">
              <select v-if="isAdmin && u.id !== meId" :value="u.role" @change="setRole(u, ($event.target as HTMLSelectElement).value)"
                class="h-7 px-2 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none">
                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
              </select>
              <span v-else class="px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset capitalize" :class="roleTone[u.role]">{{ u.role }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1 ring-inset"
                :class="u.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-400/20'">
                <span class="w-1.5 h-1.5 rounded-full" :class="u.is_active ? 'bg-emerald-500' : 'bg-slate-400'" />{{ u.is_active ? 'Active' : 'Disabled' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <template v-if="isAdmin && u.id !== meId">
                <button @click="toggleActive(u)" class="text-xs font-medium text-slate-500 hover:text-slate-800 px-2">{{ u.is_active ? 'Disable' : 'Enable' }}</button>
                <button @click="remove(u)" class="text-xs font-medium text-rose-600 hover:text-rose-700 px-2">Remove</button>
              </template>
              <span v-else class="text-xs text-slate-300">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <Pagination v-if="!loading && rows.length" :page="page" :page-size="pageSize" :total="total"
        :from="from" :to="to" :page-count="pageCount" noun="staff"
        @update:page="page = $event" @update:page-size="pageSize = $event" />
    </SectionCard>
  </div>
</template>
