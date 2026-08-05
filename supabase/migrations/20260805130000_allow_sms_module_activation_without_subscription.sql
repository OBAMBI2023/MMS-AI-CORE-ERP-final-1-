-- Activating the hotel_sms module (or creating a tenant whose sector pack
-- includes it) must never fail for lack of a subscription: the "hotel" pack
-- advertises hotel_sms to every tenant (see 20260803130000), so the sector
-- trial signup at create_public_trial_workspace (20260805120000) was failing
-- outright for the Hôtel sector because it unconditionally enables every
-- module in the pack, including hotel_sms, inside the same transaction as
-- tenant creation.
--
-- Subscription state remains the gate for actually sending SMS: it is still
-- enforced at write time by reserve_hotel_sms_credit/settle_hotel_sms_credit
-- on public.hotel_sms_logs (20260803130000), untouched here.
DROP TRIGGER IF EXISTS enforce_premium_module_subscription ON public.tenant_modules;
DROP FUNCTION IF EXISTS public.enforce_premium_module_subscription();

NOTIFY pgrst, 'reload schema';
