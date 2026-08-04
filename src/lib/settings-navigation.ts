export type PlatformType = "ERP" | "HOTEL";

export const ERP_SETTINGS_PATH = "/parametres";
export const HOTEL_SETTINGS_PATH = "/hotel/parametres";
export const ERP_SETTINGS_MODULE = "settings";
export const HOTEL_SETTINGS_MODULE = "hotel_settings";

export function getSettingsPath(platformType: PlatformType | undefined): string {
  return platformType === "HOTEL" ? HOTEL_SETTINGS_PATH : ERP_SETTINGS_PATH;
}

export function getSettingsModule(platformType: PlatformType | undefined): string {
  return platformType === "HOTEL" ? HOTEL_SETTINGS_MODULE : ERP_SETTINGS_MODULE;
}
