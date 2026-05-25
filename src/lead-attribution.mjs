import { readFile } from "node:fs/promises";

const VALID_TARGETS = new Set(["lead", "contact", "sales_account", "deal"]);
const VALID_TYPES = new Set(["identity", "qualification", "attribution", "consent", "review"]);

export async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export function createAttributionPlan({ lead, fieldMap }) {
  assertObject(lead, "lead must be an object");
  const normalized = normalizeFieldMap(fieldMap);
  const derived = createDerivedValues(lead);
  const source = {
    ...lead,
    derived
  };

  const mappedFields = normalized.fields.map((field) => {
    const rawValue = firstPresent([
      getByPath(source, field.sourcePath),
      derived[field.sourceKey],
      field.fallback
    ]);
    const value = clean(rawValue);

    return {
      sourceKey: field.sourceKey,
      targetObject: field.targetObject,
      freshsalesResource: field.freshsalesResource,
      freshsalesFieldLabel: field.freshsalesFieldLabel,
      plannedFreshsalesKey: field.plannedFreshsalesKey,
      type: field.type,
      value,
      required: field.required,
      purpose: field.purpose
    };
  });

  const fieldValues = Object.fromEntries(
    mappedFields.map((field) => [field.plannedFreshsalesKey, field.value])
  );
  const missingRequired = mappedFields
    .filter((field) => field.required && !field.value)
    .map((field) => field.sourceKey);

  return {
    kit: normalized.kit,
    version: normalized.kitVersion,
    platform: normalized.platform,
    manualUseOnly: true,
    disclaimer: "Local preview only. This kit does not call Freshsales, create leads, or write CRM data.",
    client: clean(lead.client?.name),
    formName: clean(lead.form?.name),
    leadTitle: clean(derived.lead_title),
    targetPlan: {
      owner: clean(lead.freshsales?.owner || lead.pipeline?.owner),
      lifecycleStage: clean(lead.freshsales?.lifecycleStage),
      assignmentRule: clean(lead.freshsales?.assignmentRule),
      pipelineName: clean(lead.pipeline?.name),
      dealStage: clean(lead.pipeline?.stage),
      salesAccountName: clean(derived.company_name)
    },
    mappedFields,
    fieldValues,
    freshsalesPayloadPreview: buildFreshsalesPayloadPreview(fieldValues),
    summaryNote: clean(derived.attribution_note),
    leadQuality: {
      score: clean(derived.lead_quality_score),
      rating: rateLead(derived.lead_quality_score),
      notes: clean(derived.lead_quality_notes),
      requiresHumanReview: true
    },
    qualityChecklist: buildQualityChecklist(lead, derived),
    missingRequired,
    reviewSteps: [
      "Create or update Freshsales custom fields manually using docs/setup-checklist.md.",
      "Create a test lead from the source form and compare each mapped value against this preview.",
      "Review lead-quality checklist before enabling assignment rules, workflows, Freddy scoring, or reporting."
    ]
  };
}

