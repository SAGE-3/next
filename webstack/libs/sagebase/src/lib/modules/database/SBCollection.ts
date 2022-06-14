/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { RedisClientType, SchemaFieldTypes, SearchOptions } from 'redis';
import { generateSBDocumentTemplate, SBDocument, SBDocumentMessage, SBDocumentRef, SBJSON } from './SBDocument';

/**
 * Conversion from JS primitive names to RedisSearch SchmeField Types
 */
const IndexTypes = {
  number: SchemaFieldTypes.NUMERIC,
  string: SchemaFieldTypes.TAG,
};

/**
 * A Reference to a SAGEBase Collection in the database.
 * Collections hold SAGEBase Documents (SBDocument).
 */
export class SBCollectionRef<Type extends SBJSON> {
  private _name;
  private _path: string;
  private _redisClient: RedisClientType;
  private _indexName: string;

  /**
   *
   * @param name The name of the collection
   * @param path The "collections" path in the database
   * @param redisClient The redis client
   */
  constructor(name: string, path: string, redisClient: RedisClientType) {
    this._name = name;
    this._path = path;
    this._redisClient = redisClient;
    this._indexName = `index:${name}`;
  }

  /**
   * Create a new SBDocument from the provided 'data' and add it to the collection.
   * @param data The data of the document
   * @param forcedId Optional: Forces the document to use a specific ID
   * @returns {SBDocumentRef<Type> | undefined} A SBDocumentRef that points to the newly added document. Undefined if the operation was unsuccessful
   */
  public async addDoc(data: Type, forcedId?: string): Promise<SBDocumentRef<Type> | undefined> {
    try {
      const doc = generateSBDocumentTemplate<Type>(data);
      if (forcedId) doc._id = forcedId;
      const docPath = `${this._path}:${doc._id}`;
      const docRef = new SBDocumentRef<Type>(doc._id, docPath, this._redisClient);
      const redisRes = await docRef.set(data);
      if (redisRes.success) {
        return docRef;
      } else {
        return undefined;
      }
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
    }
  }

  /**
   * Get a document refernce from the collection by id.
   * @param {string} id The id of the document within the collection
   * @returns {SBDocumentRef<Type>} A SBDocumentRef that points to the newly added document
   */
  public docRef(id: string): SBDocumentRef<Type> {
    const docPath = `${this._path}:${id}`;
    const docRef = new SBDocumentRef<Type>(id, docPath, this._redisClient);
    return docRef;
  }

  /**
   * Subscribe to every event that happens on this collection
   * @param callback The callback function to be called when an even happens.
   * @returns {Promise<() => Promise<void>>}
   */
  public async subscribe(callback: (message: SBDocumentMessage<Type>) => void): Promise<() => Promise<void>> {
    const subscriber = this._redisClient.duplicate();
    await subscriber.connect();
    await subscriber.pSubscribe(`${this._path}:*`, (message: string) => {
      const parseMsg = JSON.parse(message) as SBDocumentMessage<Type>;
      parseMsg.col = this._name;
      callback(parseMsg);
    });

    return async () => {
      await subscriber.pUnsubscribe(`${this._path}:*`);
      await subscriber.disconnect();
    };
  }

  /**
   * Will allow users to subscribe to the Collection based of a specific query.
   * Only works on top level props and strings.
   * @param {string} propertyName The top level property name to match
   * @param {string} value The value to match
   * @param callback The callback function to be called when an even happens.
   * @returns {Promise<() => Promise<void>>}
   */
  public async subscribeToQuery(
    propertyName: keyof Type,
    value: string,
    callback: (message: SBDocumentMessage<Type>) => void
  ): Promise<() => Promise<void>> {
    const subscriber = this._redisClient.duplicate();
    await subscriber.connect();

    await subscriber.pSubscribe(`${this._path}:*`, (message: string) => {
      const parseMsg = JSON.parse(message) as SBDocumentMessage<Type>;
      parseMsg.col = this._name;
      const propValue = parseMsg.doc.data[propertyName];
      if (propValue === value) {
        callback(parseMsg);
      }
    });

    return async () => {
      await subscriber.pUnsubscribe(`${this._path}:*`);
      await subscriber.disconnect();
    };
  }

