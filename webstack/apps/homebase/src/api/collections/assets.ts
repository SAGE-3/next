/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * The asset database model.
 *
 * @author <a href="mailto:renambot@uic.edu">Luc Renambot</a>
 * @version 1.0.0
 */

import { niceCollection } from './nice-collection';
import { AssetSchema } from '@sage3/shared/types';
import { SBDocument, SBDocumentMessage } from '@sage3/sagebase';

// Queue for tasks
import { PDFProcessor, ImageProcessor, MetadataProcessor } from '../../processors';

import { config } from '../../config';

import { isPDF, isImage, isGIF } from '@sage3/shared';

/**
 * The database model for SAGE3 rooms.
 * This class must be initilized at least once.
 * This is handled in ./loaders/models-loader.ts
 */
class SAGE3AssetsCollection {
  private assetCollection!: niceCollection<AssetSchema>;
  private collectionName = 'ASSETS';
  private metaQ!: MetadataProcessor;
  private imgQ!: ImageProcessor;
  private pdfQ!: PDFProcessor;

  /**
   * Contructor initializing the collection.
   */
  public async initialize(): Promise<void> {
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

    // Create the collection
    const indexObj = { file: '' } as AssetSchema;
    this.assetCollection = new niceCollection<AssetSchema>(this.collectionName);
    await this.assetCollection.init(indexObj, async (updt: any) => {
      if (updt.type === 'CREATE') {
        console.log('Asset created>', updt.doc.data.originalfilename);
      }
    });
  }

  /**
   * Process a file for metadata, and pdf/image processing
   */
  public async processFile(id: string, file: string, fileType: string): Promise<any> {
    return new Promise((resolve) => {
      const tasks = [] as Promise<any>[];
      // extract metadata
      const t1 = this.metaQ.addFile(id, file);
      tasks.push(t1);
      // convert image to multiple sizes
      if (isImage(fileType) && !isGIF(fileType)) {
        const t2 = this.imgQ.addFile(id, file);
        tasks.push(t2);
      } else if (isPDF(fileType)) {
        // convert PDF to images
        const t2 = this.pdfQ.addFile(id, file);
        tasks.push(t2);
      }
      Promise.all(tasks).then(async ([r1, r2]) => {
        const exif = r1.data;
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
          resolve({
            dateCreated: realDate.toISOString(),
            metadata: r1.result,
            derived: r2.result,
          });
        } else {
          // everything else
          resolve({
            dateCreated: realDate.toISOString(),
            metadata: r1.result,
          });
        }
      });
    });
  }

  /**
   * Subscribe to the Apps Collection
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeAll(callback: (message: SBDocumentMessage<AssetSchema>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.assetCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('Asset subscribeToApps error>', error);
      return undefined;
    }
  }

  public async getAsset(id: string): Promise<SBDocument<AssetSchema> | undefined> {
    return this.assetCollection.getItem(id);
  }
  public async delAsset(id: string): Promise<boolean> {
    return this.assetCollection.deleteItem(id);
  }
  public getAllAssets(): Promise<SBDocument<AssetSchema>[]> {
    return this.assetCollection.getAllItems();
  }

  /**
   * Add a file in the database.
   * @param {AssetType} newAsset The new asset to add to the database
   * @returns {Promise<string | undefined>} Returns id of the asset
   */
  public async addAsset(newAsset: AssetSchema, by: string): Promise<string | undefined> {
    return this.assetCollection.addItem(newAsset, by);
  }
}

export const AssetsCollection = new SAGE3AssetsCollection();
