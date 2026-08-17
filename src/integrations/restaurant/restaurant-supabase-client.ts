// Restaurant project public client.
// Never place a secret/service_role key here.
import { createClient } from "@supabase/supabase-js";
import { readEnvVar } from "@/integrations/supabase/env";

function createRestaurantSupabaseClient() {
  const restaurantSupabaseUrl = readEnvVar(
    "VITE_RESTAURANT_SUPABASE_URL",
    "RESTAURANT_SUPABASE_URL",
  );
  const restaurantSupabaseKey = readEnvVar(
    "VITE_RESTAURANT_SUPABASE_PUBLISHABLE_KEY",
    "RESTAURANT_SUPABASE_PUBLISHABLE_KEY",
  );

  if (!restaurantSupabaseUrl || !restaurantSupabaseKey) {
    const missing = [
      ...(!restaurantSupabaseUrl ? ["VITE_RESTAURANT_SUPABASE_URL"] : []),
      ...(!restaurantSupabaseKey ? ["VITE_RESTAURANT_SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Restaurant Supabase environment variables: ${missing.join(" and ")}.`;
    console.error(`[Restaurant Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient(restaurantSupabaseUrl, restaurantSupabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "saovia-restaurant-auth",
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}

let _restaurantSupabase: ReturnType<typeof createRestaurantSupabaseClient> | undefined;

export const restaurantSupabase = new Proxy({} as ReturnType<typeof createRestaurantSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_restaurantSupabase) _restaurantSupabase = createRestaurantSupabaseClient();
    return Reflect.get(_restaurantSupabase, prop, receiver);
  },
});