  /**
   * Get all the SBDocuments in the collection.
   * @returns {Promise<SBDocument<Type>[]>} An array of SBDocuments.
   */
  public async getAllDocs(): Promise<SBDocument<Type>[]> {
    const docRefs = await this.getAllDocRefs();
    const promises = docRefs.map((docRef) => docRef.read());
    const docs = await Promise.all(promises);
    if (docs) {
      const returnList = [] as SBDocument<Type>[];
      docs.forEach((doc) => {
        if (doc !== undefined) returnList.push(doc);
      });
      return returnList;
    } else {
      return [];
    }
  }

  /**
   * Get all the SBDocumentsRefs in the collection
   * @returns { Promise<SBDocumentRef<Type>[]>} An array of SBDocumentsRefs
   */
  public async getAllDocRefs(): Promise<SBDocumentRef<Type>[]> {
    try {
      const redisRes = await this._redisClient.keys(`${this._path}:*`);
      const docRefList = [] as SBDocumentRef<Type>[];
      redisRes.forEach((key) => {
        const id = key.split(':')[key.split(':').length - 1];
        const docRef = new SBDocumentRef<Type>(id, key, this._redisClient);
        docRefList.push(docRef);
      });
      return docRefList;
    } catch (error) {
      this.ERRORLOG(error);
      return [];
    }
  }

  /**
   * Creates an index of the collection from the provided object shape.
   * @param indexFields A Partial object of the Collection's Type. The Collection will be queryable by the provided props.
   * @returns
   */
  public async createQueryIndex(indexFields: Partial<Type>): Promise<boolean> {
    this._indexName = `idx:${this._name}`;
    try {
      await this._redisClient.ft.dropIndex(this._indexName);
    } catch (error) {
      this.INFOLOG(error);
    }
    try {
      const schema = {
        '$._id': {
          type: SchemaFieldTypes.TAG,
          AS: '_id',
        },
        '$._createdAt': {
          type: SchemaFieldTypes.NUMERIC,
          AS: '_createdAt',
        },
        '$._updatedAt': {
          type: SchemaFieldTypes.NUMERIC,
          AS: '_updatedAt',
        },
      } as { [key: string]: any };
      Object.keys(indexFields).forEach((prop) => {
        const type = typeof indexFields[prop];
        if (Object.prototype.hasOwnProperty.call(IndexTypes, type)) {
          const schemaType = IndexTypes[type as 'string' | 'number'];
          schema[`$.data.${prop}`] = {
            type: schemaType,
            AS: prop,
          };
        }
      });
      const options = {
        ON: 'JSON',
        PREFIX: `${this._path}`,
      } as SearchOptions;
      const redisRes = await this._redisClient.ft.create(this._indexName, schema, options);
      const res = redisRes === 'OK' ? true : false;
      return res;
    } catch (error) {
      this.ERRORLOG(error);
      return false;
    }
  }

  /**
   * Query the collection.
   * Works for exact matches right now.
   * @param {string} propertyName The field to query the collection
   * @param {stirng | number} query  The query. Currently only on a "equals"
   * @returns {Promise<SBDocumentRef<Type>[]>} An array of document refs that satisfy the query.
   */
  public async query(propertyName: keyof Type, query: string | number): Promise<SBDocument<Type>[]> {
    try {
      // THIS IS A FIX FOR UUIDS. REDIS DOESNT LIKE DASHES
      // ** https://redis.io/docs/stack/search/reference/escaping/
      // ** https://redis.io/docs/stack/search/reference/tags/
      if (typeof query === 'string') query = `{${query.replace(/[#-]/g, '\\$&')}}`;
      if (typeof query === 'number') query = `[${query} ${query}]`;
      const response = await this._redisClient.ft.search(this._indexName, `@${propertyName}:${query}`); //, { LIMIT: { from: 0, size: 1000 } }
      const docRefPromises = response.documents.map((el) =>
        new SBDocumentRef<Type>(el.value['_id'] as string, el.id, this._redisClient).read()
      );
      const docs = await Promise.all([...docRefPromises]);
      const a = [] as SBDocument<Type>[];
      docs.forEach((el) => {
        if (el !== undefined) a.push(el);
      });
      return a;
    } catch (error) {
      this.ERRORLOG(error);
      return [];
    }
  }

  /**
   * Prints errors related to SBCollection
   * @param {unknown} error
   */
  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBCollection ERROR: ', error);
  }

  /**
   * Prints info related to SBCollection
   * @param {unknown} error
   */
  private INFOLOG(error: unknown) {
    console.log('SAGEBase SBCollection INFO: ', error);
  }
}