export function normalizeFieldMap(fieldMap) {
  assertObject(fieldMap, "fieldMap must be an object");
  assert(fieldMap.kit === "adpages-freshsales-lead-attribution-kit", "fieldMap.kit mismatch");
  assert(fieldMap.platform === "freshsales", "fieldMap.platform must be freshsales");
  assert(fieldMap.manualSetupOnly === true, "fieldMap.manualSetupOnly must be true");
  assert(fieldMap.requiresFreshsalesApi === false, "fieldMap must avoid Freshsales API requirements");
  assert(fieldMap.requiresFreshworksDeveloperAccount === false, "fieldMap must avoid Freshworks developer account requirements");
  assert(fieldMap.requiresOAuth === false, "fieldMap must avoid OAuth requirements");
  assert(fieldMap.requiresSecrets === false, "fieldMap must avoid secret requirements");
  assert(fieldMap.writesDataAutomatically === false, "fieldMap must disclose no automatic writes");
  assert(Array.isArray(fieldMap.fields) && fieldMap.fields.length > 0, "fieldMap.fields must be a non-empty array");

  const seenKeys = new Set();
  const fields = fieldMap.fields.map((field, index) => {
    const sourceKey = clean(field.sourceKey);
    const targetObject = clean(field.targetObject);
    const freshsalesResource = clean(field.freshsalesResource);
    const freshsalesFieldLabel = clean(field.freshsalesFieldLabel);
    const plannedFreshsalesKey = clean(field.plannedFreshsalesKey);
    const type = clean(field.type);
    const sourcePath = clean(field.sourcePath);

    assert(sourceKey, `fields[${index}].sourceKey is required`);
    assert(VALID_TARGETS.has(targetObject), `fields[${index}].targetObject is invalid`);
    assert(freshsalesResource, `fields[${index}].freshsalesResource is required`);
    assert(freshsalesFieldLabel, `fields[${index}].freshsalesFieldLabel is required`);
    assert(/^(native|manual)_[a-z0-9_]+$/.test(plannedFreshsalesKey), `fields[${index}].plannedFreshsalesKey must be a native_* or manual_* key`);
    assert(VALID_TYPES.has(type), `fields[${index}].type is invalid`);
    assert(sourcePath, `fields[${index}].sourcePath is required`);
    assert(!seenKeys.has(plannedFreshsalesKey), `duplicate plannedFreshsalesKey ${plannedFreshsalesKey}`);
    seenKeys.add(plannedFreshsalesKey);

    return {
      sourceKey,
      targetObject,
      freshsalesResource,
      freshsalesFieldLabel,
      plannedFreshsalesKey,
      type,
      sourcePath,
      fallback: field.fallback,
      required: Boolean(field.required),
      purpose: clean(field.purpose)
    };
  });

  return {
    kit: clean(fieldMap.kit),
    kitVersion: clean(fieldMap.kitVersion || "0.1.0"),
    platform: clean(fieldMap.platform),
    fields
  };
}

export function createDerivedValues(input) {
  const pageUrl = firstPresent([
    input.page?.url,
    input.page?.landingPageUrl
  ]);
  const utm = input.utm ?? {};
  const clickIds = input.clickIds ?? {};
  const fullName = clean(input.contact?.name);
  const splitName = splitContactName(fullName);

  const firstName = firstPresent([input.contact?.firstName, splitName.firstName]);
  const lastName = firstPresent([input.contact?.lastName, splitName.lastName, fullName, "Unknown"]);
  const companyName = firstPresent([input.contact?.organization, input.client?.name, "Residential enquiry"]);
  const utmSource = firstPresent([utm.source, queryParam(pageUrl, "utm_source"), "direct"]);
  const utmMedium = firstPresent([utm.medium, queryParam(pageUrl, "utm_medium"), "none"]);
  const utmCampaign = firstPresent([utm.campaign, queryParam(pageUrl, "utm_campaign")]);
  const gclid = firstPresent([clickIds.gclid, queryParam(pageUrl, "gclid")]);
  const msclkid = firstPresent([clickIds.msclkid, queryParam(pageUrl, "msclkid")]);
  const fbclid = firstPresent([clickIds.fbclid, queryParam(pageUrl, "fbclid")]);
  const sourceSummary = buildSourceSummary({ source: utmSource, medium: utmMedium, campaign: utmCampaign });
  const firstTouchSummary = buildTouchSummary(input.attribution?.firstTouch, sourceSummary);
  const lastTouchSummary = buildTouchSummary(input.attribution?.lastTouch, sourceSummary);
  const consentStatus = firstPresent([input.consent?.status, "not_recorded"]);
  const consentSource = firstPresent([input.consent?.source, input.consent?.basis]);
  const score = firstPresent([input.leadQuality?.score, scoreLead(input)]);
  const notes = firstPresent([input.leadQuality?.notes, buildLeadQualityNotes(input)]);

  return {
    lead_title: firstPresent([input.lead?.title, buildLeadTitle(input)]),
    deal_name: firstPresent([input.lead?.title, buildDealName(input)]),
    first_name: firstName,
    last_name: lastName,
    company_name: companyName,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: firstPresent([utm.term, queryParam(pageUrl, "utm_term")]),
    utm_content: firstPresent([utm.content, queryParam(pageUrl, "utm_content")]),
    landing_page_url: clean(pageUrl),
    referrer_url: firstPresent([input.page?.referrer, input.traffic?.referrer]),
    gclid,
    msclkid,
    fbclid,
    first_touch_summary: firstTouchSummary,
    first_touch_url: firstPresent([input.attribution?.firstTouch?.url, clean(pageUrl)]),
    last_touch_summary: lastTouchSummary,
    last_touch_url: firstPresent([input.attribution?.lastTouch?.url, clean(pageUrl)]),
    consent_status: consentStatus,
    consent_source: consentSource,
    source_context: buildSourceContext(input),
    source_summary: sourceSummary,
    attribution_note: buildAttributionNote({
      sourceSummary,
      firstTouchSummary,
      lastTouchSummary,
      consentStatus,
      consentSource
    }),
    lead_quality_score: score,
    lead_quality_notes: notes,
    next_review_action: nextReviewAction(score)
  };
}

