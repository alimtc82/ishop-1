import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fetchSetting } from '../../lib/api';

// ══════════════════════════════════════════════════════════════
//  NewsTicker — شريط أخبار متحرك للاندينج (V13.7.4)
//
//  • حركة بـ requestAnimationFrame (لف لا نهائي بالـ modulo — مايفضاش
//    ولا يقف طول ما الصفحة مفتوحة). السرعة منفصلة عن اللف.
//  • بيقيس عرض النص ويكرّره كفاية يملأ الشاشة مرتين → بلا فراغ.
//  • روابط جوه النص: [نص](https://...) أو رابط صريح → تظهر زرقاء
//    وتفتح في تبويب جديد. الرندر بعناصر React (آمن ضد XSS).
// ══════════════════════════════════════════════════════════════

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;

/** يحوّل نص خبر لعناصر React: نص عادي + روابط زرقاء آمنة */
function parseItem(raw) {
  const nodes = [];
  let last = 0, m, i = 0;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(raw))) {
    if (m.index > last) nodes.push(raw.slice(last, m.index));
    const url = m[2] || m[3];
    const text = m[2] ? m[1] : m[3];
    const safe = /^https?:\/\//i.test(url) ? url : '#';
    nodes.push(
      <a key={`l${i++}`} href={safe} target="_blank" rel="noopener noreferrer"
         className="font-black underline underline-offset-2" style={{ color: '#5cb3ff' }}>{text}</a>
    );
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push(raw.slice(last));
  return nodes;
}

/** المحرّك: بيرسم الشريط المتحرك من نص + سرعة + اتجاه */
export function NewsTickerView({ text, speed = 5, direction = 'rtl' }) {
  const items = useMemo(
    () => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean),
    [text]
  );
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const setRef = useRef(null);
  const st = useRef({ offset: 0, baseW: 0, paused: false, last: 0 });
  const [copies, setCopies] = useState(2);

  // قياس عرض نسخة واحدة + حساب عدد النسخ المطلوبة
  useLayoutEffect(() => {
    const set = setRef.current, vp = viewportRef.current;
    if (!set || !vp || !items.length) return;
    const baseW = set.getBoundingClientRect().width;
    st.current.baseW = baseW;
    st.current.offset = 0;
    if (baseW) {
      const V = vp.getBoundingClientRect().width || 360;
      const need = Math.max(2, Math.ceil((baseW + V) / baseW) + 1);
      setCopies((c) => (c === need ? c : need));
    }
  }, [items, direction, copies]);

  // إعادة القياس عند تغيّر حجم الشاشة
  useEffect(() => {
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const set = setRef.current, vp = viewportRef.current;
        if (!set || !vp) return;
        const baseW = set.getBoundingClientRect().width;
        st.current.baseW = baseW;
        if (baseW) {
          const V = vp.getBoundingClientRect().width || 360;
          setCopies(Math.max(2, Math.ceil((baseW + V) / baseW) + 1));
        }
      }, 180);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, []);

  // حلقة الحركة
  useEffect(() => {
    const pxPerSec = 18 + Number(speed || 5) * 20;
    let raf;
    const tick = (now) => {
      const s = st.current;
      if (!s.last) s.last = now;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (!s.paused && s.baseW && trackRef.current) {
        s.offset += pxPerSec * dt;
        if (s.offset >= s.baseW) s.offset -= s.baseW;
        const x = direction === 'ltr' ? (s.offset - s.baseW) : (-s.offset);
        trackRef.current.style.transform = `translateX(${x}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [copies, speed, direction, items]);

  if (!items.length) return null;

  const pause = (v) => () => { st.current.paused = v; };
  const maskStyle = {
    direction: 'ltr',
    WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)',
    maskImage: 'linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)',
  };

  return (
    <div
      ref={viewportRef}
      className="relative min-w-0 flex-1 overflow-hidden"
      style={maskStyle}
      onMouseEnter={pause(true)} onMouseLeave={pause(false)}
      onTouchStart={pause(true)} onTouchEnd={pause(false)}
    >
      <div ref={trackRef} className="flex h-11 w-max items-center will-change-transform">
        {Array.from({ length: copies }).map((_, ci) => (
          <span key={ci} ref={ci === 0 ? setRef : null} className="flex shrink-0 items-center">
            {items.map((it, ii) => (
              <span key={ii} dir="rtl" className="inline-flex items-center gap-2.5 whitespace-nowrap px-5 text-sm font-bold text-text">
                <span>{parseItem(it)}</span>
                <span className="text-accent" style={{ opacity: 0.9 }}>✦</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/** الغلاف: بيقرا الإعداد من site_settings ويعرض الشريط لو مفعّل */
export default function NewsTicker() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchSetting('news_ticker')
      .then((v) => {
        if (!alive) return;
        const val = typeof v === 'string' ? safeParse(v) : v;
        setCfg(val || null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!cfg || !cfg.enabled || !String(cfg.text || '').trim()) return null;

  return (
    <div className="border-b border-accent-line" style={{ direction: 'rtl', background: 'linear-gradient(90deg, var(--accent-soft), transparent)' }}>
      <div className="mx-auto flex max-w-7xl items-stretch">
        <div className="flex shrink-0 items-center gap-1.5 px-3.5 text-[12px] font-black text-on-accent" style={{ background: 'var(--accent)' }}>
          <span className="inline-block size-2 animate-pulse rounded-full" style={{ background: '#c0392b' }} />
          عاجل
        </div>
        <NewsTickerView text={cfg.text} speed={cfg.speed} direction={cfg.direction || 'rtl'} />
      </div>
    </div>
  );
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
