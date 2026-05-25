# Privacy

AdPages Lead Attribution Kit for Freshsales is a local-only planning kit.

## Data Processed

The sample mapper reads local JSON files that you provide:

- Field mapping configuration.
- Sample form, campaign, contact, consent, and page context.
- Sample first-touch and last-touch attribution context.
- Sample lead-quality context.

The included examples use fictional data.

## Network Behavior

This kit does not make network calls. It does not call Freshsales, send lead, contact, account, or deal records, fetch landing pages, load remote scripts, run analytics, or contact any AdPages service.

## Credentials

This kit does not require Freshsales API keys, Freshworks OAuth credentials, client secrets, refresh tokens, browser cookies, webhook secrets, or CRM user credentials.

## Storage

The kit returns local JavaScript objects and reads only local example/config files during checks. It does not create a database, background process, hosted backend, cloud storage bucket, or external log.

## Manual Freshsales Use

Any Freshsales fields, custom-field internal names, lead assignment rules, lifecycle stages, workflows, leads, contacts, sales accounts, or deals must be created manually by the user in Freshsales. This kit only generates planning and QA reference data.

## Future Changes

If future versions add hosted services, Freshsales API calls, automatic lead creation, browser capture, analytics lookups, or credential handling, those features need a separate privacy review and updated documentation before release.
