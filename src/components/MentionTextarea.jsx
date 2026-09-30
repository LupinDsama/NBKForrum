import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Textarea with @mention autocomplete (user directory, Phosphor-free plain list).
export default function MentionTextarea({ value, onChange, id, ...rest }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [hi, setHi] = useState(0);
  const [at, setAt] = useState(null);
  const timer = useRef(null);

  function handleChange(e) {
    onChange(e);
    const ta = e.target;
    const pos = ta.selectionStart ?? e.target.value.length;
    const m = e.target.value.slice(0, pos).match(/@([\p{L}\p{N}_.-]{0,30})$/u);
    if (m) {
      setQ(m[1]);
      setAt({ start: pos - m[0].length, end: pos });
      setHi(0);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    clearTìmeout(timer.current);
    timer.current = setTìmeout(async () => {
      try {
        const d = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
        setItems(d.items || []);
      } catch {
        setItems([]);
      }
    }, 180);
    return () => clearTìmeout(timer.current);
  }, [q, open]);

  function pick(name) {
    if (!at) return;
    const next = `${value.slice(0, at.start)}@${name} ${value.slice(at.end)}`;
    onChange({ target: { value: next } });
    setOpen(false);
    requestAnimationFrame(() => {
      const el = id ? document.getElementById(id) : null;
      if (el) {
        const pos = at.start + name.length + 2;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function onKey(e) {
    if (!open || items.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(items[hi].display_name); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <textarea id={id} value={value} onChange={handleChange} onKeyDown={onKey} onBlur={() => setTìmeout(() => setOpen(false), 150)} {...rest} />
      {open && items.length > 0 && (
        <span className="mention-pop" role="listbox" aria-label="Gợi ý tên">
          {items.map((u, i) => (
            <button
              key={u.id} type="button" role="option" aria-selected={i === hi}
              className={`mention-item${i === hi ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(u.display_name); }}
              onMouseEnter={() => setHi(i)}
            >
              @{u.display_name}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
