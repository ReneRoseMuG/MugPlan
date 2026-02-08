export type SaunaModelRow = {
  modelId: string;
  saunaModelName: string;
  saunaArtNr: string;
  saunaGtin: string;
  saunaCategory: string;
  saunaShape: string;
  saunaHasVorraum: string;
  saunaLCm: string;
  saunaWCm: string;
  saunaHCm: string;
  saunaWallThicknessMm: string;
  saunaOuterWood: string;
  saunaInteriorWood: string;
  saunaRoofVariants: string;
  saunaRoofColors: string;
  saunaWindowsDoors: string;
  saunaDimensionsNote: string;
  saunaProductPageUrl: string;
};

export type OvenRow = {
  ovenId: string;
  ovenName: string;
  ovenType: string;
  ovenPowerKw: string;
  ovenBrand: string;
  ovenPriceEur: string;
};

export type ModelOvenMappingRow = {
  modelId: string;
  ovenId: string;
};
