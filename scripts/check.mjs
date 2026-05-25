import { readFile } from "node:fs/promises";
import { createAttributionPlan, normalizeFieldMap, readJsonFile } from "../src/lead-attribution.mjs";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  "README.md",
  "PRIVACY.md",
  "PUBLISH_BLOCKERS.md",
  "package.json",
  "scripts/check.mjs",
  "scripts/smoke.mjs",
  "src/lead-attribution.mjs",
  "config/field-map.json",
  "examples/sample-lead.json",
  "examples/sample-output.json",
  "docs/setup-checklist.md"
];
const localSourceFiles = [
  "scripts/check.mjs",
  "scripts/smoke.mjs",
  "src/lead-attribution.mjs"
];
const networkPattern = new RegExp([
  "f" + "etch\\s*\\(",
  "XML" + "HttpRequest",
  "send" + "Beacon",
  "Web" + "Socket",
  "Event" + "Source",
  "node:" + "https",
  "node:" + "http",
  "developer\\." + "freshsales\\.io",
  "freshsales\\.io/" + "api",
  "freshworks\\.com/" + "apps"
].join("|"), "i");
const secretPattern = new RegExp([
  "FRESHSALES_" + "API_" + "KEY",
  "FRESHWORKS_" + "CLIENT_" + "SECRET",
  "FRESHWORKS_" + "REFRESH_" + "TOKEN",
  "access_" + "tok" + "en",
  "refresh_" + "tok" + "en"
].join("|"), "i");

async function main() {
  const contents = new Map();
  for (const file of requiredFiles) {
    const content = await readText(file);
    contents.set(file, content);
    assert(content.trim().length > 0, `${file} must not be empty`);
  }

  const packageJson = JSON.parse(contents.get("package.json"));
  assert(packageJson.private === true, "package.json must remain private");
  assert(packageJson.type === "module", "package.json must use type=module");
  assert(packageJson.scripts?.check, "package.json must define check script");
  assert(packageJson.scripts?.smoke, "package.json must define smoke script");
  assert(!packageJson.dependencies, "kit must not add runtime dependencies");
  assert(!packageJson.devDependencies, "kit must not add dev dependencies");

  const fieldMap = JSON.parse(contents.get("config/field-map.json"));
  const normalized = normalizeFieldMap(fieldMap);
  assert(normalized.fields.length >= 30, "field map should cover identity, attribution, consent, qualification, and review fields");
  assert(fieldMap.manualSetupOnly === true, "field map must be manual setup only");
  assert(fieldMap.requiresFreshsalesApi === false, "field map must avoid Freshsales API requirements");
  assert(fieldMap.requiresFreshworksDeveloperAccount === false, "field map must avoid Freshworks developer account requirements");
  assert(fieldMap.requiresOAuth === false, "field map must avoid OAuth requirements");
  assert(fieldMap.requiresSecrets === false, "field map must avoid secret requirements");
  assert(fieldMap.writesDataAutomatically === false, "field map must disclose no automatic writes");

  const targets = new Set(normalized.fields.map((field) => field.targetObject));
  for (const target of ["lead", "contact", "sales_account", "deal"]) {
    assert(targets.has(target), `field map must include ${target} fields`);
  }

  const resources = new Set(normalized.fields.map((field) => field.freshsalesResource));
  for (const resource of ["Leads", "Contacts", "Sales Accounts", "Deals"]) {
    assert(resources.has(resource), `field map must include ${resource} resource fields`);
  }

  const types = new Set(normalized.fields.map((field) => field.type));
  for (const type of ["identity", "qualification", "attribution", "consent", "review"]) {
    assert(types.has(type), `field map must include ${type} fields`);
  }

  const sampleLead = await readJsonFile(new URL("examples/sample-lead.json", root));
  const sampleOutput = await readJsonFile(new URL("examples/sample-output.json", root));
  const generated = createAttributionPlan({ lead: sampleLead, fieldMap });
  assert(JSON.stringify(generated) === JSON.stringify(sampleOutput), "sample output must match generated attribution plan");
  assert(generated.missingRequired.length === 0, "sample lead should not miss required fields");
  assert(generated.qualityChecklist.some((item) => item.check === "Human QA" && item.status === "review"), "checklist must force human QA review");
  assert(generated.leadQuality.requiresHumanReview === true, "lead quality must require human review");
  assert(generated.fieldValues.manual_utm_source === "google", "sample must map UTM source");
  assert(generated.fieldValues.manual_gclid === "test-gclid-123", "sample must map gclid");
  assert(generated.fieldValues.manual_msclkid === "test-msclkid-456", "sample must map msclkid");
  assert(generated.fieldValues.manual_fbclid === "test-fbclid-789", "sample must map fbclid");
  assert(generated.fieldValues.manual_first_touch_summary.includes("google / cpc"), "sample must map first touch");
  assert(generated.fieldValues.manual_last_touch_summary.includes("google / cpc"), "sample must map last touch");
  assert(generated.fieldValues.manual_consent_status === "granted", "sample must map consent status");
  assert(generated.fieldValues.manual_landing_page_url.startsWith("https://"), "sample must map HTTPS landing page");
  assert(generated.freshsalesPayloadPreview.leadCreateOrReview.custom_field.manual_gclid === "test-gclid-123", "payload preview must include Freshsales lead custom fields");

  for (const file of localSourceFiles) {
    const content = contents.get(file);
    assert(!networkPattern.test(content), `${file} must not make network calls`);
    assert(!secretPattern.test(content), `${file} must not contain credential handling`);
  }

  const readme = contents.get("README.md");
  assert(readme.includes("does not call the Freshsales API"), "README must disclose no Freshsales API calls");
  assert(readme.includes("does not include OAuth"), "README must disclose no OAuth integration");
  assert(readme.includes("Freshworks Marketplace app"), "README must avoid marketplace app ambiguity");
  assert(readme.includes("cf_*"), "README must mention Freshsales custom-field internal names");

  const privacy = contents.get("PRIVACY.md");
  assert(privacy.includes("does not make network calls"), "PRIVACY must disclose network behavior");
  assert(privacy.includes("does not require Freshsales API keys"), "PRIVACY must disclose credential behavior");

  const blockers = contents.get("PUBLISH_BLOCKERS.md");
  assert(blockers.includes("not as a Freshworks Marketplace submission"), "publish blockers must identify current status");
  assert(blockers.includes("No automatic lead, contact, sales account, or deal writes"), "publish blockers must block automatic CRM writes");

  console.log(`freshsales lead attribution kit check ok (${requiredFiles.length} files)`);
}

async function readText(file) {
  return readFile(new URL(file, root), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
