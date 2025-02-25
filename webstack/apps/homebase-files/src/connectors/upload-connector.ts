/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * Connector for Multer logging system.
 * Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
 * @file Multer Connector
 * @author <a href="mailto:renambot@gmail.com">Luc Renambot</a>
 * @version 1.0.0
 */

import * as express from 'express';
import * as multer from 'multer';
import { v4 as getUUID } from 'uuid';
import { parseFileSize, humanFileSize } from '@sage3/shared';

import { config } from '../config';

/**
 * Multer Middleware for local storage
 **/

export class UploadConnector {
  private static instance: UploadConnector;
  private upload: multer.Multer;

  private constructor() {
    const filesizeLimit = config.webserver?.uploadLimit ? parseFileSize(config.webserver.uploadLimit) : 1024 * 1024 * 1024 * 5;
    console.log('Upload> destination', config.public, 'limit', humanFileSize(filesizeLimit));

    this.upload = multer({
      // use local storage
      storage: multer.diskStorage({
        destination: function (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
          console.log('Upload> config', config.public);
          return cb(null, config.public);
        },
        filename: function (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
          return cb(null, getUUID() + file.originalname.substring(file.originalname.lastIndexOf('.')));
        },
      }),
      // filter allowed files
      fileFilter: function (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
        console.log('Upload> filter', file.originalname, file.mimetype);
        // To accept the file pass true
        cb(null, true);
      },
      // File size limits
      limits: { fileSize: filesizeLimit },
    });
  }

  // Public static method to get the singleton instance
  public static getInstance(): UploadConnector {
    if (!UploadConnector.instance) {
      UploadConnector.instance = new UploadConnector();
    }
    return UploadConnector.instance;
  }

  /**
   * Middleware connector for Multer.
   * @param fieldname Shared name of the multipart form fields to process.
   * @returns express.RequestHandler
   */
  public uploadMiddleware(fieldname: string): express.RequestHandler {
    return this.upload.array(fieldname);
  }
}

/**
 * Multer Middleware for Google storage
 **/

// Google storage
// import MulterGoogleCloudStorage from 'multer-cloud-storage';
// AWS S3 storage
// import * as AWS from 'aws-sdk';
// import * as multerS3 from 'multer-s3';

/*
 const googleProjectId = "sage3-302419";
 const googleBucket = "sage3-bucket1";
 const googleKeyFilename = path.join("keys", "google-storage.json");
 
 const uploadGoogle = multer({
   storage: new MulterGoogleCloudStorage({
     projectId: googleProjectId,
     bucket: googleBucket,
     keyFilename: googleKeyFilename,
     uniformBucketLevelAccess: true,
     filename: function (_req, file, cb) {
       return cb(null, getUUID() + file.originalname.substring(file.originalname.lastIndexOf(".")));
     },
   }),
   fileFilter: function (_req, file, cb) {
     console.log("Filter uploadGoogle>", file.originalname, file.mimetype);
     // To accept the file pass true
     cb(null, true);
   },
   limits: {
     fileSize: 1024 * 50, // 50KB
   },
 });
 
 export function multerGoogleMiddleware(fieldname: string): express.RequestHandler {
   return uploadGoogle.array(fieldname);
 }
 */

/**
 * Multer Middleware for AWS S3 storage
 **/

/*
 const s3Bucket = "sage_bucket";
 const s3ACL = "public-read";
 const awsKeyFilename = path.join("keys", "aws-storage.json");
 
 // Load credentials
 AWS.config.loadFromPath(awsKeyFilename);
 // Check credentials
 AWS.config.getCredentials(function (err) {
   if (err) console.log(err.stack);
   // credentials not loaded
   else {
     console.log("AWS Access key>", AWS.config.credentials?.accessKeyId);
   }
 });
 var s3Object = new AWS.S3({ apiVersion: "2006-03-01" });
 
 const uploadS3 = multer({
   storage: multerS3({
     s3: s3Object,
     bucket: s3Bucket,
     acl: s3ACL,
     metadata: function (_req, file, cb) {
       cb(null, { fieldName: file.fieldname });
     },
     key: function (_req, file, cb) {
       return cb(null, getUUID() + file.originalname.substring(file.originalname.lastIndexOf(".")));
     },
   }),
   fileFilter: function (_req, file, cb) {
     console.log("Filter uploadS3>", file.originalname, file.mimetype);
     // To accept the file pass true
     cb(null, true);
   },
   limits: {
     fileSize: 1024 * 50, // 50KB
   },
 });
 
 export function multerS3Middleware(fieldname: string): express.RequestHandler {
   return uploadS3.array(fieldname);
 }
 */
