const LIGHT_TEXT_COLOR = "#ffffff";
const LIGHT_SECONDARY_TEXT_COLOR = "rgba(255,255,255,0.88)";

type ReadableNoteTextColors = {
  primary: string;
  secondary: string;
  isLight: boolean;
};

export function shouldUseLightNoteText(backgroundColor: string | null | undefined): boolean {
  void backgroundColor;
  return true;
}

export function getReadableNoteTextColors(backgroundColor: string | null | undefined): ReadableNoteTextColors {
  void backgroundColor;
  return {
    primary: LIGHT_TEXT_COLOR,
    secondary: LIGHT_SECONDARY_TEXT_COLOR,
    isLight: true,
  };
}
