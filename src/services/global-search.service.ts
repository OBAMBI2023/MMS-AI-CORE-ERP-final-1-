import { supabase } from "@/integrations/supabase/client";
import { SearchResult } from "@/types/search";

export const globalSearchService = {
  async search(query: string): Promise<SearchResult[]> {
    if (!query) return [];

    const { data, error } = await supabase.rpc("global_search", { search_query: query });

    if (error) {
      console.error("Error searching:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return (data ?? []) as SearchResult[];
  },
};
