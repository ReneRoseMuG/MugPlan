import assert from "node:assert/strict";
import { renderTemplate } from "../server/lib/templateRender";

const allowedKeys = new Set([
  "sauna_model_name",
  "sauna_art_nr",
  "oven_name",
]);

function run() {
  const replaced = renderTemplate(
    "Montage: {sauna_model_name} ({sauna_art_nr})",
    {
      sauna_model_name: "Fasssauna Classic",
      sauna_art_nr: "FS-100",
    },
    { allowedKeys },
  );
  assert.equal(replaced, "Montage: Fasssauna Classic (FS-100)");

  const cleaned = renderTemplate(
    `- Modell: {sauna_model_name}
- Ofen: {oven_name}
- Art.-Nr.: {sauna_art_nr}`,
    {
      sauna_model_name: "Fasssauna Classic",
      sauna_art_nr: "FS-100",
      oven_name: undefined,
    },
    { allowedKeys },
  );
  assert.equal(cleaned, "- Modell: Fasssauna Classic\n- Art.-Nr.: FS-100");

  const unknownStable = renderTemplate(
    "Titel {unknown_key} / {sauna_model_name}",
    {
      sauna_model_name: "Fasssauna Classic",
    },
    { allowedKeys },
  );
  assert.equal(unknownStable, "Titel {unknown_key} / Fasssauna Classic");

  console.log("[test-template-render] all assertions passed");
}

run();

