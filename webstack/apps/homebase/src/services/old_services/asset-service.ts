// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * @file Asset Service
//  * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
//  * @version 1.0.0
//  */

// /**
//  * Node Modules
//  */
// import * as path from 'path';
// import * as fsModule from 'fs';
// // Declare fs with Promises
// const fs = fsModule.promises;
// // Glob: to select files from regex
// import * as glob from 'glob';

// /**
//  * NPM modules
//  */
// import { v5 } from 'uuid';
// import { Request, Response } from 'express';

// /**
//  * Application modules
//  */
// import { config } from '../config';
// import { TaskManager, QExif } from '../connectors';
// import { ExifDataType, UUID } from '@sage3/shared/types';
// import { EventNames, EventMessage, SAGE3Events, AssetServiceMessage } from '@sage3/backend/events';

// /**
//  * Generate a unique ID within the namespace UUID v5 URL
//  *
//  * @param {string} name
//  * @returns {string}
//  */
// function generateFileUUID(name: string): string {
//   return v5(name, v5.URL);
// }

// /**
//  * Type to manage one asset
//  *
//  * @export
//  * @interface AssetType
//  */
// export interface AssetType {
//   file: string;
//   owner: string;
//   originalfilename: string;
//   id: UUID;
//   path: string;
//   exif?: ExifDataType;
//   dateAdded: Date;
//   boardId: string;
// }
// /**
//  * AssetService
//  *
//  * @export
//  * @class AssetService
//  */
// export class AssetService {
//   // The singleton instance
//   private static instance: AssetService;
//   // The process manager
//   private taskMgr: TaskManager;
//   // Where are stored the assets
//   private folder: string;
//   // the data structure to store assets
//   private collection: Record<string, AssetType>;

//   /**
//    * Creates an instance of AssetService.
//    *
//    * @memberOf AssetService
//    */
//   private constructor() {
//     // Task Manager
//     this.taskMgr = TaskManager.getInstance();
//     // Where are the assets
//     this.folder = config.public;
//     // Clean collection
//     this.collection = {};

//     // Receive events
//     // temporary solution, sent by file processors
//     SAGE3Events.listen(EventNames.AssetInfo, (data: EventMessage) => {
//       if (data.action === 'add') {
//         const msg = data as AssetServiceMessage;
//         const name = msg.id;
//         const original = msg.originalfilename || name;
//         const owner = msg.owner;
//         const boardId = msg.boardId || '-';
//         // Add asset under management
//         this.addAsset(name, owner, boardId, original).then((d: QExif) => {
//           // update the asset entry with the new exif data
//           this.collection[d.id].exif = d.exif;
//           this.saveToFile();
//           console.log('Asset> added', d.file, d.exif.FileName);
//           // Send a message to add the file into the asset manager
//           SAGE3Events.emit(EventNames.AssetInfo, {
//             action: 'added',
//             boardId: boardId,
//             owner: owner,
//             id: d.id,
//             filename: d.exif.FileName,
//             metadata: d.exif,
//           });
//         });
//       } else if (data.action === 'deleted') {
//         this.saveToFile();
//       }
//     });
//   }

//   /**
//    * Save the collection into a JSON file for persistence
//    *
//    * @memberOf AssetService
//    */
//   public saveToFile(): void {
//     // Save collection data
//     fs.writeFile(path.join(config.public, 'assets.json'), JSON.stringify(this.collection, null, 4)).then(() => {
//       console.log('Assets> DB saved');
//     });
//   }

//   /**
//    * Load the collection from a JSON file
//    *
//    * @memberOf AssetService
//    */
//   public loadFromFile(): void {
//     // Save collection data
//     fs.readFile(path.join(config.public, 'assets.json')).then((content) => {
//       this.collection = JSON.parse(content.toString());
//       console.log('Assets> DB loaded');
//     });
//   }

