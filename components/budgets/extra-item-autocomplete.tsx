"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Template {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  unitPrice: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (template: Template) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  autoFocus?: boolean;
}

export function ExtraItemAutocomplete({ value, onChange, onSelect, placeholder, error, className, autoFocus }: Props) {
  const [suggestions, setSuggestions] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await fetch(`/api/v1/extra-item-templates?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const json = await res.json();
      const list: Template[] = Array.isArray(json.data) ? json.data : [];
      setSuggestions(list);
      setOpen(list.length > 0);
      setHighlighted(-1);
    } catch { /* ignore */ }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); pick(suggestions[highlighted]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  function pick(t: Template) {
    onSelect(t);
    setOpen(false);
    setSuggestions([]);
  }

  // Close when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={
          className ??
          `w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#EA580C] ${
            error ? "border-red-400" : "border-gray-200"
          }`
        }
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-0.5 max-h-52 overflow-auto">
          {suggestions.map((t, i) => (
            <li
              key={t.id}
              onMouseDown={() => pick(t)}
              className={`px-3 py-2 cursor-pointer select-none ${
                i === highlighted ? "bg-orange-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-medium text-gray-800">{t.name}</div>
              {t.description && (
                <div className="text-xs text-gray-400 truncate">{t.description}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">
                {t.unit} &middot; R$ {Number(t.unitPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
