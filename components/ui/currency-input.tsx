"use client";

import { Input } from "./input";
import { formatCurrencyInput } from "@/lib/masks";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

function getCents(val: string): number {
  if (!val) return 0;
  return Math.round(parseFloat(val) * 100);
}

export function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newCents = Math.floor(getCents(value) / 10);
      onChange(newCents === 0 ? "" : (newCents / 100).toFixed(2));
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const newCents = getCents(value) * 10 + parseInt(e.key, 10);
      if (newCents > 999999999) return; // limita ~9.9 milhões
      onChange((newCents / 100).toFixed(2));
    }
    // outros: Tab, setas, etc. passam normalmente
  };

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={formatCurrencyInput(value)}
      onChange={() => {}} // controlado via onKeyDown
      onKeyDown={handleKeyDown}
    />
  );
}
