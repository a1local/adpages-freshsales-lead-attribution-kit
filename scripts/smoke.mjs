import assert from "node:assert/strict";
import { createAttributionPlan, readJsonFile } from "../src/lead-attribution.mjs";

const root = new URL("../", import.meta.url);
const lead = await readJsonFile(new URL("examples/sample-lead.json", root));
const fieldMap = await readJsonFile(new URL("config/field-map.json", root));
const expected = await readJsonFile(new URL("examples/sample-output.json", root));

const generated = createAttributionPlan({ lead, fieldMap });

assert.deepEqual(generated, expected);
assert.equal(generated.platform, "freshsales");
assert.equal(generated.manualUseOnly, true);
assert.equal(generated.leadQuality.rating, "strong");
assert.equal(generated.leadQuality.requiresHumanReview, true);
assert.equal(generated.fieldValues.native_last_name, "Example");
assert.equal(generated.fieldValues.native_mobile_number, "+61 400 000 123");
assert.equal(generated.fieldValues.manual_utm_campaign, "emergency-plumber-perth");
assert.equal(generated.fieldValues.manual_gclid, "test-gclid-123");
assert.equal(generated.fieldValues.manual_msclkid, "test-msclkid-456");
assert.equal(generated.fieldValues.manual_fbclid, "test-fbclid-789");
assert.equal(generated.fieldValues.manual_consent_status, "granted");
assert.equal(generated.fieldValues.manual_service_requested, "Blocked drain");
assert.equal(generated.freshsalesPayloadPreview.leadCreateOrReview.company.name, "Example Household");
assert.equal(generated.freshsalesPayloadPreview.dealCreateOnConversion.amount, "650");
assert.equal(generated.qualityChecklist.length, 10);
assert.equal(generated.missingRequired.length, 0);

console.log("freshsales lead attribution kit smoke ok");
