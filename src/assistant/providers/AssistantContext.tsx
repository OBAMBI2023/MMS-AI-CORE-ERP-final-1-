import { createContext, useContext, useState, ReactNode } from "react";

interface AssistantContextType {
  pageContext: Record<string, any> | null;
  setPageContext: (context: Record<string, any> | null) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<Record<string, any> | null>(null);

  return (
    <AssistantContext.Provider value={{ pageContext, setPageContext }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistantContext must be used within an AssistantProvider");
  }
  return context;
}