export function buildQualityChecklist(input, derived = createDerivedValues(input)) {
  const contact = input.contact ?? {};
  const lead = input.lead ?? {};
  const pageUrl = clean(derived.landing_page_url);
  const hasContactPath = Boolean(clean(contact.phone) || clean(contact.email));
  const hasFreshsalesIdentity = Boolean(clean(derived.last_name) && clean(derived.company_name));
  const hasCampaign = Boolean(clean(derived.utm_source) && clean(derived.utm_medium) && clean(derived.utm_campaign));
  const hasClickId = Boolean(clean(derived.gclid) || clean(derived.msclkid) || clean(derived.fbclid));
  const hasTouches = Boolean(clean(derived.first_touch_summary) && clean(derived.last_touch_summary));
  const hasConsent = clean(derived.consent_status) !== "not_recorded";
  const hasServiceFit = Boolean(clean(lead.service) && clean(lead.location));
  const urgency = clean(lead.urgency).toLowerCase();
  const isUrgent = ["emergency", "urgent", "same_day", "same day", "today", "now"].some((word) => urgency.includes(word));
  const estimatedValue = clean(lead.estimatedValue);

  return [
    {
      check: "Freshsales lead identity",
      status: hasFreshsalesIdentity ? "pass" : "missing",
      note: hasFreshsalesIdentity ? "Last name and company context are present." : "Freshsales lead identity fields need manual cleanup."
    },
    {
      check: "Contact path",
      status: hasContactPath ? "pass" : "missing",
      note: hasContactPath ? "Phone or email supplied." : "Phone or email is required before follow-up."
    },
    {
      check: "Campaign attribution",
      status: hasCampaign ? "pass" : "review",
      note: hasCampaign ? "UTM source, medium, and campaign are present." : "Campaign source is incomplete; review before paid reporting."
    },
    {
      check: "Click identifiers",
      status: hasClickId ? "pass" : "review",
      note: hasClickId ? "At least one click identifier is present." : "No click identifiers supplied; attribution may be channel-level only."
    },
    {
      check: "First and last touch",
      status: hasTouches ? "pass" : "review",
      note: hasTouches ? "First-touch and last-touch context are present." : "Touch history is incomplete; review before automation."
    },
    {
      check: "Consent context",
      status: hasConsent ? "pass" : "missing",
      note: hasConsent ? "Consent status is recorded." : "Consent status must be reviewed before follow-up automation."
    },
    {
      check: "Landing page context",
      status: pageUrl.startsWith("https://") ? "pass" : "review",
      note: pageUrl.startsWith("https://") ? "Landing-page URL is present and uses HTTPS." : "Landing-page URL is missing or not HTTPS."
    },
    {
      check: "Service fit",
      status: hasServiceFit ? "pass" : "review",
      note: hasServiceFit ? "Service and location are present." : "Service or location should be reviewed before assignment."
    },
    {
      check: "Urgency and value",
      status: isUrgent && estimatedValue ? "review" : "missing",
      note: isUrgent && estimatedValue ? "Urgency and estimated value are supplied; confirm before deal reporting." : "Urgency or estimated value needs manual review."
    },
    {
      check: "Human QA",
      status: "review",
      note: "Review mapped fields inside Freshsales before using assignment rules, workflows, Freddy scoring, or reporting."
    }
  ];
}

