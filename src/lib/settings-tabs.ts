export type SettingsTabId =
  | "general"
  | "legal"
  | "catalog"
  | "users"
  | "billing"
  | "documents"
  | "security";

export const SETTINGS_TAB_ORDER: SettingsTabId[] = [
  "general",
  "legal",
  "catalog",
  "users",
  "billing",
  "documents",
  "security",
];

export type SettingsTabVisibilityContext = {
  /** Whether the tenant's catalog module ("products_services") is active. */
  catalogModuleActive: boolean;
};

/**
 * A tab is never removed from the codebase — it is only hidden from rendering
 * when it does not apply to the current tenant's active modules.
 */
export function isSettingsTabVisible(
  tab: SettingsTabId,
  context: SettingsTabVisibilityContext,
): boolean {
  if (tab === "catalog") return context.catalogModuleActive;
  return true;
}

export function getVisibleSettingsTabs(context: SettingsTabVisibilityContext): SettingsTabId[] {
  return SETTINGS_TAB_ORDER.filter((tab) => isSettingsTabVisible(tab, context));
}
