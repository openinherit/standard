import { addKeyword } from "@hyperjump/json-schema/experimental";
import { defineVocabulary } from "@hyperjump/json-schema/experimental";

const VOCAB_BASE = "https://openinherit.org/v3/vocab/estate";

const keywords = [
  "jurisdiction",
  "successionRegime",
  "maturity",
  "extensionType",
  "applicableJurisdictions",
  "inheritVersion",
  "legalSystems",
  "dataProvenance",
  "maintainers",
  "compatibleWith"
];

// All INHERIT vocabulary keywords are annotation-only.
// They describe the schema, not the instance.
for (const keyword of keywords) {
  addKeyword({
    id: `${VOCAB_BASE}/${keyword}`,
    compile: (schema, _ast, _parentSchema) => schema.value,
    interpret: (_implies, _instance, _ast, _dynamicAnchors, _quiet) => true,
    annotation: (value) => value
  });
}

const vocabularyEntries = Object.fromEntries(
  keywords.map((k) => [k, `${VOCAB_BASE}/${k}`])
);

defineVocabulary(VOCAB_BASE, vocabularyEntries);

export { keywords, VOCAB_BASE };
