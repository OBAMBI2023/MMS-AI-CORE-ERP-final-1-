import { useState, useEffect, useCallback } from 'react';
import { globalSearchService } from '@/services/global-search.service';
import { SearchResult } from '@/types/search';

export const useGlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('search-history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    console.log('performSearch called with:', searchQuery);
    if (!searchQuery) {
      console.log('Empty query, clearing results');
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    // Add to history
    const newHistory = [searchQuery, ...history.filter(h => h !== searchQuery)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('search-history', JSON.stringify(newHistory));

    try {
      console.log('Calling globalSearchService.search...');
      const data = await globalSearchService.search(searchQuery);
      console.log('Data received from service:', data);
      setResults(data);
    } catch (error) {
      console.error('Search failed in hook:', error);
      setResults([]);
    } finally {
      console.log('Search operation finished, setting isLoading to false');
      setIsLoading(false);
    }
  }, [history]);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('search-history');
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query, performSearch]);

  return { query, setQuery, results, isLoading, history, clearHistory };
};
