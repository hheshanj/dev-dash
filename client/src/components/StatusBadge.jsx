const STATUS_CONFIG = {
  active:    { label: 'Active',     classes: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  stalled:   { label: 'Stalled',    classes: 'bg-amber-100 text-amber-700 border border-amber-200' },
  completed: { label: 'Completed',  classes: 'bg-blue-100 text-blue-700 border border-blue-200' },
  unknown:   { label: 'Not Analyzed', classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  )
}
