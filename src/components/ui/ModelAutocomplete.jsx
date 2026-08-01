import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ModelDialog from './ModelDialog';
import { usePermissions } from '../../context/PermissionContext';
import { useToast } from '../../context/ToastContext';
import { fetchCustomModels, addCustomModel } from '../../lib/api';
import {
  buildMergedCatalog,
  modelExists,
  normalizeModelName,
  brandMatches,
} from '../../lib/phoneCatalog';
import { searchModels, highlightSegments } from '../../lib/modelSearch';
import {
  getRecent, pushRecent,
  getFavorites, toggleFavorite,
  bubbleFavorite, reorderFavorites,
  bumpStat,
} from '../../lib/modelHistory';

// ══════════════════════════════════════════════════════════════
//  ModelAutocomplete (V13.7.1) — بحث/اختيار الموديل
//
//  تحسينات فوق 13.7.0 (من غير أي تغيير في منطق العمل):
//   • عرض احترافي لكل نتيجة (أيقونة + اسم + شارة نوع + ⭐/🆕)
//   • تظليل الجزء المطابق أثناء الكتابة
//   • قصّ من الآخر فقط (اسم كامل من البداية)
//   • آخر الموديلات + المفضّلة عند التركيز قبل الكتابة
//   • تنقّل كامل بلوحة المفاتيح + ARIA + هدف لمس ≥ 48px
//   • debounce 150ms + memoization، القيمة نص زي الأصل بالظبط
// ══════════════════════════════════════════════════════════════

// كاش على مستوى الموديول: الموديلات المخصّصة تتقري مرة واحدة لكل صفحة
let _customCache = null;
let _customPromise = null;
async function loadCustomModels(force = false) {
  if (force) { _customCache = null; _customPromise = null; }
  if (_customCache) return _customCache;
  if (!_customPromise) {
    _customPromise = fetchCustomModels()
      .then((rows) => { _customCache = rows || []; return _customCache; })
      .catch(() => { _customCache = []; return _customCache; })
      .finally(() => { _customPromise = null; });
  }
  return _customPromise;
}

const inputCls =
  'w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-text ' +
  'outline-none transition placeholder:text-muted min-h-[48px] ' +
  'focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]';

/** اسم الموديل مع تظليل المطابقة — قصّ من الآخر فقط (dir=ltr) */
function ModelName({ model, query }) {
  const segs = useMemo(() => highlightSegments(model, query), [model, query]);
  return (
    <span dir="ltr" className="block min-w-0 truncate text-start text-[15px] font-bold text-text">
      {segs.map((s, i) =>
        s.hit
          ? <mark key={i} className="bg-transparent font-black text-accent">{s.text}</mark>
          : <span key={i}>{s.text}</span>
      )}
    </span>
  );
}

