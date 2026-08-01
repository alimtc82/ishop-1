export default function ERPPageHeader({title,subtitle,actionLabel,onAction,onBack,crumb}){
 return <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
  <div>{onBack&&<button type="button" onClick={onBack} className="mb-2 text-xs font-black text-accent">← رجوع</button>}
   {crumb&&<div className="mb-1 text-xs font-bold text-muted">{crumb}</div>}
   <h2 className="text-xl font-black text-text">{title}</h2>{subtitle&&<p className="mt-1 text-xs text-muted">{subtitle}</p>}</div>
  {actionLabel&&onAction&&<button type="button" onClick={onAction} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-black text-on-accent">+ {actionLabel}</button>}
 </div>
}