function buildFreshsalesPayloadPreview(fieldValues) {
  return {
    leadCreateOrReview: {
      first_name: fieldValues.native_first_name,
      last_name: fieldValues.native_last_name,
      mobile_number: fieldValues.native_mobile_number,
      email: fieldValues.native_email,
      company: {
        name: fieldValues.native_company_name
      },
      custom_field: pickManualFields(fieldValues, [
        "manual_lead_title",
        "manual_lead_owner",
        "manual_lifecycle_stage",
        "manual_service_requested",
        "manual_service_area",
        "manual_urgency",
        "manual_form_message",
        "manual_utm_source",
        "manual_utm_medium",
        "manual_utm_campaign",
        "manual_utm_term",
        "manual_utm_content",
        "manual_landing_page_url",
        "manual_referrer_url",
        "manual_gclid",
        "manual_msclkid",
        "manual_fbclid",
        "manual_first_touch_summary",
        "manual_first_touch_url",
        "manual_last_touch_summary",
        "manual_last_touch_url",
        "manual_consent_status",
        "manual_consent_source",
        "manual_source_context"
      ])
    },
    contactReview: {
      display_name: fieldValues.native_contact_name,
      email: fieldValues.native_email,
      mobile_number: fieldValues.native_mobile_number,
      sales_account: {
        name: fieldValues.native_sales_account_name
      },
      custom_field: pickManualFields(fieldValues, [
        "manual_attribution_note"
      ])
    },
    salesAccountReview: {
      name: fieldValues.native_sales_account_name
    },
    dealCreateOnConversion: {
      name: fieldValues.native_deal_name,
      amount: fieldValues.native_deal_amount,
      stage: fieldValues.native_deal_stage,
      sales_account: {
        name: fieldValues.native_sales_account_name
      },
      custom_field: pickManualFields(fieldValues, [
        "manual_source_summary",
        "manual_lead_quality_score",
        "manual_lead_quality_notes",
        "manual_next_review_action"
      ])
    }
  };
}

function pickManualFields(fieldValues, keys) {
  return Object.fromEntries(
    keys
      .filter((key) => clean(fieldValues[key]))
      .map((key) => [key, fieldValues[key]])
  );
}

function buildLeadTitle(input) {
  const service = clean(input.lead?.service) || "Web enquiry";
  const location = clean(input.lead?.location);
  return location ? `${service} - ${location}` : service;
}

function buildDealName(input) {
  const service = clean(input.lead?.service) || "Local service enquiry";
  const contact = clean(input.contact?.name);
  return contact ? `${service} - ${contact}` : service;
}

function buildLeadQualityNotes(input) {
  const notes = [];
  if (clean(input.lead?.urgency)) notes.push(`urgency ${clean(input.lead.urgency)}`);
  if (clean(input.contact?.phone)) notes.push("phone supplied");
  if (clean(input.lead?.service)) notes.push("service supplied");
  if (clean(input.utm?.source) || queryParam(input.page?.url, "utm_source")) notes.push("campaign source present");
  if (clean(input.consent?.status) && clean(input.consent.status) !== "not_recorded") notes.push("consent captured");
  return notes.length ? `Review lead quality: ${notes.join(", ")}.` : "Review lead quality manually.";
}

