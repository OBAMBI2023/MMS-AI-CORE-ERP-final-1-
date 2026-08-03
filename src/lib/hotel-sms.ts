export const HOTEL_SMS_TYPES = ["confirmation", "check_in", "check_out", "arrival_reminder", "payment_received", "balance_reminder", "cancellation", "custom", "thanks"] as const;
export type HotelSmsType = (typeof HOTEL_SMS_TYPES)[number];
export const HOTEL_SMS_LABELS: Record<HotelSmsType, string> = { confirmation: "Confirmation", check_in: "Check-in", check_out: "Check-out", arrival_reminder: "Rappel d’arrivée", payment_received: "Paiement reçu", balance_reminder: "Rappel de paiement", cancellation: "Annulation", custom: "Personnalisé", thanks: "Remerciement" };
export type ProviderResult = { status: "sent" | "pending"; providerMessageId?: string; requestId?: string; httpStatus: number; payload: unknown; estimatedCost?: number; currency?: string };
export interface SMSProvider { readonly name: string; send(input: { to: string; message: string; idempotencyKey: string }): Promise<ProviderResult>; }
export function normalizeIvorianPhone(value: string): string { let digits=value.replace(/\D/g,"");if(digits.startsWith("00"))digits=digits.slice(2);if(digits.startsWith("225"))digits=digits.slice(3);if(digits.length!==10||!/^(01|05|07)\d{8}$/.test(digits))throw new Error("Numéro ivoirien invalide. Format attendu : +225 suivi de 10 chiffres.");return `+225${digits}`; }
export const hotelSmsTemplates: Record<HotelSmsType,string>={
 confirmation:"Bonjour {client}, votre réservation est confirmée du {arrivee} au {depart}. Logement {chambre}.",
 check_in:"Bonjour {client}, votre logement {chambre} est prêt pour votre check-in aujourd’hui.",
 check_out:"Bonjour {client}, votre check-out est prévu le {depart}. Merci pour votre séjour.",
 arrival_reminder:"Bonjour {client}, rappel : votre arrivée est prévue le {arrivee}. Nous vous attendons avec plaisir.",
 payment_received:"Bonjour {client}, nous confirmons la réception de votre paiement. Merci.",
 balance_reminder:"Bonjour {client}, le solde restant de votre séjour est de {solde}.",
 cancellation:"Bonjour {client}, votre réservation du {arrivee} au {depart} a été annulée.",
 custom:"Bonjour {client}, ",thanks:"Bonjour {client}, merci d’avoir séjourné chez nous. Au plaisir de vous accueillir à nouveau.",
};
export function renderHotelSms(template:string,values:Record<string,string>):string{return template.replace(/\{([a-z]+)\}/gi,(token,key:string)=>values[key]??token);}
