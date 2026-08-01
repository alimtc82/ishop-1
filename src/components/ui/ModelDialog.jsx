import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

// ══════════════════════════════════════════════════════════════
//  ModelDialog — دايالوج إضافة موديل مخصّص (V13.7.1)
//
//  عرض فقط: الحقول وحالتها محليّة، والحفظ/فحص التكرار مسؤولية
//  الأب (onSave). بيتحقّق من الاسم قبل ما يبعت (مطلوب).
// ══════════════════════════════════════════════════════════════

const inputCls =
  'w-full rounded-xl border border-border bg-input px-3.5 py-3 text-sm text-text ' +
  'outline-none transition placeholder:text-muted min-h-[48px] ' +
  'focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]';

export default function ModelDialog({
  open,
  brand = '',
  initialModel = '',
  primaryBranch = '',
  saving = false,
  dupError = false,
  onSave,
  onClose,
  onModelEdited,
}) {
  const [brandVal, setBrandVal] = useState(brand);
  const [model, setModel] = useState(initialModel);
  const [scope, setScope] = useState('global');
  const [touched, setTouched] = useState(false);

  // مزامنة القيم عند كل فتح
  useEffect(() => {
    if (open) {
      setBrandVal(brand || '');
      setModel(initialModel || '');
      setScope('global');
      setTouched(false);
    }
  }, [open, brand, initialModel]);

  const trimmed = model.trim();
  const invalid = trimmed === '';

  function save() {
    setTouched(true);
    if (invalid) return;
    onSave?.({ brand: brandVal.trim() || brand, model: trimmed, scope });
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      icon="➕"
      title="إضافة موديل جديد"
      actions={
        <>
          <Button variant="plain" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={save} loading={saving} disabled={saving || invalid}>حفظ</Button>
        </>
      }
    >
      <div className="space-y-4 text-right">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cpm-brand" className="text-xs font-bold text-muted">النوع</label>
          <input
            id="cpm-brand"
            className={`${inputCls} ${brand ? 'opacity-80' : ''}`}
            value={brandVal}
            onChange={(e) => setBrandVal(e.target.value)}
            placeholder="النوع"
            readOnly={!!brand}
            aria-readonly={!!brand}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cpm-model" className="text-xs font-bold text-muted">اسم الموديل</label>
          <input
            id="cpm-model"
            className={`${inputCls} ${touched && invalid ? 'border-danger' : ''}`}
            value={model}
            autoFocus
            onChange={(e) => { setModel(e.target.value); onModelEdited?.(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            placeholder="مثال: Redmi Note 15 Ultra"
            aria-invalid={touched && invalid}
          />
          {touched && invalid && (
            <span className="text-[11px] font-bold text-danger">اكتب اسم الموديل</span>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-bold text-muted">حفظ باسم</legend>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-border bg-input px-3 text-sm text-text has-[:checked]:border-accent">
            <input type="radio" name="cpm-scope" className="accent-[var(--accent)]"
                   checked={scope === 'local'} onChange={() => setScope('local')} />
            <span>الفرع الحالي فقط{primaryBranch ? ` (${primaryBranch})` : ''}</span>
          </label>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-border bg-input px-3 text-sm text-text has-[:checked]:border-accent">
            <input type="radio" name="cpm-scope" className="accent-[var(--accent)]"
                   checked={scope === 'global'} onChange={() => setScope('global')} />
            <span>الكتالوج العام (كل الفروع)</span>
          </label>
        </fieldset>

        {dupError && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-bold text-danger">
            الموديل ده موجود بالفعل.
          </p>
        )}
      </div>
    </Modal>
  );
}
