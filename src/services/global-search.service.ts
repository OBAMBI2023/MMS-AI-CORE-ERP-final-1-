import { supabase } from "@/integrations/supabase/client";
import { SearchResult } from "@/types/search";

let searchErrorCount = 0;
const MAX_SEARCH_ERRORS = 3;

export const globalSearchService = {
  async search(query: string): Promise<SearchResult[]> {
    if (searchErrorCount >= MAX_SEARCH_ERRORS) return [];
    if (!query) return [];

    console.log("Global search initiated with query:", query);
    console.log("RPC arguments:", { search_query: query });

    const { data, error } = await supabase.rpc(
      "global_search",
      { search_query: query },
      { schema: "public" },
    );

    console.log("RPC result:", { data, error });
    console.log("RPC data length:", data?.length);

    if (error) {
      searchErrorCount++;
      console.error("Error searching:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    console.log("Search results received:", data);
    searchErrorCount = 0;
    return data as SearchResult[];
  },
};
