"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SearchableOption = {
  value: string;
  label?: string;
};

type SearchableSelectProps = {
  options: SearchableOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
};

export function SearchableSelect({
  options,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  placeholder,
  className,
  searchPlaceholder = "Search...",
}: SearchableSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const selectedValue = isControlled ? value : internalValue;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  const filteredOptions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter((option) => {
      const label = (option.label ?? option.value).toLowerCase();
      return label.includes(keyword) || option.value.toLowerCase().includes(keyword);
    });
  }, [options, searchTerm]);

  function updateValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setIsOpen(false);
    setSearchTerm("");
  }

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={selectedValue} required={required} /> : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${className ?? "mm-input"} text-left ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {selectedOption ? (selectedOption.label ?? selectedOption.value) : (placeholder ?? "Select an option")}
      </button>

      {isOpen ? (
        <div className="absolute z-50 mt-1 w-fit min-w-full max-w-[20rem] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="mm-input mb-2 h-9"
          />
          <div className="max-h-52 overflow-y-auto rounded-md border border-zinc-100">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateValue(option.value)}
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      isSelected ? "bg-sky-50 text-sky-700" : "hover:bg-zinc-50"
                    }`}
                  >
                    {option.label ?? option.value}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-zinc-400">No results</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
