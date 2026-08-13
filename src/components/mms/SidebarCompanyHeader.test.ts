import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PLATFORM_BRANDING } from "../../config/branding.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(__dirname, "SidebarCompanyHeader.tsx");
const source = readFileSync(sourcePath, "utf8");

test("affiche un cadre logo premium avec une taille visuelle renforcée", () => {
  assert.match(source, /size-\[74px\]/);
  assert.match(source, /size-12/);
  assert.match(source, /rounded-\[22px\]/);
  assert.match(source, /border-white\/75/);
  assert.match(source, /shadow-\[0_10px_28px_rgba\(15,23,42,0\.18\)\]/);
  assert.match(source, /imageClassName="size-\[88%\]"/);
});

test("conserve le fallback de logo existant sans inventer un comportement nouveau", () => {
  assert.match(source, /src={logoUrl}/);
  assert.match(source, /alt=\{companyName \? `Logo \$\{companyName\}` : "Logo de l’entreprise"\}/);
  assert.equal(PLATFORM_BRANDING.assets.logo, "/branding/saovia-logo-full.png");
});

test("met en avant le branding du tenant et le sous-titre métier", () => {
  assert.match(source, /font-extrabold/);
  assert.match(source, /line-clamp-2/);
  assert.match(source, /text-\[#A8B3CF\]/);
  assert.match(source, /title=\{businessActivity\}/);
});

test("gère la structure expanded et compact sans casser le contenu", () => {
  assert.match(source, /compact \? "h-\[72px\] gap-3 px-4" : "h-\[104px\] gap-4 px-4"/);
  assert.match(source, /if \(collapsed\)/);
  assert.match(source, /TooltipProvider delayDuration=\{200\}/);
  assert.match(source, /TooltipContent side="right"/);
});

test("reste accessible lorsque des données optionnelles sont absentes", () => {
  assert.match(source, /shortBusinessActivity\(settings\?\.business_sector\) \|\| "Secteur non renseign/);
  assert.match(source, /companyName \? `Logo \$\{companyName\}` : "Logo de l’entreprise"/);
  assert.doesNotMatch(source, /primary-glow|A8CFC4/);
});
