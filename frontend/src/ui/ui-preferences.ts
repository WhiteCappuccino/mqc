export interface UiPreferences {
  colorMode: "light" | "dark";
  language: "en" | "ru";
  showGrid: boolean;
  softBorders: boolean;
  hideDashboardHero: boolean;
}

export const UI_PREFERENCES_STORAGE_KEY = "mq-ui-preferences";

export const defaultUiPreferences: UiPreferences = {
  colorMode: "light",
  language: "en",
  showGrid: true,
  softBorders: true,
  hideDashboardHero: false,
};

export function loadUiPreferences(): UiPreferences {
  try {
    const rawValue = localStorage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (!rawValue) {
      return defaultUiPreferences;
    }

    const parsed = JSON.parse(rawValue) as Partial<UiPreferences>;
    return {
      colorMode: parsed.colorMode === "dark" ? "dark" : defaultUiPreferences.colorMode,
      language: parsed.language === "ru" ? "ru" : defaultUiPreferences.language,
      showGrid: parsed.showGrid ?? defaultUiPreferences.showGrid,
      softBorders: parsed.softBorders ?? defaultUiPreferences.softBorders,
      hideDashboardHero: parsed.hideDashboardHero ?? defaultUiPreferences.hideDashboardHero,
    };
  } catch {
    return defaultUiPreferences;
  }
}
