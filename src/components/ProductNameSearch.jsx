import { useMemo, useRef, useState } from 'react';
import { normalizeModelName } from '../lib/phoneCatalog';
import { highlightSegments } from '../lib/modelSearch';

// ══════════════════════════════════════════════════════════════
//  ProductNameSearch — حقل اسم المنتج ببحث ذكي ومنع تكرار (V13.7.6)
//
//  • بيبحث في المنتجات الموجودة أثناء الكتابة (كلها مشتركة بين الفروع).
//  • بيلوّن الحروف المطابقة في كل نتيجة.
//  • بينبّه لو الاسم موجود بالفعل، والضغط على منتج بيفتحه للتعديل بدل
//    ما يتكرر.
// ══════════════════════════════════════════════════════════════

export default function ProductNameSearch({
  value,
  onChange,
  products = [],
  currentId = null,
  onPickExisting,
  inputCls = '',
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const q = normalizeModelName(value);

  const matches = useMemo(() => {
    if (!q) return [];
    return (products || [])
      .filter((p) => p.id !== currentId && normalizeModelName(p.name).includes(q))
      .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [products, q, currentId]);

  const exactDup = useMemo(
    () => !!q && (products || []).some((p) => p.id !== currentId && normalizeModelName(p.name) === q),
    [products, q, currentId]
  );

  return (
    <div className="relative" ref={boxRef}>
      <input
        className={`${inputCls} ${exactDup ? 'border-danger' : ''}`}
        placeholder="اسم الصنف *"
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {exactDup && (
        <p className="mt-1 text-[11px] font-bold text-danger">
          ⚠️ منتج بنفس الاسم موجود بالفعل — راجع النتائج قبل الإضافة عشان مايتكررش.
        </p>
      )}

      {open && matches.length > 0 && (
        <div
          className="absolute z-[130] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border shadow-2xl ring-1 ring-black/40"
          style={{ backgroundColor: 'var(--card)' }}
        >
          <div className="sticky top-0 px-3 py-1.5 text-[11px] font-black text-muted" style={{ backgroundColor: 'var(--card)' }}>
            منتجات مشابهة موجودة — اضغط للتعديل بدل التكرار
          </div>
          {matches.map((p) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onPickExisting?.(p); }}
              className="flex w-full items-center justify-between gap-2 border-t border-border px-3 py-2.5 text-right hover:bg-surface"
            >
              <span className="min-w-0 truncate text-sm font-bold text-text">
                {highlightSegments(p.name, value).map((s, i) =>
                  s.hit
                    ? <mark key={i} className="bg-transparent font-black text-accent">{s.text}</mark>
                    : <span key={i}>{s.text}</span>
                )}
              </span>
              <span dir="ltr" className="shrink-0 text-[10px] font-black text-muted">
                {p.sku}{p.product_brands?.name ? ` · ${p.product_brands.name}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
