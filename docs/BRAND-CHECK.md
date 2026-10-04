# Brand check authoring contract

The runtime brand checker preserves the game card and platform branding.
A pending brand pass uses /workspace/.grok/og-pending and expires after 10 minutes.

## Brand-asset pass:
A brand pass must never wait_tasks or get_task_output on itself.
It checks its finished assets with `node scripts/brand-check.mjs --game`.

6. **Brand-asset pass**
Never wait_tasks or get_task_output on the brand task. Read its completion event.
7. Verify the finished card with the CLI before publishing.

## Atomic asset hand-over
`node scripts/write-atomic.mjs /workspace/.grok/og.jpg.tmp /workspace/public/og.jpg`
`node scripts/write-atomic.mjs /workspace/.grok/x-banner.jpg.tmp /workspace/public/x-banner.jpg`
`node scripts/write-atomic.mjs /workspace/.grok/site.json.tmp /workspace/src/lib/og/site.json`
