# Freshsales Setup Checklist

Use this checklist to turn the local field map into a real Freshsales setup. This kit does not create fields or records automatically.

## 1. Confirm CRM Objects

- Confirm whether incoming enquiries should begin as Freshsales Leads only, or also be prepared for Contacts, Sales Accounts, and Deals after qualification.
- Confirm the target owner, lifecycle stage, sales account naming rule, deal pipeline, and first deal stage.
- Confirm who owns first response and who reviews attribution quality before automation.

## 2. Create Fields Manually

- Review every field in `config/field-map.json`.
- Use native fields where possible for first name, last name, company, mobile number, email, contact name, sales account name, deal name, deal amount, and deal stage.
- Create custom fields for service intent, UTM values, landing-page URL, referrer, click IDs, first touch, last touch, consent status, source context, source summary, attribution note, and lead-quality review fields.
- Record the real Freshsales `cf_*` internal names in an account-specific implementation note.

## 3. Wire Source Forms

- Capture UTM source, medium, campaign, term, and content at the form layer.
- Capture landing-page URL and referrer where the site can provide them.
- Capture `gclid`, `msclkid`, and `fbclid` only when present in the landing-page URL or approved tracking context.
- Capture first-touch and last-touch values consistently so sales can understand whether a lead was new, returning, or retargeted.
- Capture consent status and consent source without collecting more data than the CRM owner has approved.

## 4. Test With Real Submissions

- Submit one test lead from a tagged URL.
- Compare the Freshsales record against `examples/sample-output.json`.
- Confirm required fields are not blank.
- Confirm service, location, urgency, owner, lifecycle stage, consent, and attribution fields make sense to the sales user.

## 5. Human Review Before Automation

- Have a human review the lead-quality checklist before enabling assignment rules, workflows, lifecycle automation, Freddy scoring, or reporting.
- Confirm bad-fit or incomplete leads are still visible to the right owner.
- Confirm campaign attribution is reliable before using it in paid reporting.
- Revisit this map any time forms, fields, workflows, ad platforms, consent wording, or service areas change.
