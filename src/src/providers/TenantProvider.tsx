import { createContext, useContext, ReactNode } from "react";
import type { TenantProfile } from "@/types/tenant";

type TenantContextType = {
  profile: TenantProfile | null;
  loading: boolean;
};

const TenantContext = createContext<TenantContextType>({
  profile: null,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  return (
    <TenantContext.Provider
      value={{
        profile: null,
        loading: false,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}