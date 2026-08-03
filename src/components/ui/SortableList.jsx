import { useRef, useState } from 'react';

/**
 * قائمة قابلة لإعادة الترتيب بالسحب والإفلات — تعمل بالماوس واللمس.
 * items: مصفوفة، keyOf: دالة تُرجع مفتاح العنصر، onReorder: تُستدعى بالمصفوفة الجديدة.
 * children: (item, index) => JSX
 */
export default function SortableList({ items, keyOf, onReorder, children, className = '' }) {
  const [dragIdx, setDragIdx] = useState(-1);
  const [overIdx, setOverIdx] = useState(-1);
  const touchRef = useRef({ startY: 0, idx: -1 });

  const move = (from, to) => {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onReorder(next);
  };

  const finish = () => { setDragIdx(-1); setOverIdx(-1); };

  return (
    <div className={className}>
      {items.map((item, i) => (
        <div
          key={keyOf(item)}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
          onDrop={e => { e.preventDefault(); move(dragIdx, i); finish(); }}
          onDragEnd={finish}
          onTouchStart={e => { touchRef.current = { startY: e.touches[0].clientY, idx: i }; setDragIdx(i); }}
          onTouchMove={e => {
            const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            const row = el?.closest('[data-sort-idx]');
            if (row) setOverIdx(Number(row.getAttribute('data-sort-idx')));
          }}
          onTouchEnd={() => { move(touchRef.current.idx, overIdx); finish(); }}
          data-sort-idx={i}
          className={`cursor-grab touch-none select-none transition ${
            dragIdx === i ? 'opacity-40' : ''
          } ${overIdx === i && dragIdx !== i ? 'ring-2 ring-accent' : ''}`}
        >
          {children(item, i)}
        </div>
      ))}
    </div>
  );
}

/** مقبض السحب — للعرض فقط */
export function DragHandle() {
  return <span className="cursor-grab select-none px-1 text-lg text-muted" title="اسحب لإعادة الترتيب">⋮⋮</span>;
}
