const DARK_TEXT_COLOR = "#0f172a";
const DARK_SECONDARY_TEXT_COLOR = "#334155";
const LIGHT_TEXT_COLOR = "#ffffff";
const LIGHT_SECONDARY_TEXT_COLOR = "rgba(255,255,255,0.88)";

type ReadableNoteTextColors = {
  primary: string;
  secondary: string;
  isLight: boolean;
};

function normalizeHexColor(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const shortMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (shortMatch) {
    return `#${shortMatch[1]!.split("").map((char) => `${char}${char}`).join("")}`;
  }

  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : null;
}

function parseHexColor(value: string | null | undefined): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function toLinearSrgb(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: { r: number; g: number; b: number }): number {
  return 0.2126 * toLinearSrgb(color.r)
    + 0.7152 * toLinearSrgb(color.g)
    + 0.0722 * toLinearSrgb(color.b);
}

function getContrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function shouldUseLightNoteText(backgroundColor: string | null | undefined): boolean {
  const color = parseHexColor(backgroundColor);
  if (!color) return false;

  const backgroundLuminance = getRelativeLuminance(color);
  const darkTextColor = parseHexColor(DARK_TEXT_COLOR);
  const darkTextLuminance = darkTextColor ? getRelativeLuminance(darkTextColor) : 0;
  const whiteTextLuminance = 1;

  return getContrastRatio(backgroundLuminance, whiteTextLuminance)
    > getContrastRatio(backgroundLuminance, darkTextLuminance);
}

export function getReadableNoteTextColors(backgroundColor: string | null | undefined): ReadableNoteTextColors {
  const isLight = shouldUseLightNoteText(backgroundColor);
  return isLight
    ? {
        primary: LIGHT_TEXT_COLOR,
        secondary: LIGHT_SECONDARY_TEXT_COLOR,
        isLight: true,
      }
    : {
        primary: DARK_TEXT_COLOR,
        secondary: DARK_SECONDARY_TEXT_COLOR,
        isLight: false,
      };
}
