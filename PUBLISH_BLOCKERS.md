# Publish Blockers

This folder is ready as a local resource kit, not as a Freshworks Marketplace submission.

## Must Be Done Before Public Marketplace Claims

- Decide whether the public asset is a resource/template, a partner guide, or a real Freshworks Marketplace app.
- If building a real app, add OAuth or Freshworks app authentication, scopes, callback handling, uninstall handling, support processes, hosted infrastructure, app manifest files, and review metadata.
- Create production screenshots, icon artwork, listing copy, support URL, terms URL, and hosted privacy URL.
- Validate all Freshsales native fields, `custom_field` names, `cf_*` internal names, lead assignment rules, lifecycle stages, workflow assumptions, and account/deal conversion assumptions against a real Freshsales account.
- Add account-specific instructions for replacing `manual_*` placeholder field keys with real Freshsales `cf_*` custom-field internal names.
- Complete security and privacy review for any future credential handling, automatic sync, API write-back, analytics, browser capture, or hosted storage.

## Current Non-Goals

- No Freshsales API client.
- No OAuth flow.
- No Freshworks app manifest.
- No webhook receiver.
- No hosted backend.
- No automatic lead, contact, sales account, or deal writes.
- No analytics or tracking.
