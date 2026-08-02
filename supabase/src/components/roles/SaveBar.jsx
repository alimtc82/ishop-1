import Button from '../ui/Button';

/**
 * شريط ثابت أسفل الصفحة، بيظهر بس لما يكون فيه تغيير غير محفوظ.
 *
 * ⚠️ مالوش أي علاقة بالشبكة — بينادي onSave/onCancel وخلاص.
 *
 * @param {boolean}  visible
 * @param {string}   message
 * @param {string}   saveLabel
 * @param {boolean}  busy
 * @param {Function} onSave
 * @param {Function} onCancel
 */
export default function SaveBar({ visible, message, saveLabel = 'حفظ التغييرات', busy = false, onSave, onCancel }) {
  if (!visible) return null;

  return (
    <div className="sticky bottom-3 z-20">
      <div
        className="flex items-center gap-3 rounded-2xl border border-accent-line bg-card/95 px-4 py-3
                   shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur"
      >
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-muted">{message}</span>
        <Button variant="plain" onClick={onCancel} disabled={busy}>إلغاء</Button>
        <Button onClick={onSave} loading={busy}>{saveLabel}</Button>
      </div>
    </div>
  );
}
