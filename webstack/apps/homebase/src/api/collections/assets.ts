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

// Express web server framework
import * as express from 'express';

import { AssetSchema } from '@sage3/shared/types';
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
   * Process a file for metadata, and pdf/image processing
   */
  public async processFile(id: string, file: string, fileType: string) {
    // extract metadata
    const t1 = await this.metaQ.addFile(id, file);
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
    if ((isImage(fileType) && !isGIF(fileType)) || isPDF(fileType)) {
      // image or pdf processed
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
        derived: t2.result,
      };
    } else if (isVideo(fileType)) {
      // get the dimensions of the video from the medata
      const imgWidth = exif['ImageWidth'] || 1280;
      const imgHeight = exif['ImageHeight'] || 720;
      // video file: store width and height in the derived field
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
        derived: {
          filename: file,
          url: '/' + getStaticAssetUrl(file),
          fullSize: '/' + getStaticAssetUrl(file),
          // video size
          width: imgWidth,
          height: imgHeight,
          // save the image aspect ratio
          aspectRatio: imgWidth / imgHeight,
          sizes: [],
        },
      };
    } else {
      // everything else
      return {
        dateCreated: realDate.toISOString(),
        metadata: t1.result,
      };
    }
  }
}

export const AssetsCollection = new SAGE3AssetsCollection();
