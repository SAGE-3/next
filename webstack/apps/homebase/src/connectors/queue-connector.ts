// /**
//  * Copyright (c) SAGE3 Development Team
//  *
//  * Distributed under the terms of the SAGE3 License.  The full license is in
//  * the file LICENSE, distributed as part of this software.
//  *
//  */

// /**
//  * Node Built-in Modules
//  */
// import { DefaultExifToolOptions, ExifTool, Tags } from 'exiftool-vendored';

// // Create an exiftool singleton with the right options
// const exiftool = new ExifTool({
//   ...DefaultExifToolOptions,
//   numericTags: ['FileSize'],
// });

// /**
//  * NPM modules
//  */
// import * as Bull from 'bull';

// /**
//  * Application modules
//  */
// import { config } from '../config';
// import { ExifDataType } from '@sage3/shared/types';

// // Datatype for the result of a task processing a file
// export type QExif = {
//   file: string;
//   id: string;
//   exif: ExifDataType;
// };

// class Queues {
//   private fileQueue: Bull.Queue;
//   // RedisConnection.getInstance()

//   constructor(redisInfo: string) {
//     // Create the Bull queue, based on REDIS
//     this.fileQueue = new Bull('file metadata', {
//       redis: { host: redisInfo },
//       defaultJobOptions: {
//         removeOnComplete: true,
//       },
//     });
//     // Event handler, not really used (because using promises)
//     this.fileQueue.on('completed', function (job, result) {
//       // Job done
//       console.log('fileQueue> task completed for', result.file);
//     });
//     // Task to be done, return a promise
//     this.fileQueue.process(async (job) => {
//       const data = await exiftoolFile(job.data.file);
//       return Promise.resolve<QExif>({
//         file: job.data.file,
//         id: job.data.id,
//         exif: data,
//       });
//     });
//   }

//   /**
//    * Add a file to be process and return a promise about job completed
//    *
//    * @param {string} id
//    * @param {string} file
//    * @returns {Promise<QExif>}
//    *
//    * @memberOf Queues
//    */
//   processFile(id: string, file: string): Promise<QExif> {
//     return this.fileQueue.add({ id: id, file: file }).then((job) => {
//       // returns the promise for the job completion
//       return job.finished();
//     });
//   }
// }

// /**
//  * High-level task manager
//  *
//  * @class taskManager
//  */
// export class TaskManager {
//   // Bull queues
//   private queues: Queues;
//   // The singleton instance
//   private static instance: TaskManager;

//   constructor() {
//     this.queues = new Queues(config.redis.host);
//   }

//   /**
//    * Create a task to process a file
//    *
//    * @param {string} id
//    * @param {string} file
//    * @returns {Promise<QExif>}
//    *
//    * @memberOf TaskManager
//    */
//   addFile(id: string, file: string): Promise<QExif> {
//     return this.queues.processFile(id, file);
//   }

//   /**
//    * Ensure that there is only one instance created
//    *
//    * @static
//    * @returns {TaskManager}
//    *
//    * @memberOf TaskManager
//    */
//   public static getInstance(): TaskManager {
//     if (!TaskManager.instance) {
//       TaskManager.instance = new TaskManager();
//     }
//     return TaskManager.instance;
//   }
// }

// /**
//  * Process a file, using exec method
//  *
//  * @method file
//  * @param filename {String} name of the file to be tested
//  */
// async function exiftoolFile(filename: string): Promise<ExifDataType> {
//   return new Promise((resolve, reject) => {
//     exiftool
//       .read(filename)
//       .then((tags: Tags) => {
//         if (tags.errors && tags.errors.length > 0) {
//           reject('EXIF> Error parsing JSON ' + tags.errors);
//         } else {
//           // Add a dummy type if needed
//           if (!tags.MIMEType) {
//             tags.MIMEType = 'text/plain';
//           }
//           if (!tags.FileType) {
//             tags.FileType = 'text/plain';
//           }
//           // rewrite dates as a string
//           tags.FileModifyDate = tags.FileModifyDate?.toString();
//           tags.FileAccessDate = tags.FileAccessDate?.toString();
//           tags.FileInodeChangeDate = tags.FileInodeChangeDate?.toString();
//           tags.DateTimeOriginal = tags.DateTimeOriginal?.toString();
//           tags.CreateDate = tags.CreateDate?.toString();
//           tags.MetadataDate = tags.MetadataDate?.toString();
//           tags.DateCreated = tags.DateCreated?.toString();
//           tags.DateTimeCreated = tags.DateTimeCreated?.toString();
//           // Python notebook
//           // @ts-ignore
//           if (tags['Cells']) delete tags.Cells;
//           // GEOJSON big structure
//           // @ts-ignore
//           if (tags['Features']) delete tags.Features;
//         }
//         // Done
//         resolve(tags as ExifDataType);
//       })
//       .catch((err) => {
//         reject('EXIF> Error parsing JSON ' + err);
//       });
//   });
// }
