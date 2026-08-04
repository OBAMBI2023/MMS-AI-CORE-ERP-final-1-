import { MessageCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const WHATSAPP_NUMBER = "2250758483726";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function WhatsAppWidget() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Besoin d’aide ? Écrivez-nous sur WhatsApp"
            className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition-transform hover:scale-105 hover:bg-emerald-600"
          >
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left">Besoin d’aide ? Écrivez-nous sur WhatsApp</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
