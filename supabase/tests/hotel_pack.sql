BEGIN;
SELECT plan(3);
SELECT is((SELECT count(*)::integer FROM public.module_pack_items i JOIN public.module_packs p ON p.id=i.pack_id WHERE p.code='hotel'),7,'Le pack Hôtel contient exactement 7 modules');
SELECT is((SELECT count(*)::integer FROM public.module_pack_items i JOIN public.module_packs p ON p.id=i.pack_id JOIN public.erp_modules m ON m.id=i.module_id WHERE p.code='hotel' AND m.code='expenses'),1,'Le pack réutilise Dépenses');
SELECT ok(EXISTS(SELECT 1 FROM pg_constraint WHERE conname='hotel_reservations_no_overlap'),'La contrainte anti-chevauchement existe');
SELECT * FROM finish();
ROLLBACK;
