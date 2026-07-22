import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWorkspace } from "./ChatWorkspace";

export function AssistantIAERP() {
  const [key, setKey] = useState(0);

  const clearConversation = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <Card className="h-[600px] flex flex-col overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assistant IA ERP</h2>
            <p className="text-sm text-muted-foreground">
              Posez une question sur votre entreprise. L'assistant analyse vos données et vous répond instantanément.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearConversation} className="gap-2">
          <Trash2 className="h-4 w-4" /> Effacer
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWorkspace key={key} />
      </div>
    </Card>
  );
}
