import React, { useRef, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import type { SearchResult } from '../../types';

export function SearchBox() {
  const {
    query,
    results,
    isOpen,
    selectedIndex,
    categories,
    handleQueryChange,
    handleKeyDown,
    handleSelect,
    handleClickOutside,
  } = useSearch();

  const searchRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(searchRef, handleClickOutside);

  const renderResult = (result: SearchResult, index: number) => {
    const category = categories[result.category];
    const Icon = category.icon;
    const isSelected = index === selectedIndex;

    return (
      <button
        key={result.id}
        onClick={() => handleSelect(result)}
        className={`
          w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none
          ${isSelected ? 'bg-gray-50' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-1 p-2 rounded-lg bg-${result.category === 'orders' ? 'primary' : 'gray'}-50`}>
            <Icon className={`w-4 h-4 text-${result.category === 'orders' ? 'primary' : 'gray'}-500`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{result.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{result.description}</p>
            <p className="text-xs text-gray-400 mt-1">{category.label}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => handleQueryChange(query)}
          placeholder="Search orders, videos, account..."
          className="pl-10 pr-4 py-2 w-[300px] bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-h-[400px] overflow-y-auto">
          <div className="py-2">
            {results.map((result, index) => renderResult(result, index))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">No results found for "{query}"</p>
          </div>
        </div>
      )}
    </div>
  );
}