export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      <p>{label}</p>
    </div>
  )
}