function scoreLead(input) {
  let score = 20;
  if (clean(input.contact?.phone)) score += 20;
  if (clean(input.contact?.email)) score += 10;
  if (clean(input.lead?.service)) score += 15;
  if (clean(input.lead?.location)) score += 10;
  if (clean(input.utm?.campaign) || queryParam(input.page?.url, "utm_campaign")) score += 10;
  if (clean(input.lead?.estimatedValue)) score += 5;
  if (clean(input.consent?.status) && clean(input.consent.status) !== "not_recorded") score += 5;
  const urgency = clean(input.lead?.urgency).toLowerCase();
  if (["emergency", "urgent", "same_day", "same day", "today", "now"].some((word) => urgency.includes(word))) score += 10;
  return Math.min(score, 100);
}

function rateLead(score) {
  const numericScore = Number(score);
  if (numericScore >= 80) return "strong";
  if (numericScore >= 60) return "qualified";
  if (numericScore >= 40) return "review";
  return "weak";
}

function nextReviewAction(score) {
  const rating = rateLead(score);
  if (rating === "strong") {
    return "Call within 5 minutes, confirm service area, verify consent context, and mark campaign values reviewed.";
  }
  if (rating === "qualified") {
    return "Call same day, verify missing attribution fields, and confirm fit before conversion.";
  }
  return "Review manually before assigning owner, converting the lead, or enabling workflow rules.";
}

function splitContactName(name) {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: "", lastName: parts[0] };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1)
  };
}

function buildSourceSummary({ source, medium, campaign }) {
  const parts = [source, medium, campaign].map(clean).filter(Boolean);
  return parts.length ? parts.join(" / ") : "unknown source";
}

function buildTouchSummary(touch, fallbackSummary) {
  const parts = [touch?.source, touch?.medium, touch?.campaign].map(clean).filter(Boolean);
  const summary = parts.length ? parts.join(" / ") : clean(fallbackSummary) || "unknown source";
  const timestamp = clean(touch?.timestamp);
  return timestamp ? `${summary} at ${timestamp}` : summary;
}

function buildSourceContext(input) {
  const pieces = [
    input.sourceContext?.captureMethod ? `capture ${clean(input.sourceContext.captureMethod)}` : "",
    input.sourceContext?.formProvider ? `form ${clean(input.sourceContext.formProvider)}` : "",
    input.sourceContext?.site ? `site ${clean(input.sourceContext.site)}` : "",
    input.freshsales?.owner || input.pipeline?.owner ? `owner ${clean(input.freshsales?.owner || input.pipeline?.owner)}` : ""
  ].filter(Boolean);
  return pieces.length ? pieces.join("; ") : "source context not supplied";
}

function buildAttributionNote({ sourceSummary, firstTouchSummary, lastTouchSummary, consentStatus, consentSource }) {
  return [
    `Freshsales attribution preview: ${clean(sourceSummary) || "unknown source"}.`,
    `First touch: ${clean(firstTouchSummary) || "unknown source"}.`,
    `Last touch: ${clean(lastTouchSummary) || "unknown source"}.`,
    `Consent: ${clean(consentStatus) || "not_recorded"}${clean(consentSource) ? ` via ${clean(consentSource)}` : ""}.`
  ].join(" ");
}

function queryParam(url, key) {
  const text = clean(url);
  if (!text) return "";
  try {
    return new URL(text).searchParams.get(key) ?? "";
  } catch {
    return "";
  }
}

function getByPath(source, path) {
  const parts = clean(path).split(".").filter(Boolean);
  let value = source;
  for (const part of parts) {
    if (!value || typeof value !== "object" || !(part in value)) {
      return undefined;
    }
    value = value[part];
  }
  return value;
}

function firstPresent(values) {
  return values.find((value) => clean(value) !== "") ?? "";
}

function clean(value) {
  return String(value ?? "").trim();
}

function assertObject(value, message) {
  assert(value && typeof value === "object" && !Array.isArray(value), message);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
