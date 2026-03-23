# Known Limitations & Tech Debt

Documented intentionally — knowing rough edges is as important as knowing the happy path.

---

1. **Message overhead**: Pub/Sub broadcasts to all subscribers on every write. With many users on a busy board this creates noticeable overhead. Not suitable for large concurrent user counts without architectural changes.

2. **No WS auto-reconnect**: `api-socket.ts` has no reconnect logic. Dropped connection = page reload required.

3. **Yjs single instance**: homebase-yjs stores documents in-memory. Adding `y-redis` or similar would be needed to scale.

4. **Auth fragility**: Role is derived from auth provider name (hardcoded map), not a role field in the database. Mixing session + JWT can cause conflicts. The WebRTC endpoint has no authentication at all.

5. **NX coupling**: Build pipeline deeply depends on NX 14. The team wants to remove it but it's embedded throughout.

6. **Dead app code**: `libs/applications` contains apps beyond the 21 supported. Do not assume unlisted apps are functional.

7. **AI services ownership gap**: Python services (`seer/`, `foresight/`, `sage_seer/`) were written by a different team member. `seer/` vs `sage_seer/` relationship is undocumented.

8. **Redis as sole data store**: No backup DB. Redis restart loses all session data.

9. **Local file storage**: homebase-files stores uploads on local disk. Horizontal scaling requires a shared filesystem.

10. **Presence throttling**: Cursor/presence has no transport-level throttle — only application-level gating.