export default function ModelAutocomplete({
  brand = '',
  value = '',
  onChange,
  extraModels = [],
  placeholder = 'ابحث بأي جزء من اسم الموديل…',
  disabled = false,
  id = 'model-autocomplete',
}) {
  const perms = usePermissions();
  const { show } = useToast();
  const canManage = perms.can('can_manage_custom_models');

  const [custom, setCustom] = useState(() => _customCache || []);
  const [loading, setLoading] = useState(!_customCache);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(-1);

  // history/favorites — نسخة في الحالة عشان تتحدّث فورًا
  const [recent, setRecent] = useState(() => getRecent());
  const [favs, setFavs] = useState(() => getFavorites());

  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dupErr, setDupErr] = useState(false);

  // سحب لإعادة ترتيب المفضّلة
  const [dragI, setDragI] = useState(-1);
  const [overI, setOverI] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${id}-listbox`;

  // تحميل الموديلات المخصّصة مرة واحدة
  useEffect(() => {
    let alive = true;
    loadCustomModels().then((rows) => {
      if (!alive) return;
      setCustom(rows);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // debounce 150ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const favKeys = useMemo(() => new Set(favs.map((f) => f.key)), [favs]);
  const isFav = useCallback((key) => favKeys.has(key), [favKeys]);

  // الكتالوج المدمج للنوع الحالي (memoized)
  const catalog = useMemo(
    () => buildMergedCatalog(custom, extraModels, brand),
    [custom, extraModels, brand]
  );

  const suggestions = useMemo(
    () => searchModels(catalog, debounced, { limit: 50, isFavorite: isFav }),
    [catalog, debounced, isFav]
  );

  const trimmedQuery = normalizeModelName(query);
  const typing = trimmedQuery !== '';
  const searching = typing && query !== debounced;   // debounce قيد الانتظار

  // لوحة "قبل الكتابة": المفضّلة ثم الأحدث (مفلترة بالنوع)
  const brandOk = useCallback(
    (b) => !brand || !b || brandMatches(b, brand),
    [brand]
  );
  const panelFavs = useMemo(
    () => favs.filter((f) => brandOk(f.brand)),
    [favs, brandOk]
  );
  const panelRecent = useMemo(
    () => recent.filter((r) => brandOk(r.brand) && !favKeys.has(r.key)),
    [recent, brandOk, favKeys]
  );
  const showPanel = open && !typing && (panelFavs.length > 0 || panelRecent.length > 0);

  // القايمة القابلة للتنقّل (نفس ترتيب العرض)
  const navItems = useMemo(() => {
    if (typing) return suggestions;
    if (showPanel) return [...panelFavs, ...panelRecent];
    return [];
  }, [typing, suggestions, showPanel, panelFavs, panelRecent]);

  useEffect(() => { setActive(navItems.length ? 0 : -1); }, [debounced, brand, showPanel, navItems.length]);

  // تمرير تلقائي للعنصر النشط
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const noResults = !loading && !searching && typing && suggestions.length === 0;
  const exactExists = typing && modelExists(catalog, query);

  const commit = useCallback((item) => {
    if (!item) return;
    onChange?.(item.model);
    setRecent(pushRecent({ model: item.model, brand: item.brand }));
    bumpStat({ model: item.model, brand: item.brand });
    // اختيار موديل مفضّل → يطفو للأول (إلا لو مثبّت بالسحب)
    setFavs(bubbleFavorite({ model: item.model, brand: item.brand }));
    setQuery('');
    setOpen(false);
    setActive(-1);
  }, [onChange]);

  // ── سحب المفضّلة لإعادة الترتيب (بالـ pointer، يشتغل على الموبايل) ──
  function favDown(e, i) {
    e.preventDefault();
    e.stopPropagation();
    setDragI(i);
    setOverI(i);
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  }
  function favMove(e) {
    if (dragI < 0) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-fav-idx]');
    if (el) {
      const j = Number(el.getAttribute('data-fav-idx'));
      if (!Number.isNaN(j)) setOverI(j);
    }
  }
  function favUp() {
    if (dragI >= 0 && overI >= 0 && dragI !== overI && panelFavs[dragI] && panelFavs[overI]) {
      setFavs(reorderFavorites(panelFavs[dragI].key, panelFavs[overI].key));
    }
    setDragI(-1);
    setOverI(-1);
  }

  function onType(e) {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    onChange?.(v); // توافق: كان input نصّي حر
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true);
      setActive((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && navItems[active]) { e.preventDefault(); commit(navItems[active]); }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); }
    } else if (e.key === 'Tab') {
      // قبول العنصر النشط والسماح للفوكس ينتقل طبيعي
      if (open && navItems[active]) commit(navItems[active]);
      setOpen(false);
    }
  }

  function onStar(e, item) {
    e.preventDefault();
    e.stopPropagation();
    setFavs(toggleFavorite({ model: item.model, brand: item.brand }));
  }

  // ── دايالوج الإضافة ──
  function openDialog() { setDupErr(false); setDialog(true); }

  async function handleSave({ brand: b, model, scope }) {
    setDupErr(false);
    const name = model.trim();
    if (!name) return;
    if (modelExists(catalog, name)) { setDupErr(true); return; }

    setSaving(true);
    try {
      const res = await addCustomModel({
        brand: b || brand,
        model: name,
        scope,
        branchId: scope === 'local' ? (perms.primaryBranch || null) : null,
      });
      if (res.ok) {
        const rows = await loadCustomModels(true);
        setCustom(rows);
        commit({ model: res.row.model, brand: res.row.brand });
        setDialog(false);
        show('✅ تمت إضافة الموديل للكتالوج');
      } else if (res.duplicate) {
        setDupErr(true);
      } else {
        show('❌ ' + (res.error || 'فشل حفظ الموديل'), 'error');
      }
    } catch (err) {
      show('❌ ' + (err.message || 'فشل حفظ الموديل'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const shownValue = open ? query : (value || '');
  const activeId = active >= 0 ? `${id}-opt-${active}` : undefined;

  // صفّ نظيف: الاسم ياخد السطر كامل، من غير أيقونة ولا شارة نوع.
  // favIndex = ترتيب العنصر داخل المفضّلة (لو مش null → يظهر مقبض سحب).
  const renderRow = (item, idx, kind, favIndex = null) => {
    const isDragTarget = favIndex !== null && dragI >= 0 && overI === favIndex;
    const isDragging = favIndex !== null && dragI === favIndex;
    return (
      <div
        key={kind + ':' + item.key}
        id={`${id}-opt-${idx}`}
        data-idx={idx}
        {...(favIndex !== null ? { 'data-fav-idx': favIndex } : {})}
        role="option"
        aria-selected={idx === active}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setActive(idx)}
        onClick={() => { if (dragI < 0) commit(item); }}
        className={`flex min-h-[52px] cursor-pointer items-center gap-2 border-b border-border px-3 py-2.5 last:border-0
                    ${isDragTarget ? 'border-t-2 border-t-accent' : ''}
                    ${isDragging ? 'opacity-50' : ''}
                    ${idx === active ? 'bg-accent-soft' : 'hover:bg-surface'}`}
      >
        {favIndex !== null && (
          <button
            type="button"
            aria-label="اسحب لإعادة الترتيب"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onPointerDown={(e) => favDown(e, favIndex)}
            onPointerMove={favMove}
            onPointerUp={favUp}
            className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted active:cursor-grabbing hover:bg-surface"
          >
            ⠿
          </button>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <ModelName model={item.model} query={typing ? query : ''} />
            {item.isNew && (
              <span dir="ltr" className="shrink-0 rounded-md border border-accent-line px-1 text-[9px] font-black text-accent" title="موديل مُضاف يدويًا">جديد</span>
            )}
          </span>
        </span>

        <button
          type="button"
          aria-label={isFav(item.key) ? 'إزالة من المفضّلة' : 'إضافة للمفضّلة'}
          aria-pressed={isFav(item.key)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => onStar(e, item)}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-base outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]"
        >
          {isFav(item.key) ? '⭐' : '☆'}
        </button>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="ابحث عن موديل الجهاز"
          autoComplete="off"
          disabled={disabled}
          className={`${inputCls} pe-9`}
          value={shownValue}
          placeholder={placeholder}
          onChange={onType}
          onFocus={() => { setQuery(value || ''); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
        />
        <span className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted">
          {(loading || searching) ? <span className="animate-spin text-sm" aria-hidden="true">◌</span> : '🔍'}
        </span>
      </div>

      {open && (loading || searching || typing || showPanel) && (
        <div
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label="نتائج الموديلات"
          aria-busy={loading || searching}
          style={{ backgroundColor: 'var(--card)' }}
          className="absolute z-[130] mt-1 max-h-80 w-full overflow-auto overscroll-contain rounded-xl border border-border shadow-2xl ring-1 ring-black/40"
        >
          {/* تحميل الكتالوج */}
          {loading && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted">
              <span className="animate-spin" aria-hidden="true">◌</span> جاري تحميل الكتالوج…
            </div>
          )}

          {/* قبل الكتابة: المفضّلة + الأحدث */}
          {!loading && showPanel && (
            <>
              {panelFavs.length > 0 && (
                <>
                  <div style={{ backgroundColor: 'var(--card)' }} className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 text-[11px] font-black text-muted">
                    <span>⭐ المفضّلة</span>
                    <span className="text-[10px] font-normal opacity-70">اسحب ⠿ لإعادة الترتيب</span>
                  </div>
                  {panelFavs.map((item, i) => renderRow(item, i, 'fav', i))}
                </>
              )}
              {panelRecent.length > 0 && (
                <>
                  <div style={{ backgroundColor: 'var(--card)' }} className="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-black text-muted">آخر الموديلات</div>
                  {panelRecent.map((item, i) => renderRow(item, panelFavs.length + i, 'recent'))}
                </>
              )}
            </>
          )}

          {/* أثناء البحث (debounce) بدون قفز التخطيط */}
          {!loading && searching && suggestions.length === 0 && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted">
              <span className="animate-spin" aria-hidden="true">◌</span> جاري البحث…
            </div>
          )}

          {/* نتائج البحث */}
          {!loading && typing && suggestions.map((item, idx) => renderRow(item, idx, 'result'))}

          {/* حالة عدم وجود نتائج — زر الإضافة يظهر هنا فقط */}
          {noResults && (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-muted">لا يوجد موديل مطابق</p>
              {canManage ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={openDialog}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-accent-soft px-4 py-2 text-xs font-black text-accent hover:bg-accent hover:text-on-accent"
                >
                  ➕ إضافة «{query.trim()}»
                </button>
              ) : (
                <p className="mt-1 text-[11px] text-muted">مالكش صلاحية إضافة موديلات — تقدر تبحث بس</p>
              )}
            </div>
          )}
        </div>
      )}

      <ModelDialog
        open={dialog}
        brand={brand}
        initialModel={query.trim() || value || ''}
        primaryBranch={perms.primaryBranch}
        saving={saving}
        dupError={dupErr}
        onSave={handleSave}
        onClose={() => !saving && setDialog(false)}
        onModelEdited={() => setDupErr(false)}
      />
    </div>
  );
}
