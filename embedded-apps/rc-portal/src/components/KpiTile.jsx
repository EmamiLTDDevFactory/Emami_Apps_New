import { ArrowRight } from 'lucide-react';

export default function KpiTile({ 
  title, 
  subtitle, 
  value, 
  icon: Icon, 
  onClick, 
  active,
  bgClass = 'bg-white',
  titleClass = 'text-slate-500',
  subtitleClass = 'text-slate-400',
  valueClass = 'text-slate-900',
  iconBgClass = 'bg-slate-100/80 text-slate-600',
  arrowBgClass = 'bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border border-slate-200/60 ${bgClass} ${
        active ? 'ring-2 ring-slate-800 ring-offset-2 scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-xs font-bold tracking-wide uppercase ${titleClass}`}>{title}</div>
          {subtitle && <div className={`mt-0.5 text-[11px] font-medium ${subtitleClass}`}>{subtitle}</div>}
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${iconBgClass}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className={`text-2xl font-black tracking-tight ${valueClass}`}>{value}</div>
        <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${arrowBgClass}`}>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
