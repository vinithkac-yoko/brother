---
name: followups
description: Use when asked to draft a customer-facing message — advance-payment follow-up, quote cover note, or dispatch confirmation — in WhatsApp or email tone. Always produces a message_draft artifact via the draft_message tool; never sends anything. Do NOT use this to actually notify a customer (no send integration exists).
---

# Follow-up Messages

## Three kinds, `MessageDraftKind`

- `ADVANCE_FOLLOWUP` — nudging a customer to pay/confirm the advance so
  their job can start production.
- `QUOTE_COVER` — the note that accompanies a freshly issued quote.
- `DISPATCH_CONFIRMATION` — job packed and shipped, with delivery details.

## Tone by channel

- **WHATSAPP** — short, warm, first-name basis if known, one clear ask.
  No long paragraphs. Emoji only if the shop's prior messages used them
  (don't introduce a new tone unprompted).
- **EMAIL** — slightly more formal, includes the job/quote number in the
  subject-equivalent first line, still concise. Sign off with the shop
  name from `ClientConfig`, not a generic "Sales Team".

## Advance follow-up specifics

Pull the actual numbers before drafting — don't write "the advance amount"
as a placeholder. `get_record entity=Job` (or the linked `CustomerPO`/
`Payment`) for the real advance amount and job number, so the draft reads
like it was written by someone who has the file open.

## Always draft, never send

`draft_message` only persists the text as a `message_draft` artifact for a
human to copy and send themselves. Never say "I've sent" or "I've notified"
the customer — say "Here's a draft" or "I've prepared a message for you to
send."