//   /**
//    * Laod the DB from file or create it if not existant
//    *
//    * @memberOf AssetService
//    */
//   public loadOrCreate(): void {
//     fs.access(path.join(config.public, 'assets.json'), fsModule.constants.F_OK)
//       .then(() => this.loadFromFile())
//       .catch(() => this.saveToFile());
//   }

//   /**
//    * Return all the assets under management
//    * @param req
//    * @param res
//    */
//   public static getAllAssets(req: Request, res: Response): void {
//     // Convert to an array
//     const arr = Object.values(this.instance.collection);
//     // Send the array
//     res.json(arr);
//   }

//   /**
//    * Return all the assets under management
//    * @param req
//    * @param res
//    */
//   public static getAssetById(req: Request, res: Response): void {
//     const id = req.params.assetId;
//     res.json(this.instance.getAssetInfoById(id));
//   }

//   /**
//    * Delete an asset by ID (from the collection and from the file system)
//    * @param req
//    * @param res
//    */
//   public static deleteFile(req: Request, res: Response): void {
//     const { assetId } = req.params;
//     const info = this.instance.getAssetInfoById(assetId);
//     if (info) {
//       // delete the file
//       fs.unlink(info.path).then(() => {
//         // remove the asset from the collection
//         delete this.instance.collection[assetId];
//         // Send response
//         res.json({ message: 'ok' });
//         // Delete the other generated files (pdf pages, multi-res images, ...)
//         const fileinfo = path.parse(info.path);
//         const dir = fileinfo.dir;
//         const base = fileinfo.name;
//         glob(path.join(dir, base + '-*.*'), {}, function (err, files) {
//           files.forEach((f) => fs.unlink(f));
//         });
//         // Send a message to other modules
//         SAGE3Events.emit(EventNames.AssetInfo, { action: 'deleted', id: info.id, boardId: info.boardId, owner: info.owner });
//       });
//     }
//   }

//   /**
//    * Add one file into management
//    *
//    * @param {string} file
//    *
//    * @memberOf AssetService
//    */
//   public addAsset(file: string, owner: string, boardId: string, original: string): Promise<QExif> {
//     // Generate a new unique ID
//     const newId = generateFileUUID(file);
//     // Build the asset
//     const newAsset: AssetType = {
//       id: newId,
//       owner: owner,
//       originalfilename: original,
//       file: file,
//       path: path.join(this.folder, file),
//       dateAdded: new Date(),
//       boardId: boardId,
//     };
//     // Test if the file is already under management
//     if (newId in this.collection) {
//       return Promise.resolve({
//         file: file,
//         id: newId,
//         exif: this.collection[newId].exif,
//       } as QExif);
//     } else {
//       // Add it into the collection
//       this.collection[newId] = newAsset;
//       // Send it for analysis
//       return this.taskMgr.addFile(newId, newAsset.path);
//     }
//   }

//   /**
//    * Return an asset by name
//    *
//    * @param {string} name
//    * @returns {(AssetType | undefined)}
//    *
//    * @memberOf AssetService
//    */
//   public getAssetInfoByName(name: string): AssetType | undefined {
//     if (name && name in this.collection) return this.collection[name];
//   }

//   /**
//    * Return an asset by ID
//    *
//    * @param {string} id
//    * @returns {(AssetType | undefined)}
//    *
//    * @memberOf AssetService
//    */
//   public getAssetInfoById(id: string): AssetType | undefined {
//     if (id && id in this.collection) return this.collection[id];
//   }

//   /**
//    * Ensure that there is only one instance created
//    *
//    * @static
//    * @returns {AssetService}
//    *
//    * @memberOf AssetService
//    */
//   public static getInstance(): AssetService {
//     if (!AssetService.instance) {
//       // Create the singleton
//       AssetService.instance = new AssetService();
//       // Load or create file
//       AssetService.instance.loadOrCreate();
//     }
//     return AssetService.instance;
//   }
// }
