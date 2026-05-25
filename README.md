# AdPages Lead Attribution Kit for Freshsales

Local-only planning kit for agencies that need to map campaign, consent, and landing-page context into Freshsales Leads, Contacts, Sales Accounts, and Deals before building any paid integration.

## What It Does

- Defines a reviewable Freshsales field map for contact details, service intent, UTM values, landing-page context, click IDs, first/last touch attribution, consent context, and lead-quality notes.
- Generates a deterministic local attribution preview from a sample lead object.
- Produces Freshsales-style payload previews for Leads, Contacts, Sales Accounts, and Deals without sending anything to Freshsales.
- Documents a manual setup checklist for creating matching Freshsales fields and testing a real form submission.

It does not call the Freshsales API, use OAuth, request API tokens, create leads, update contacts, write deals, run analytics, submit forms, host a backend, or claim to be a Freshworks Marketplace app. The generated output is a local planning artifact only.

## Folder

```text
integrations/freshsales/adpages-lead-attribution-kit/
  config/field-map.json
  docs/setup-checklist.md
  examples/sample-lead.json
  examples/sample-output.json
  scripts/check.mjs
  scripts/smoke.mjs
  src/lead-attribution.mjs
  package.json
  PRIVACY.md
  PUBLISH_BLOCKERS.md
  README.md
```

## Local Checks

From the repository root:

```sh
npm --prefix integrations/freshsales/adpages-lead-attribution-kit run check
npm --prefix integrations/freshsales/adpages-lead-attribution-kit run smoke
```

## Manual Setup Flow

1. Review `config/field-map.json` with the CRM owner and confirm which fields belong on Freshsales Leads, Contacts, Sales Accounts, and Deals.
2. Create custom fields manually in Freshsales and replace the `manual_*` placeholder keys with real `cf_*` internal names in account-specific implementation notes.
3. Wire the source form to capture UTM source, medium, campaign, term, content, landing-page URL, referrer, click IDs, first/last touch context, and consent source.
4. Compare a real test submission against `examples/sample-output.json`.
5. Use the quality checklist as a required human review before lead assignment, workflow rules, Freddy scoring, lifecycle automation, or campaign reporting.

## Input Files

`config/field-map.json` is the field mapping blueprint. It intentionally uses review-friendly labels and placeholder field keys because Freshsales custom fields are account-specific and normally appear under `custom_field` with `cf_*` internal names.

`examples/sample-lead.json` is a fictional local-service lead used to prove the mapper and checklist behavior.

## Generated Output Shape

The runtime returns:

- `mappedFields`: ordered lead, contact, sales-account, and deal field previews.
- `fieldValues`: key/value preview for implementation QA.
- `freshsalesPayloadPreview`: local-only Freshsales-style Lead, Contact, Sales Account, and Deal payload shapes.
- `summaryNote`: a human-readable attribution note for sales review.
- `leadQuality`: score, rating, notes, and human-review flag.
- `qualityChecklist`: review checklist with pass, review, or missing states.
- `missingRequired`: required source fields that were blank.

## Publishing Position

This is a credible Freshsales-facing resource kit for agencies and local-service marketers that need campaign attribution discipline before CRM automation. Later monetizable paths could include a hosted checker, account-specific field export, form-specific setup guides, screenshot QA, or a real Freshworks Marketplace app. Those are outside this scaffold.

## Publish Blockers

- This is not a Freshworks Marketplace app and does not include OAuth, API scopes, app manifest files, app review metadata, webhook handling, or hosted infrastructure.
- Public listing copy, screenshots, icon, support URL, terms URL, marketplace category choices, and hosted privacy URL are not included.
- Real Freshsales custom-field `cf_*` internal names must be created and verified inside the target account.
- Any future automatic sync, API submission, analytics lookup, browser capture, or credential handling needs a separate privacy and security review.

## Publisher

Built by [AdPages from A1 Local](https://a1local.com.au/extensions/) as a free, dependency-light resource for local-service marketers, web designers, and small business site owners.

