import { useEffect } from "react";
import { useAssistantContext } from "./AssistantContext";

/**
 * Hook for pages to automatically update the assistant's context.
 * @param context - The structured data representation of the current page's state.
 */
export function useAssistantPageContext(context: Record<string, any>) {
  const { setPageContext } = useAssistantContext();

  useEffect(() => {
    // Set the context when the component mounts
    setPageContext(context);

    // Clear the context when the component unmounts
    return () => {
      setPageContext(null);
    };
  }, [context, setPageContext]);
}
