import { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';

/**
 * حقل إدخال IMEI — أرقام فقط، اتجاه LTR للإدخال السليم، حد 15 رقم،
 * زر مسح بالكاميرا، ويدعم قارئ الباركود (بيكتب أرقام + Enter).
 */
export default function ImeiInput({ value, onChange, onEnter, label, autoFocus, className = '' }) {
  const [scanning, setScanning] = useState(false);
  const set = (v) => onChange(String(v).replace(/\D/g, '').slice(0, 15));
  const len = (value || '').length;
  const valid = len === 15;

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-xs font-bold text-muted">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          dir="ltr"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={15}
          value={value || ''}
          autoFocus={autoFocus}
          onChange={(e) => set(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          placeholder="15 رقم"
          className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-start
                     font-bold tracking-[0.15em] text-text outline-none transition
                     placeholder:tracking-normal placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setScanning(true)}
          aria-label="مسح بالكاميرا"
          className="shrink-0 rounded-xl border border-accent-line bg-accent-soft px-3 text-lg text-accent
                     transition hover:bg-accent hover:text-on-accent active:scale-95"
        >📷</button>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
        <span className={valid ? 'text-[var(--mtc-success)]' : len > 0 ? 'text-danger' : 'text-muted'}>
          <span className="num">{len}</span>/15
        </span>
        {valid && <span className="text-[var(--mtc-success)]">✓ صحيح</span>}
        {len > 0 && !valid && <span className="text-muted">— لازم 15 رقم</span>}
      </div>

      {scanning && (
        <BarcodeScanner
          onDetected={(code) => { set(code); setScanning(false); }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
