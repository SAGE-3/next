# Key Files Reference

Quick-reference map of the most important source files. When touching any of these areas, read the file before making changes.

| File | Purpose |
|------|---------|
| `webstack/apps/homebase/src/main.ts` | Main server entry — startup sequence, WS auth |
| `webstack/apps/homebase/src/api/collections/` | All 13 collection definitions |
| `webstack/apps/homebase/src/api/routers/custom/` | kernels proxy, agents proxy, NLP |
| `webstack/apps/homebase-files/src/main.ts` | File server entry |
| `webstack/apps/homebase-files/src/api/uploadHandler.ts` | Upload + BullMQ pipeline |
| `webstack/apps/homebase-yjs/src/main.ts` | Yjs + WebRTC server |
| `webstack/libs/sagebase/src/lib/core/SAGEBase.ts` | SAGEBase singleton |
| `webstack/libs/sagebase/src/lib/modules/database/SBCollection.ts` | Redis doc store |
| `webstack/libs/sagebase/src/lib/modules/auth/SBAuth.ts` | Auth + session setup |
| `webstack/libs/sagebase/src/lib/modules/auth/adapters/` | Per-strategy adapters |
| `webstack/libs/backend/src/lib/generics/SAGECollection.ts` | Collection base class |
| `webstack/libs/backend/src/lib/generics/SAGEWSRouter.ts` | WS dispatcher |
| `webstack/libs/backend/src/lib/generics/permissions.ts` | RBAC rules |
| `webstack/libs/backend/src/lib/utils/presence.ts` | Online/offline tracking |
| `webstack/libs/backend/src/lib/utils/subscription-cache.ts` | Per-socket sub tracking |
| `webstack/libs/shared/src/lib/types/` | All shared TypeScript types |
| `webstack/libs/shared/src/lib/types/server/serverconfig.ts` | ServerConfiguration type |
| `webstack/apps/webapp/src/app/pages/board/` | Board page (canvas, layers, lifecycle) |
| `webstack/libs/applications/src/lib/components/AppWindow/AppWindow.tsx` | App drag/resize wrapper |
| `webstack/libs/applications/src/lib/apps/` | Individual app implementations |
| `webstack/libs/frontend/src/lib/stores/` | Zustand stores (one per collection) |
| `webstack/libs/frontend/src/lib/stores/ui.ts` | Local UI state (canvas, selection) |
| `webstack/libs/frontend/src/lib/api/ws/api-socket.ts` | WebSocket client singleton |
| `webstack/libs/frontend/src/lib/providers/useCursorBoardPosition.tsx` | Cursor coords |
| `webstack/libs/frontend/src/lib/providers/useUserSettings.tsx` | User preferences |
| `webstack/libs/sageplugin/src/lib/sageplugin.ts` | Plugin iframe lib |
| `webstack/sage3-dev.hjson` | Dev configuration |
| `seer/main.py` | AI service entry point |
