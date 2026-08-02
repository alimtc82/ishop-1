import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * ماسح باركود بالكاميرا (IMEI). بيحمّل مكتبة zxing عند الفتح بس (كسول).
 * onDetected(code) بيرجّع الأرقام فقط. يشتغل على iOS Safari وأندرويد.
 */
export default function BarcodeScanner({ onDetected, onClose, label='الباركود' }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stopped = false;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (result && !stopped) {
              stopped = true;
              const digits = String(result.getText()).trim();
              try { controlsRef.current?.stop(); } catch { /* noop */ }
              onDetected(digits);
            }
          }
        );
        controlsRef.current = controls;
        if (cancelled) { try { controls.stop(); } catch { /* noop */ } }
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'لازم تسمح بالوصول للكاميرا عشان تمسح الباركود.'
            : 'الكاميرا مش متاحة على الجهاز/المتصفح ده. تقدر تكتب الرقم يدويًا أو تستخدم قارئ باركود.'
        );
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* noop */ }
    };
  }, [onDetected]);

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm font-black text-white">📷 امسح {label}</span>
        <button type="button" onClick={onClose} aria-label="إغلاق"
                className="grid size-9 place-items-center rounded-full bg-white/15 text-lg text-white">✕</button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="mx-6 rounded-2xl bg-white/10 p-5 text-center text-sm font-bold leading-relaxed text-white">
            {error}
          </p>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted
                   className="size-full object-cover" />
            {/* إطار توجيه */}
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2
                            rounded-2xl border-2 border-accent/80 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
            <p className="absolute bottom-8 inset-x-0 text-center text-xs font-bold text-white/80">
              وجّه الكاميرا على {label}
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
