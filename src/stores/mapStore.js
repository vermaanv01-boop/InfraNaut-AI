import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useMapStore = create((set, get) => ({
  reports: [],
  selectedReport: null,
  filters: { categories: [], status: '' },
  loading: false,

  fetchReports: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('reports')
      .select('*, profiles(username, display_name)')
      .order('created_at', { ascending: false })
    if (!error) set({ reports: data || [] })
    set({ loading: false })
  },

  addReport: (report) => set(s => ({ reports: [report, ...s.reports] })),

  selectReport: (report) => set({ selectedReport: report }),

  clearSelection: () => set({ selectedReport: null }),

  setFilters: (filters) => set(s => ({ filters: { ...s.filters, ...filters } })),

  filteredReports: () => {
    const { reports, filters } = get()
    return reports.filter(r => {
      const catMatch = filters.categories.length === 0 || filters.categories.includes(r.category)
      const statusMatch = !filters.status || r.status === filters.status
      return catMatch && statusMatch
    })
  },

  subscribeToReports: () => {
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          set(s => ({ reports: [payload.new, ...s.reports] }))
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}))
