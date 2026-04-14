const STATUS_CONFIG = {
  active:    { label: 'Active',     classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  stalled:   { label: 'Stalled',    classes: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  completed: { label: 'Completed',  classes: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
  unknown:   { label: 'Not Analyzed', classes: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}
