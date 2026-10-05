"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
  description?: string;
};

export function CleanSelect({
  value,
  onChange,
  options,
  label = "Selecionar",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open}
        className="clean-select-trigger"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="min-w-0 truncate">{selected?.label ?? label}</span>
        <ChevronDown size={16} strokeWidth={1.9} className={`shrink-0 text-[#747b91] transition ${open ? "rotate-180 text-[#5977f4]" : ""}`} />
      </button>
      {open && (
        <div role="listbox" aria-labelledby={id} className="clean-select-menu">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                className="clean-select-option"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.description && <span className="mt-0.5 block truncate text-[10px] text-[#8b90a2]">{option.description}</span>}
                </span>
                {active && <Check size={15} strokeWidth={2.1} className="shrink-0 text-[#5977f4]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
