import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Database, Loader2 } from 'lucide-react';

export interface OdooSelectOption {
  label: string;
  value: string;
  subLabel?: string;
  badge?: string;
  raw?: any;
}

export interface OdooSearchSelectProps<T = any> {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, rawItem?: T) => void;
  options?: T[];
  fetchOptions?: () => Promise<T[]>;
  getOptionLabel?: (item: T) => string;
  getOptionValue?: (item: T) => string;
  getOptionSubLabel?: (item: T) => string | undefined;
  getOptionBadge?: (item: T) => string | undefined;
  allowCustomInput?: boolean;
  required?: boolean;
  disabled?: boolean;
  badge?: string;
  helperText?: string;
  className?: string;
  inputClassName?: string;
}

export function OdooSearchSelect<T = any>({
  label,
  placeholder = 'Search or select...',
  value,
  onChange,
  options: externalOptions,
  fetchOptions,
  getOptionLabel = (item: any) => (typeof item === 'string' ? item : item.label || item.name || item.sku || ''),
  getOptionValue = (item: any) => (typeof item === 'string' ? item : item.value || item.sku || item.name || ''),
  getOptionSubLabel,
  getOptionBadge,
  allowCustomInput = true,
  required = false,
  disabled = false,
  badge = 'Odoo Live',
  helperText,
  className = '',
  inputClassName = '',
}: OdooSearchSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalOptions, setInternalOptions] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load options if fetchOptions is provided
  useEffect(() => {
    let active = true;
    if (fetchOptions) {
      setIsLoading(true);
      fetchOptions()
        .then((items) => {
          if (active) {
            setInternalOptions(items || []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch Odoo options:', err);
          if (active) setIsLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [fetchOptions]);

  const items = externalOptions !== undefined ? externalOptions : internalOptions;

  // Filter options based on search query or value when not typing
  const filteredOptions = React.useMemo(() => {
    if (!items || items.length === 0) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items.slice(0, 50);

    return items
      .filter((item) => {
        const itemLabel = getOptionLabel(item).toLowerCase();
        const itemValue = getOptionValue(item).toLowerCase();
        const itemSub = getOptionSubLabel ? (getOptionSubLabel(item) || '').toLowerCase() : '';
        return itemLabel.includes(query) || itemValue.includes(query) || itemSub.includes(query);
      })
      .slice(0, 50);
  }, [items, searchQuery, getOptionLabel, getOptionValue, getOptionSubLabel]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: T) => {
    const val = getOptionValue(item);
    onChange(val, item);
    setSearchQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchQuery(newVal);
    if (!isOpen) setIsOpen(true);
    if (allowCustomInput) {
      onChange(newVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Scroll highlighted element into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-slate-300 font-medium text-xs flex items-center gap-1.5">
            {label}
            {required && <span className="text-rose-400">*</span>}
          </label>
          {badge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-2.5 h-2.5 text-[#81C341]" />
              {badge}
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          required={required && !value}
          value={isOpen ? (searchQuery !== '' ? searchQuery : value) : value}
          onChange={handleInputChange}
          onFocus={() => {
            setSearchQuery('');
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 focus:border-[#81C341] focus:ring-1 focus:ring-[#81C341]/40 rounded-lg pl-3 pr-16 py-2 text-white placeholder:text-slate-500 text-xs font-medium outline-none transition-all ${inputClassName}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          ) : value ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange('');
                setSearchQuery('');
              }}
              className="text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="text-slate-400 hover:text-slate-200 p-0.5"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {helperText && <p className="text-[10px] text-slate-400 mt-1">{helperText}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 flex flex-col">
          <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Search className="w-3 h-3 text-[#81C341]" />
              {items.length > 0 ? `${items.length} Odoo records available` : 'Searching Odoo...'}
            </span>
            {allowCustomInput && <span className="text-[10px] text-slate-500">Type custom if not listed</span>}
          </div>

          <ul ref={listRef} className="overflow-y-auto max-h-52 divide-y divide-slate-800/40 p-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-slate-400">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#81C341]" />
                    Fetching from Odoo...
                  </span>
                ) : (
                  <div>
                    <p className="text-slate-300">No Odoo records match &quot;{searchQuery}&quot;</p>
                    {allowCustomInput && (
                      <p className="text-[10px] text-slate-500 mt-0.5">Press Enter or click away to use custom value</p>
                    )}
                  </div>
                )}
              </li>
            ) : (
              filteredOptions.map((item, idx) => {
                const optVal = getOptionValue(item);
                const optLbl = getOptionLabel(item);
                const optSub = getOptionSubLabel ? getOptionSubLabel(item) : undefined;
                const optBadge = getOptionBadge ? getOptionBadge(item) : undefined;
                const isSelected = optVal === value || optLbl === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={`${optVal}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-[#132E58] text-white font-medium'
                        : isHighlighted
                        ? 'bg-slate-800/90 text-slate-100'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{optLbl}</span>
                        {optVal !== optLbl && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">({optVal})</span>
                        )}
                        {optBadge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/40">
                            {optBadge}
                          </span>
                        )}
                      </div>
                      {optSub && <span className="text-[11px] text-slate-400 truncate mt-0.5">{optSub}</span>}
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-[#81C341] shrink-0 ml-2" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
