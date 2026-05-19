# Brand Compass — Brief Tracker

Auto-synced from Supabase. Each folder is one client session.

## Status legend

| Emoji | Status | Meaning |
|-------|--------|---------|
| 🟡 | `in_progress` | Session active, interview ongoing |
| ✅ | `completed` | Client wrote «готово», brief generated |
| ⚠️ | `interrupted` | Session started but never finished |

## Folder structure

```
briefs/
  YYYY-MM-DD-client-slug/
    state.md       ← status, scores, timestamps
    transcript.md  ← full interview messages
    brief.md       ← generated brief (if completed)
```

---

*Synced automatically via GitHub Actions (`sync-briefs` workflow).*
