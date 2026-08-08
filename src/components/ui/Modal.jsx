import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * مودال واحد يخدم كل المودالات (حذف، أرشفة، مقارنة، مستخدمين...).
 * في v4.5.1 كان كل مودال div منفصل في index.html بكلاس .show.
 *
 * زيادات على الأصل (مش تغيير في السلوك، إضافة جودة):
 *   • Esc بيقفل
 *   • قفل تمرير الخلفية
 *   • التركيز بيرجع للزر اللي فتح المودال
 */
export default function Modal({
  open,
  onClose,
  icon,
  title,
  description,
  children,
  actions,
  closeOnOverlay = true,
  overlayClassName = '',
}) {
  const boxRef = useRef(null);
  const lastFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    lastFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);

    // التركيز على أول عنصر تفاعلي — مرة واحدة عند الفتح فقط.
    // (لو اعتمد الـ effect على onClose كان بيعيد التركيز مع كل ضغطة زرار ويسرق الفوكس)
    const focusable = boxRef.current?.querySelector(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`modal-overlay show ${overlayClassName}`.trim()}
      onClick={closeOnOverlay ? (e) => e.target === e.currentTarget && onClose?.() : undefined}
    >
      <div
        ref={boxRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {icon && <div className="modal-icon" aria-hidden="true">{icon}</div>}
        {title && <h3>{title}</h3>}
        {description && <p>{description}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
