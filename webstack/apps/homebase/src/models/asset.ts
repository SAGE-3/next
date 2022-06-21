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
import { AssetType } from '@sage3/shared/types';
import { SBDocument, SBDocumentMessage } from '@sage3/sagebase';

// Queue for tasks
import { PDFProcessor, ImageProcessor, MetadataProcessor } from '../processors';

import { config } from '../config';

/**
 * The database model for SAGE3 rooms.
 * This class must be initilized at least once.
 * This is handled in ./loaders/models-loader.ts
 */
class SAGE3AssetModel {
  private assetCollection!: niceCollection<AssetType>;
  private collectionName = 'ASSETS';

  /**
   * Contructor initializing the RoomModel.
   */
  public async initialize(): Promise<void> {
    // Get some values from the configuration object
    const assetFolder = config.assets;
    const redisUrl = config.redis.url;

    // A queue for metadata processing
    const metaQ = new MetadataProcessor(redisUrl, assetFolder);
    console.log('Queue> metadata initialized', metaQ.getName());
    // A queue for image processing
    const imgQ = new ImageProcessor(redisUrl, assetFolder);
    console.log('Queue> image initialized', imgQ.getName());
    // A queue for PDF processing
    const pdfQ = new PDFProcessor(redisUrl, assetFolder);
    console.log('Queue> pdf initialized', pdfQ.getName());

    // Create the collection
    const indexObj = { file: '' } as AssetType;
    this.assetCollection = new niceCollection<AssetType>(this.collectionName);
    await this.assetCollection.init(indexObj, (updt: any) => {
      console.log('Assets> update', updt);

      if (updt.type === 'CREATE') {
        console.log('Queue> add', updt.doc);
        const tasks = [] as Promise<any>[];
        const fileType = updt.doc.data.mimetype;
        console.log('Task> add', fileType);
        // extract metadata
        const t1 = metaQ.addFile(updt.doc._id, updt.doc.data.file);
        tasks.push(t1);
        // convert image to multiple sizes
        if (fileType.startsWith('image/')) {
          const t2 = imgQ.addFile(updt.doc._id, updt.doc.data.file);
          tasks.push(t2);
        }
        // convert PDF to images
        if (fileType === 'application/pdf') {
          const t3 = pdfQ.addFile(updt.doc._id, updt.doc.data.file);
          tasks.push(t3);
        }
        Promise.all(tasks).then(async ([r1, r2, r3]) => {
          // no await because we want create event before the update events
          if (r1) {
            this.assetCollection.updateItem(updt.doc._id, { metadata: r1.result });
          }
          if (r2) {
            this.assetCollection.updateItem(updt.doc._id, { derived: r2.result });
          }
          if (r3) {
            this.assetCollection.updateItem(updt.doc._id, { derived: r3.result });
          }
        });
      }
    });
  }

  /**
   * Subscribe to the Apps Collection
   * @param {() = void} callback The callback function for subscription events.
   * @return {() => void | undefined} The unsubscribe function.
   */
  public async subscribeAll(callback: (message: SBDocumentMessage<AssetType>) => void): Promise<(() => Promise<void>) | undefined> {
    try {
      const unsubscribe = await this.assetCollection.subscribe(callback);
      return unsubscribe;
    } catch (error) {
      console.log('Asset subscribeToApps error>', error);
      return undefined;
    }
  }

  public async getAsset(id: string): Promise<SBDocument<AssetType> | undefined> {
    return this.assetCollection.getItem(id);
  }
  public async delAsset(id: string): Promise<boolean> {
    return this.assetCollection.deleteItem(id);
  }
  public getAllAssets(): Promise<SBDocument<AssetType>[]> {
    return this.assetCollection.getAllItems();
  }

  /**
   * Add a file in the database.
   * @param {AssetType} newAsset The new asset to add to the database
   * @returns {Promise<string | undefined>} Returns id of the asset
   */
  public async addAsset(newAsset: AssetType): Promise<string | undefined> {
    return this.assetCollection.addItem(newAsset);
  }
}

export const AssetModel = new SAGE3AssetModel();
