/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * The asset database model.
 *
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

// Node modules
import * as fs from 'fs';
import * as path from 'path';

// Express web server framework
import * as express from 'express';

// SAGE3 modules
import { AssetSchema, ExtraVideoType, ExtraImageType } from '@sage3/shared/types';
import { getStaticAssetUrl, SAGE3Collection, sageRouter } from '@sage3/backend';
import { isPDF, isImage, isGIF, isVideo } from '@sage3/shared';

// Queue for tasks
import { PDFProcessor, ImageProcessor, MetadataProcessor } from '../../processors';
import { uploadHandler } from '../routers/custom';
import { config } from '../../config';

class SAGE3AssetsCollection extends SAGE3Collection<AssetSchema> {
  private metaQ!: MetadataProcessor;
  private imgQ!: ImageProcessor;
  private pdfQ!: PDFProcessor;

  constructor() {
    super('ASSETS', { file: '' });
    const router = sageRouter<AssetSchema>(this);
    this.httpRouter = router;
  }

  public async initialize(clear?: boolean, ttl?: number): Promise<void> {
    // call the base class method
    await super.initialize(clear, ttl);
    // Upload files: POST /api/assets/upload
    this.router().post('/upload', uploadHandler);
    // Access to uploaded files: GET /api/assets/static/:filename
    const assetFolder = config.public;
    this.router().use('/static', express.static(assetFolder));
    // Finish the initialization by adding file processors
    this.setup();
    // Check the consistency of the collection
    await this.check();
  }

  /**
   * Initializing the collection.
   */
  public setup() {
    // Get some values from the configuration object
    const assetFolder = config.public;
    const redisUrl = config.redis.url;

    // A queue for metadata processing
    this.metaQ = new MetadataProcessor(redisUrl, assetFolder);
    console.log('Queue> metadata initialized', this.metaQ.getName());
    // A queue for image processing
    this.imgQ = new ImageProcessor(redisUrl, assetFolder);
    console.log('Queue> image initialized', this.imgQ.getName());
    // A queue for PDF processing
    this.pdfQ = new PDFProcessor(redisUrl, assetFolder);
    console.log('Queue> pdf initialized', this.pdfQ.getName());
  }

  /**
   * Checking up the asset DB at startup.
   */
  public async check() {
    const all = await AssetsCollection.getAll();
    console.log('Assets> count', all?.length);
    if (all) {
      for (const asset of all) {
        const exists = fs.existsSync(asset.data.path);
        if (!exists) {
          console.log('Assets> not present, deleting from DB', asset._id, asset.data.originalfilename);
          await AssetsCollection.delete(asset._id);
        }
      }
    }
  }

  /**
   * Process a file for metadata
   */
  public async metadataFile(id: string, file: string, fileType: string) {
    // extract metadata
    const t1 = await this.metaQ.addFile(id, file);

    const exif = t1.data;
    // Find a creation date from all the exif dates
    let realDate = new Date();
    if (!isNaN(Date.parse(exif.CreateDate))) {
      realDate = new Date(exif.CreateDate);
    } else if (!isNaN(Date.parse(exif.DateTimeOriginal))) {
      realDate = new Date(exif.DateTimeOriginal);
    } else if (!isNaN(Date.parse(exif.ModifyDate))) {
      realDate = new Date(exif.ModifyDate);
    } else if (!isNaN(Date.parse(exif.FileModifyDate))) {
      realDate = new Date(exif.FileModifyDate);
    }
    if (isGIF(fileType)) {
      const imgWidth = exif['ImageWidth'] || 400;
      const imgHeight = exif['ImageHeight'] || 400;
      const imageData: ExtraImageType = {
        filename: path.join(config.public, file),
        url: getStaticAssetUrl(file),
        fullSize: getStaticAssetUrl(file),
        width: imgWidth,
        height: imgHeight,
        aspectRatio: imgWidth / imgHeight,
        sizes: [],
      };
      return {
        dateCreated: realDate.toISOString(),
        derived: imageData,
        metadata: t1.result,
      };
    } else if (isImage(fileType) || isPDF(fileType)) {
      // image or pdf processed
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
      };
    } else if (isVideo(fileType)) {
      // get the dimensions of the video from the medata
      let imgWidth = exif['ImageWidth'] || 1280;
      let imgHeight = exif['ImageHeight'] || 720;
      const rotation = exif['Rotation'] || 0;
      if (rotation === 90 || rotation === 270) {
        // swap width and height
        const tmp = imgWidth;
        imgWidth = imgHeight;
        imgHeight = tmp;
      }
      const derived: ExtraVideoType = {
        filename: file,
        url: '/' + getStaticAssetUrl(file),
        // video size
        width: imgWidth,
        height: imgHeight,
        // save the image aspect ratio
        aspectRatio: imgWidth / imgHeight,
        // video metadata
        duration: exif['TrackDuration'] || exif['MediaDuration'] || exif['Duration'] || '',
        birate: exif['AvgBitrate'] || '',
        framerate: exif['VideoFrameRate'] || 0,
        compressor: exif['CompressorName'] || exif['CompressorID'] || '',
        audioFormat: exif['AudioFormat'] || '',
        rotation: rotation,
      };
      // Fix video duration if it's object with Scale and Value properties
      if (!derived.duration && typeof exif['Duration'] !== 'string') {
        if (exif['Duration'].Scale && exif['Duration'].Value) {
          const value = exif['Duration'].Value * exif['Duration'].Scale;
          derived.duration = value.toFixed(2);
        }
      }
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
        derived: derived,
      };
    } else {
      // everything else
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
      };
    }
  }

  /**
   * Process a file for conversion: pdf/image processing
   */
  public async processFile(id: string, file: string, fileType: string) {
    let t2;
    // convert image to multiple sizes
    if (isImage(fileType) && !isGIF(fileType)) {
      t2 = await this.imgQ.addFile(id, file);
    } else if (isPDF(fileType)) {
      // convert PDF to images
      t2 = await this.pdfQ.addFile(id, file).catch((err) => {
        return Promise.reject(err);
      });
    }
    if ((isImage(fileType) && !isGIF(fileType)) || isPDF(fileType)) {
      // image or pdf processed
      return t2.result;
    } else {
      return null;
    }
  }
}

export const AssetsCollection = new SAGE3AssetsCollection();
