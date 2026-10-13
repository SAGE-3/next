# CHANGELOG.md

## Server and Web app

### Unreleased

- Replace the legacy plugin iframe API with manifest-defined browser extensions: commands, toolbar/context-menu entries, shortcuts, panels, overlays, and custom board apps.
- Require room-owner approval per board, bound to the uploaded package bytes; isolate extension execution and validate scoped operations through safe native app adapters.
- Persist shared extension namespaces and custom app content; disabling preserves data and displays unavailable-app placeholders.
- Add selectable PDF text and an uploadable reading extension with quoted native notes, provenance links, bookmarks, and shared source navigation.
- Introduce plugin API 1 with installation-specific view targets, explicit launch commands, modeless app-bound panels, and live viewport/theme context; remove legacy plugin and S3 compatibility paths.
- Let room owners opt into automatic approval of future uploads within the previously approved capabilities, without bypassing sandboxing or inheriting another owner's trust.
- Add atomic JSON field patches, revision checks, and durable app-scoped collaborative Yjs text; reject mutations when native clients move or reassign their targets during authorization.
- Add scoped original/PDF-page asset access, native uploads, host-mediated external links/downloads, and idempotent native link lifecycle operations.
- Migrate the reading and study-notes examples, including portable asset/reference remapping, and provide an independently installable SDK 0.1.0 with reusable build/watch tooling and a standalone starter.
- Extend SDK context with client-local app paint order, add capability-gated live annotation reads, and allow read-only cross-extension plaintext access while preserving owned writes.
- Use the typed `App<T>`/`isApp` API with complete native defaults; fix Chat screenshot history to retain the selected prompt text.

### 1.0.0-alpha.1

Updates - 2021/12/20

- Disable uploads for unsupported file types
- Context-menu in asset manager:
  - download asset
  - delete asset (disabled for Guests)
  - info panel (EXIF metadata)
- Download full resolution JPEG files from imageViewer
- Open PDF files in webview
- Increase JSON body request to 5MB
- Server configuration file cleanup (ssl keys, JWT key)

### 1.0.0-alpha.0

Initial release - 2021/12/13

## Electron app

### 1.0.0-alpha.5

Initial release - 2021/12/13
