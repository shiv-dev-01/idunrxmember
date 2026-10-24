import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  error?: string;
  isLoading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  error,
  isLoading
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  useOnClickOutside(containerRef, () => setIsOpen(false));

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <div
        className={`
          relative border rounded-lg px-3 py-2 cursor-pointer
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-primary-200 border-primary-300' : ''}
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <ChevronDown className={`
              w-4 h-4 text-gray-400 transition-transform
              ${isOpen ? 'transform rotate-180' : ''}
            `} />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                placeholder="Search..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`
                    px-4 py-2 cursor-pointer hover:bg-gray-50
                    ${option === value ? 'bg-primary-50 text-primary-600' : 'text-gray-900'}
                  `}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}