export type RestaurantTrialPayload = {
  restaurantName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  turnstileToken: string;
};

type RestaurantTrialResponse = {
  accessToken: string;
  refreshToken: string;
  loginUrl?: string;
};

function getRestaurantFunctionBaseUrl(): string {
  const baseUrl =
    import.meta.env.VITE_RESTAURANT_SUPABASE_URL ?? import.meta.env.RESTAURANT_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Restaurant Supabase URL is missing.");
  }
  return baseUrl.replace(/\/$/, "");
}

function getRestaurantPublishableKey(): string {
  const key =
    import.meta.env.VITE_RESTAURANT_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.RESTAURANT_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Restaurant Supabase publishable key is missing.");
  }
  return key;
}

function mapRestaurantTrialError(message: string): string {
  const normalized = message.toUpperCase();
  if (normalized.includes("TRIAL_ALREADY_USED")) {
    return "Cet établissement Restaurant a déjà utilisé son essai gratuit.";
  }
  if (normalized.includes("ACCOUNT_ALREADY_EXISTS")) {
    return "Un compte Restaurant existe déjà avec cet e-mail ou ce numéro de téléphone.";
  }
  if (normalized.includes("TURNSTILE_EXPIRED")) {
    return "La vérification anti-robot Restaurant a expiré. Veuillez la refaire.";
  }
  if (normalized.includes("TURNSTILE_FAILED")) {
    return "La vérification anti-robot Restaurant a échoué. Veuillez recommencer.";
  }
  return message;
}

export async function createRestaurantTrial(payload: RestaurantTrialPayload): Promise<RestaurantTrialResponse> {
  const response = await fetch(`${getRestaurantFunctionBaseUrl()}/functions/v1/start-restaurant-trial`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getRestaurantPublishableKey(),
    } as HeadersInit,
    body: JSON.stringify({
      restaurantName: payload.restaurantName,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      turnstileToken: payload.turnstileToken,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string } & Partial<RestaurantTrialResponse>;
  if (!response.ok) {
    const message = data.error ?? data.message ?? `Restaurant trial request failed (${response.status}).`;
    throw new Error(mapRestaurantTrialError(message));
  }

  if (!data.accessToken || !data.refreshToken) {
    throw new Error("Restaurant trial response is missing session tokens.");
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    loginUrl: data.loginUrl,
  };
}
