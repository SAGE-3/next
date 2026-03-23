# Request Lifecycle — Full Traces

These traces show the exact call stack for common operations, useful when debugging or adding new features.

---

## SUB — client subscribes to a board's apps

```
Client → WebSocket: { id:'sub-1', route:'/api/apps', method:'SUB', body:{boardId:'board123'} }

homebase main.ts:156
  socket.on('message') → wsAPIRouter()

homebase wsRouter.ts
  route '/apps' → AppsCollection.wsRouter(socket, message, user, cache)

backend SAGEWSRouter.ts (SUB case)
  checkPermissionsWS(user, 'SUB', 'APPS')  ✓
  parse query: boardId = 'board123'
  AppsCollection.subscribeByQuery('boardId', 'board123', callback)

backend SAGECollection.ts
  _collection.subscribeToQuery('boardId', 'board123', callback)

sagebase SBCollection.ts
  redis.duplicate() → new Redis connection
  pSubscribe('SAGE3:DB:APPS:*')
  on each message: filter docs where data.boardId === 'board123'
  return unsubscribeFn

backend SAGEWSRouter.ts
  cache.add('sub-1', [unsubscribeFn])
  immediately sends initial snapshot to client

Future: any UPDATE to an APPS doc
  SBDocumentRef writes to Redis
  SBPubSub publishes to SAGE3:PUBSUB:APPS
  SBCollection subscriber callback fires
  filters for boardId match
  socket.send({ id:'sub-1', event:{ type:'UPDATE', col:'APPS', doc:[...] } })

Client UNSUB:
  cache.delete('sub-1') → unsubscribeFn() → Redis connection closed
```

---

## PUT — client updates an app, all subscribers notified

```
Client → HTTP: PUT /api/apps/app123  body:{ 'state.position': {x:100,y:200} }

homebase httpRouter
  AppsCollection.router() (Express)
  checkPermissionsREST('APPS') middleware ✓

backend SAGECollection.ts
  update('app123', userId, { 'state.position': {x:100,y:200} })

sagebase SBDocumentRef.update()
  1. fetch current doc from Redis (SAGE3:DB:APPS:app123)
  2. merge patch into data field
  3. set _updatedAt, _updatedBy
  4. write SAGE3:DB:APPS:app123 back to Redis
  5. SBPubSub.publish('APPS', { type:'UPDATE', col:'APPS', doc:[updatedDoc] })

Redis PubSub broadcasts to ALL homebase instances
  Each instance's SBCollection subscriber callback fires
  Filters subscriptions matching app123 / boardId
  Pushes to each subscribed WebSocket client

HTTP response: 200 + updated document
```

---

## File upload — end-to-end

```
Client → POST /api/assets/upload (multipart, authenticated)

homebase-files uploadHandler.ts
  multer stores file(s) to local filesystem

  MessageCollection.add('Uploading Assets')
    → writes to shared Redis
    → homebase PubSub fires
    → subscribed clients receive notification

  for each file:
    AssetsCollection.metadataFile() → MetadataProcessor BullMQ job
      exiftool extracts EXIF
    AssetsCollection.processFile() → ImageProcessor or PDFProcessor BullMQ job
      sharp generates thumbnails (images)
      pdfjs converts pages to images (PDFs)

  MessageCollection.add('Assets Ready', close:true)

  AssetsCollection.addBatch([assetSchemas])
    → writes to shared Redis
    → PubSub fires
    → clients subscribed to ASSETS receive new documents

Response: { ids: ['asset-uuid-1', ...] }
```
