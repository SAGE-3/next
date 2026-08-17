# JSON Session Format

## Schemas

Here is defined the file format to store the content of a board, including asset definitions and application states. 

The base of the schema for the collection (`zod` definition):
```ts
export const SBSchema = z.object({
  _id: z.string(),
  _createdAt: z.number(),
  _updatedAt: z.number(),
  _updatedBy: z.string(),
  _createdBy: z.string(),
});
```

The application instance schema is:
```ts
export type AppSchema = {
  title: string;
  roomId: string;
  boardId: string;
  position: Position;    // { x: z.number(), y: z.number(), z: z.number() }
  rotation: Rotation;    // { x: z.number(), y: z.number(), z: z.number() }
  size: Size;            // { width: z.number(), height: z.number(), depth: z.number() }
  type: AppName;         // string, set of all the application names
  state: AppState;       // Application specific schema
  raised: boolean;
  dragging: boolean;
  pinned: boolean;
};
```

The application collection stores a union of `SBSchema` and `AppSchema`:
```ts
export type App = SBDoc & { data: AppSchema };
```

Each application defines its own `AppState`. For instance, the `Stickie` application schema is:
```ts
export const schema = z.object({
  text: z.string(),
  fontSize: z.number(),
  color: z.string(),
  lock: z.boolean(),
});
```

So the `s3json` file format for now is defined as an array of assets and an array of apps:
```json
{
  "assets": [],
  "apps": []
}
```
## Assets

Assets are pre-defined because they are loaded by some applications. An asset is:
```ts
{
   "id": "3ab878bf-e001-4cfa-b845-39fe31627df8",  // UUID
   "url": "http://example.com/file.jpg",          // a public URL where it can be downloaded
   "filename": "2017-05-23 16.59.17.jpg"          // a filename
}
```

## Applications

Applications are dumped from the data collection:
```json
    {
      "_id": "cdd91b9e-5baa-410d-9b99-07c41c6c2af5",
      "_createdAt": 1709585019165,
      "_createdBy": "0fefb25a-1431-4258-8eb8-71c240abf0b1",
      "_updatedAt": 1709585034551,
      "_updatedBy": "0fefb25a-1431-4258-8eb8-71c240abf0b1",
      "data": {
        "title": "Luc",
        "roomId": "521f75cc-0a02-4ae2-8f3f-0b190bc2b1a0",
        "boardId": "93590012-544d-4691-8df8-ef5e92713ae3",
        "position": {
          "x": 1494351,
          "y": 1499951,
          "z": 0
        },
        "size": {
          "width": 728,
          "height": 121,
          "depth": 0
        },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "type": "Stickie",
        "state": {
          "text": "Todos for next week",
          "fontSize": 48,
          "color": "pink",
          "lock": false,
        },
        "raised": false,
        "dragging": false,
        "pinned": false
      }
    },
```

## Example

Hence a full example of a `.s3json` file is:
```json
{
  "assets": [
    {
      "id": "96999240-2b64-4f45-b31f-91040e15bf4a",
      "url": "http://localhost:4200/api/files/96999240-2b64-4f45-b31f-91040e15bf4a/3b3155b4-0aaa-5b19-898b-c912256f8463",
      "filename": "Community Presentation 2021.pdf"
    },
    {
      "id": "3ab878bf-e001-4cfa-b845-39fe31627df8",
      "url": "http://localhost:4200/api/files/3ab878bf-e001-4cfa-b845-39fe31627df8/5cd70f15-9f71-5cc3-9806-93e77456701c",
      "filename": "2017-05-23 16.59.17.jpg"
    }
  ],
  "apps": [
    {
      "_id": "eb318e96-7425-4f4c-b5ff-38e1c3306112",
      "_createdAt": 1699398754569,
      "_createdBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "_updatedAt": 1699398775242,
      "_updatedBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "data": {
        "title": "Community Presentation 2021.pdf - 1 of 10",
        "roomId": "1276086a-b8d9-4a74-83e0-45dfca4c0a9c",
        "boardId": "07cc3d9e-e766-4eb2-9961-6a82b0d31a7e",
        "position": {
          "x": 1504176,
          "y": 1501889,
          "z": 0
        },
        "size": {
          "width": 400,
          "height": 224.96,
          "depth": 0
        },
        "rotation": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "type": "PDFViewer",
        "state": {
          "assetid": "96999240-2b64-4f45-b31f-91040e15bf4a",
          "currentPage": 0,
          "numPages": 10,
          "displayPages": 1,
          "executeInfo": {
            "executeFunc": "",
            "params": {}
          },
          "analyzed": "",
          "client": ""
        },
        "raised": false,
        "dragging": false,
        "pinned": false
      }
    },
    {
      "_id": "2464611c-51d3-42a8-90cd-52806adb1c74",
      "_createdAt": 1699398774369,
      "_createdBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "_updatedAt": 1699405663473,
      "_updatedBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "data": {
        "title": "Luc Renambot",
        "roomId": "1276086a-b8d9-4a74-83e0-45dfca4c0a9c",
        "boardId": "07cc3d9e-e766-4eb2-9961-6a82b0d31a7e",
        "position": {
          "x": 1504530,
          "y": 1501485,
          "z": 0
        },
        "size": {
          "width": 400,
          "height": 216,
          "depth": 0
        },
        "rotation": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "type": "Stickie",
        "state": {
          "text": "Note 1",
          "fontSize": 36,
          "color": "yellow",
          "lock": false,
          "executeInfo": {
            "executeFunc": "",
            "params": {}
          }
        },
        "raised": false,
        "dragging": false,
        "pinned": false
      }
    },
    {
      "_id": "04365291-9664-4b46-affc-5fc7a4c51690",
      "_createdAt": 1699398754569,
      "_createdBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "_updatedAt": 1699407884319,
      "_updatedBy": "733cef8b-b464-4de1-a160-dd1bf89620b8",
      "data": {
        "title": "2017-05-23 16.59.17.jpg",
        "roomId": "1276086a-b8d9-4a74-83e0-45dfca4c0a9c",
        "boardId": "07cc3d9e-e766-4eb2-9961-6a82b0d31a7e",
        "position": {
          "x": 1504627,
          "y": 1501919,
          "z": 0
        },
        "size": {
          "width": 400,
          "height": 253.125,
          "depth": 0
        },
        "rotation": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "type": "ImageViewer",
        "state": {
          "executeInfo": {
            "executeFunc": "",
            "params": {}
          },
          "assetid": "3ab878bf-e001-4cfa-b845-39fe31627df8",
          "annotations": false,
          "boxes": {}
        },
        "raised": false,
        "dragging": false,
        "pinned": false
      }
    }
  ]
}
```
