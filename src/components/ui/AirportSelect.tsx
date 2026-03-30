'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import airports, { type Airport } from '@/lib/airports';

interface AirportSelectProps {
  value: string;
  onChange: (value: string, airport?: Airport) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
}

const MAX_RESULTS = 20;

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-gold font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function AirportSelect({
  value,
  onChange,
  placeholder = 'Search city, airport, or IATA code...',
  className,
  label,
  error,
}: AirportSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [displayValue, setDisplayValue] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Resolve display value from IATA code
  useEffect(() => {
    if (value) {
      const airport = airports.find((a) => a.iata === value);
      if (airport) {
        setDisplayValue(`${airport.city} - ${airport.name} (${airport.iata})`);
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();

    // Score-based sorting: exact IATA match first, then starts-with, then contains
    const scored: { airport: Airport; score: number }[] = [];

    for (const airport of airports) {
      const iata = airport.iata.toLowerCase();
      const city = airport.city.toLowerCase();
      const name = airport.name.toLowerCase();
      const country = airport.country.toLowerCase();

      let score = 0;

      // Exact IATA match
      if (iata === q) {
        score = 100;
      } else if (iata.startsWith(q)) {
        score = 90;
      } else if (city === q) {
        score = 80;
      } else if (city.startsWith(q)) {
        score = 70;
      } else if (name.startsWith(q)) {
        score = 60;
      } else if (city.includes(q)) {
        score = 50;
      } else if (name.includes(q)) {
        score = 40;
      } else if (iata.includes(q)) {
        score = 30;
      } else if (country.includes(q)) {
        score = 20;
      }

      if (score > 0) {
        scored.push({ airport, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RESULTS).map((s) => s.airport);
  }, [query]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Restore display value if user didn't select
        if (!query.trim() && value) {
          const airport = airports.find((a) => a.iata === value);
          if (airport) {
            setDisplayValue(`${airport.city} - ${airport.name} (${airport.iata})`);
          }
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectAirport = useCallback(
    (airport: Airport) => {
      const display = `${airport.city} - ${airport.name} (${airport.iata})`;
      setDisplayValue(display);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(0);
      onChange(airport.iata, airport);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setDisplayValue(val);
    setHighlightedIndex(0);
    if (val.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      onChange('');
    }
  };

  const handleFocus = () => {
    if (query.trim()) {
      setIsOpen(true);
    }
    // If there's a selected value, select all text for easy replacement
    if (displayValue && inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) {
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightedIndex]) {
          selectAirport(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (filtered[highlightedIndex]) {
          selectAirport(filtered[highlightedIndex]);
        }
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setDisplayValue('');
    setIsOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Search icon */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-jet-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={displayValue || query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full bg-jet-charcoal border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white text-sm placeholder:text-jet-muted',
            'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50',
            'transition-all duration-200',
            error && 'border-red-500/50 focus:ring-red-500/30'
          )}
        />

        {/* Clear button */}
        {(displayValue || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-jet-muted hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1.5 max-h-72 overflow-y-auto bg-jet-dark border border-white/10 rounded-lg shadow-2xl shadow-black/50 py-1"
          role="listbox"
        >
          {filtered.map((airport, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={`${airport.iata}-${index}`}
                role="option"
                aria-selected={isHighlighted}
                className={cn(
                  'px-4 py-2.5 cursor-pointer transition-colors duration-100 flex items-center justify-between',
                  isHighlighted
                    ? 'bg-jet-slate/80 text-white'
                    : 'text-white/80 hover:bg-jet-charcoal hover:text-white'
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  selectAirport(airport);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Plane icon */}
                  <svg
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isHighlighted ? 'text-gold' : 'text-jet-muted'
                    )}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                  <div className="min-w-0">
                    <div className="text-sm truncate">
                      {highlightMatch(`${airport.city} - ${airport.name}`, query)}
                    </div>
                    <div className="text-xs text-jet-light truncate">
                      {highlightMatch(airport.country, query)}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'ml-3 text-xs font-mono font-bold flex-shrink-0 px-1.5 py-0.5 rounded',
                    isHighlighted
                      ? 'bg-gold/20 text-gold'
                      : 'bg-white/5 text-jet-light'
                  )}
                >
                  {airport.iata}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* No results */}
      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-jet-dark border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-4 text-center text-sm text-jet-muted">
          No airports found for &ldquo;{query}&rdquo;
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
