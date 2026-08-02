import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../../supabase/migrations/20260801150000_confine_recovery_and_require_active_profile.sql", import.meta.url),
  "utf8",
);
const atomicInvitationSql = readFileSync(
  new URL("../../supabase/migrations/20260802130000_atomic_invited_tenant_creation.sql", import.meta.url),
  "utf8",
);
const superAdminServer = readFileSync(new URL("./super-admin.server.ts", import.meta.url), "utf8");
const hotelRlsSql = readFileSync(
  new URL("../../supabase/migrations/20260802140000_harden_hotel_rls_permissions.sql", import.meta.url),
  "utf8",
);
const routePermissionSource = readFileSync(new URL("./route-permissions.ts", import.meta.url), "utf8");
const hotelSecurityFixSql = readFileSync(
  new URL("../../supabase/migrations/20260802150000_fix_hotel_identity_and_room_type_tenant.sql", import.meta.url),
  "utf8",
);
const hotelExportSql = readFileSync(
  new URL("../../supabase/migrations/20260802160000_secure_hotel_report_export.sql", import.meta.url),
  "utf8",
);
const hotelReportServer = readFileSync(new URL("./hotel-reports.server.ts", import.meta.url), "utf8");
const hotelPagesSource = readFileSync(new URL("../components/hotel/HotelPages.tsx", import.meta.url), "utf8");

test("les RPC/RLS tenant exigent profil actif, rôle du tenant et licence", () => {
  assert.match(sql, /profile\.status\s*=\s*'active'/i);
  assert.match(sql, /role\.tenant_id\s*=\s*profile\.tenant_id/i);
  assert.match(sql, /tenant_has_current_access\(profile\.tenant_id\)/i);
  assert.match(sql, /REVOKE ALL[\s\S]*FROM PUBLIC, anon/i);
});

test("la création invitée regroupe toutes les écritures SQL dans une RPC", () => {
  assert.match(atomicInvitationSql, /CREATE OR REPLACE FUNCTION public\.create_invited_tenant_atomic/i);
  assert.match(atomicInvitationSql, /INSERT INTO public\.tenants[\s\S]*UPDATE public\.profiles[\s\S]*initialize_tenant_roles[\s\S]*UPDATE public\.subscriptions[\s\S]*INSERT INTO public\.tenant_modules/i);
  assert.match(atomicInvitationSql, /REVOKE ALL[\s\S]*FROM PUBLIC,anon,authenticated/i);
});

test("le serveur ne finalise plus le tenant par écritures SQL séparées", () => {
  const flow = superAdminServer.slice(
    superAdminServer.indexOf('export const createInvitedTenant'),
    superAdminServer.indexOf('export const resendSuperAdminTenantInvitation'),
  );
  assert.match(flow, /create_invited_tenant_atomic/);
  assert.doesNotMatch(flow, /\.from\("tenants"\)\s*\.update/);
  assert.doesNotMatch(flow, /\.from\("tenant_modules"\)/);
  assert.match(flow, /if \(!committed && invitedUserId\)[\s\S]*unexpectedProfile\?\.tenant_id[\s\S]*deleteUser/);
});

test("les tables HOTEL utilisent des politiques par opération et permission", () => {
  for (const table of ["hotel_rooms", "hotel_guests", "hotel_reservations", "hotel_reservation_payments", "hotel_settings"]) {
    assert.match(hotelRlsSql, new RegExp(`['\"]?${table}['\"]?`, "i"));
  }
  assert.match(hotelRlsSql, /FOR SELECT[\s\S]*FOR INSERT[\s\S]*FOR UPDATE[\s\S]*FOR DELETE/i);
  assert.match(hotelRlsSql, /hotel_permission_for\(tenant_id/i);
  assert.match(hotelRlsSql, /La modification de tenant_id est interdite/);
  assert.match(hotelRlsSql, /hotel\.guests\.identity_view/);
  assert.doesNotMatch(hotelRlsSql, /CREATE POLICY[^;]+FOR ALL/i);
});

test("les routes HOTEL ont un garde RBAC explicite", () => {
  for (const route of ["/hotel", "/hotel/reservations", "/hotel/logements", "/hotel/voyageurs", "/hotel/rapports", "/hotel/parametres"]) {
    assert.match(routePermissionSource, new RegExp(`['\"]${route.replaceAll("/", "\\/")}['\"]`));
  }
});

test("le rôle Réceptionniste exclut les permissions voyageurs sensibles", () => {
  assert.match(hotelSecurityFixSql, /hotel\.guests\.view','hotel\.guests\.create','hotel\.guests\.update/);
  assert.match(hotelSecurityFixSql, /DELETE[\s\S]*hotel\.guests\.identity_view','hotel\.guests\.delete/);
  const initializer = hotelSecurityFixSql.slice(hotelSecurityFixSql.indexOf("CREATE OR REPLACE FUNCTION public.create_hotel_reception_role"));
  assert.doesNotMatch(initializer, /code LIKE 'hotel\.guests\.%'/);
});

test("la référence au type de chambre inclut tenant_id", () => {
  assert.match(hotelSecurityFixSql, /UNIQUE\(id,tenant_id\)/);
  assert.match(hotelSecurityFixSql, /FOREIGN KEY\(room_type_id,tenant_id\)[\s\S]*REFERENCES public\.hotel_room_types\(id,tenant_id\)/);
  assert.match(hotelSecurityFixSql, /ON DELETE SET NULL \(room_type_id\)/);
});

test("l’export Hôtel est autorisé côté PostgreSQL puis généré côté serveur", () => {
  assert.match(hotelExportSql, /hotel_permission_for\([\s\S]*'hotel_reports','hotel\.reports\.export'/);
  assert.match(hotelExportSql, /expense\.tenant_id=target_tenant_id/);
  assert.match(hotelExportSql, /balance\.tenant_id=target_tenant_id/);
  assert.match(hotelReportServer, /requireSupabaseAuth/);
  assert.match(hotelReportServer, /error\.code === "42501"[\s\S]*AuthHttpError\(403/);
});

test("le navigateur ne construit plus le rapport à partir des lignes affichées", () => {
  assert.match(hotelPagesSource, /useActionPermission\("hotel\.reports\.export"\)/);
  assert.match(hotelPagesSource, /exportHotelReportCsv\(\)/);
  assert.doesNotMatch(hotelPagesSource, /Réservation,Arrivée,Départ,Total,Payé,Solde/);
});
