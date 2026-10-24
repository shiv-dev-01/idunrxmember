import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, FileText, Video, User, ShoppingBag } from 'lucide-react';
import type { SearchResult, SearchCategory } from '../types';

const CATEGORIES: Record<SearchCategory, { icon: typeof SearchIcon; label: string }> = {
  orders: { icon: ShoppingBag, label: 'Orders' },
  videos: { icon: Video, label: 'Videos' },
  account: { icon: User, label: 'Account' },
  docs: { icon: FileText, label: 'Documentation' },
};

// Mock data - in a real app, this would come from your backend
const SEARCH_DATA: SearchResult[] = [
  {
    id: '1',
    title: 'Order #ORD-001',
    description: 'Compounded Semaglutide - Processed on Mar 15, 2024',
    category: 'orders',
    url: '/orders',
  },
  {
    id: '2',
    title: 'How to Use Your Injection Pen',
    description: 'Step-by-step guide for medication administration',
    category: 'videos',
    url: '/videos',
  },
  {
    id: '3',
    title: 'Account Settings',
    description: 'Update your personal information and preferences',
    category: 'account',
    url: '/account',
  },
  {
    id: '4',
    title: 'Medication Storage Guide',
    description: 'Learn how to properly store your medication',
    category: 'docs',
    url: '/videos',
  },
  {
    id: '5',
    title: 'Order #ORD-002',
    description: 'Compounded Semaglutide - Shipped on Feb 15, 2024',
    category: 'orders',
    url: '/orders',
  },
];

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();

  const search = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const searchTerms = searchQuery.toLowerCase().split(' ');
    
    const filtered = SEARCH_DATA.filter(item => {
      const content = `${item.title} ${item.description}`.toLowerCase();
      return searchTerms.every(term => content.includes(term));
    });

    setResults(filtered);
  }, []);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    search(newQuery);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(result.url);
  };

  const handleClickOutside = () => {
    setIsOpen(false);
  };

  return {
    query,
    results,
    isOpen,
    selectedIndex,
    categories: CATEGORIES,
    handleQueryChange,
    handleKeyDown,
    handleSelect,
    handleClickOutside,
  };
}