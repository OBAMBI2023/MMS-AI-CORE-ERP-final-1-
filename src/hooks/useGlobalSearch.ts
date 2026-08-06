import { useState, useEffect, useCallback, useRef } from "react";
import { globalSearchService } from "@/services/global-search.service";
import { SearchResult } from "@/types/search";

export const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_DELAY_MS = 300;

export const useGlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // Tracks the most recent search request so stale (out-of-order) responses
  // from earlier keystrokes can be ignored once the user keeps typing.
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHistory = localStorage.getItem("search-history");
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory));
        } catch {
          setHistory([]);
        }
      }
    }
  }, []);

  const addToHistory = useCallback((searchQuery: string) => {
    setHistory((prev) => {
      const newHistory = [searchQuery, ...prev.filter((h) => h !== searchQuery)].slice(0, 5);
      if (typeof window !== "undefined") {
        localStorage.setItem("search-history", JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      if (trimmed.length < MIN_QUERY_LENGTH) {
        latestRequestId.current += 1;
        setResults([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      const requestId = ++latestRequestId.current;

      try {
        setIsLoading(true);
        setError(null);

        const data = await globalSearchService.search(trimmed);

        if (requestId !== latestRequestId.current) return; // stale response, ignore

        setResults(data);
        addToHistory(trimmed);
      } catch (err) {
        if (requestId !== latestRequestId.current) return; // stale response, ignore

        console.error("Global search failed:", err);
        setError("La recherche a échoué. Veuillez réessayer.");
        setResults([]);
      } finally {
        if (requestId === latestRequestId.current) {
          setIsLoading(false);
        }
      }
    },
    [addToHistory],
  );

  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem("search-history");
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(handler);
  }, [query, performSearch]);

  return { query, setQuery, results, isLoading, error, history, clearHistory };
};
