/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { RedisClientType } from 'redis';
import { v4 } from 'uuid';
import { PathValue, DotNestedKeys } from './Util';
import { SBLogger } from '../logger/SBLogger';

// Lua scripts run atomically, so one staging key never holds two scripts' data.
const stagingKey = 'sagebase:staged';

// The Supported primitives and types in the Database
export type SBJSON = { [prop: string]: SBPrimitive };
type SBArray = Array<SBPrimitive>;
export type SBPrimitive = null | boolean | number | string | SBArray | SBJSON;

// The Format of the actual SAGEBase Document
// .data has the actual USER set data
export type SBDocument<Type extends SBJSON> = {
  _id: string;
  _createdAt: number;
  _createdBy: string;
  _updatedAt: number;
  _updatedBy: string;
  data: Type;
};

export type SBDocumentUpdate<Type> = Partial<{ [Key in DotNestedKeys<Type>]: PathValue<Type, Key> }> & Partial<Type>;

export type SBDocWriteResult<Type extends SBJSON> = {
  success: boolean;
  writetime: number;
  doc: SBDocument<Type> | undefined;
};

export type SBConditionalWriteResult<Type extends SBJSON> = SBDocWriteResult<Type> & {
  conflict?: boolean;
};

export type SBJSONChange =
  | { readonly op: 'set'; readonly path: readonly string[]; readonly value: SBPrimitive }
  | { readonly op: 'delete'; readonly path: readonly string[] };

export type SBNestedChange = {
  readonly segments: readonly string[];
  readonly value: SBPrimitive | undefined;
};

export type SBNestedCondition = SBNestedChange;

type NestedRevision = {
  readonly segments: readonly string[];
  readonly expected?: number;
};

export type SBDocumentCreateMessage<Type extends SBJSON> = {
  type: 'CREATE';
  col: string;
  doc: SBDocument<Type>[];
};

export type SBDocumentUpdateMessage<Type extends SBJSON> = {
  type: 'UPDATE';
  col: string;
  doc: SBDocument<Type>[];
  updates: { id: string; updates: Partial<Type> }[];
};

export type SBDocumentDeleteMessage<Type extends SBJSON> = {
  type: 'DELETE';
  col: string;
  doc: SBDocument<Type>[];
};

export type SBDocumentMessage<Type extends SBJSON> =
  | SBDocumentCreateMessage<Type>
  | SBDocumentUpdateMessage<Type>
  | SBDocumentDeleteMessage<Type>;

// Depend on document commands, not client module/function generic parameters.
type DocumentRedisClient = Pick<RedisClientType, 'json' | 'expire' | 'exists' | 'eval' | 'publish'> & {
  duplicate(): Pick<RedisClientType, 'subscribe' | 'unsubscribe' | 'disconnect'> & {
    connect(): Promise<unknown>;
  };
};

/**
 * A database reference to the SAGEBase Document.
 */
export class SBDocumentRef<Type extends SBJSON> {
  private _id: string;
  private _path: string;
  private readonly _redisClient: DocumentRedisClient;
  private _colName: string;

  constructor(id: string, collection: string, path: string, redisClient: DocumentRedisClient) {
    this._id = id;
    this._path = path;
    this._colName = collection;
    this._redisClient = redisClient;
  }

  // ID of the document
  public get id(): string {
    return this._id;
  }

  // The REDIS Key of the document
  private get path(): string {
    return this._path;
  }

  //
  private get redis(): DocumentRedisClient {
    return this._redisClient;
  }

  /**
   * Read the document from the database
   * @returns {Type} This document
   */
  public async read(): Promise<SBDocument<Type> | undefined> {
    try {
      const redisRes = await this.redis.json.get(`${this._path}`);
      // redis.json.get() returns null when the key doesn't exist (e.g. deleted between
      // a keys() scan and this fetch). Normalize to undefined so callers see a consistent type.
      return redisRes === null ? undefined : (redisRes as SBDocument<Type>);
    } catch (error) {
      this.ERRORLOG(error);
      return undefined;
    }
  }

  /**
   * Set this document in the database. createOnly atomically refuses an existing key.
   * @param data The data
   * @returns
   */
  public async set(data: Type, by: string, ttl: number, publish = true, createOnly = false): Promise<SBDocWriteResult<Type>> {
    try {
      const doc = generateSBDocumentTemplate<Type>(data, by);
      doc._id = this.id;
      const redisRes = await this._redisClient.json.set(this.path, '.', doc, createOnly ? { NX: true } : undefined);
      if (redisRes !== 'OK') {
        return generateWriteResult('create', this._colName, false);
      }

      if (ttl > -1) {
        // Set the Time to Live, in sec.
        this._redisClient.expire(this.path, ttl);
      }
      const response = generateWriteResult<Type>('create', this._colName, true, doc);
      if (publish) {
        await this.publishCreateAction(doc);
      }
      return response;
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult('create', this._colName, false);
    }
  }

  /**
   *
   * @param update
   * @returns
   */
  public async update(update: SBDocumentUpdate<Type>, by: string, publish = true): Promise<SBDocWriteResult<Type>> {
    if (update === undefined) return generateWriteResult('update', this._colName, false);
    const pub = publish === undefined ? true : publish;
    // Check if Doc exists
    const exists = await this._redisClient.exists(`${this.path}`);
    if (exists === 0) {
      this.ERRORLOG(`Doc does not exists.`);
      return generateWriteResult('update', this._colName, false);
    }
    try {
      // Check if a property on the document was updated
      let updated = false;
      // Update all the properties
      const updatePromises = Object.keys(update).map(async (key) => {
        const value = update[key] as Type[string];
        // XX - only set the key if it already exists
        // const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value, { XX: true });
        const redisRes = await this._redisClient.json.set(`${this.path}`, `.data.${key}`, value);
        // If one of the properties was updated, then the document was updated
        const res = redisRes === 'OK' ? true : false;
        if (res === true) {
          updated = true;
        }
      });
      await Promise.all(updatePromises);
      // The document was updated
      if (updated) {
        // Refresh the updatedAt and updatedBy
        await this.refreshUpdate(by);
        // Get the new document value
        const newValue = await this.read();
        // Publish the new document value
        if (newValue && pub) {
          await this.publishUpdateAction(newValue, update);
        }
        // Generate the response and return it
        return generateWriteResult<Type>('update', this._colName, true, newValue);
      } else {
        // The document wasn't updated
        return generateWriteResult<Type>('update', this._colName, false);
      }
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult<Type>('update', this._colName, false);
    }
  }

  /**
   * Atomically set/remove a nested field, including missing object namespaces.
   */
  public async updateNested(
    segments: readonly string[],
    value: SBPrimitive | undefined,
    by: string
  ): Promise<SBDocWriteResult<Type>> {
    return this.updateNestedMany([{ segments, value }], by);
  }

  /**
   * Commit a batch only when every supplied snapshot still matches. An undefined
   * condition means the path is absent, not JSON null. No partial batch is stored.
   */
  public async updateNestedMany(
    changes: readonly SBNestedChange[],
    by: string,
    conditions: readonly SBNestedCondition[] = []
  ): Promise<SBConditionalWriteResult<Type>> {
    return this.writeNested(changes, by, conditions);
  }

  public async compareAndSwapNested(
    segments: readonly string[],
    expected: SBPrimitive | undefined,
    value: SBPrimitive,
    by: string,
    conditions: readonly SBNestedCondition[] = []
  ): Promise<SBConditionalWriteResult<Type>> {
    return this.updateNestedMany([{ segments, value }], by, [...conditions, { segments, value: expected }]);
  }

  /**
   * Field-level object changes with a separate monotonic namespace revision.
   * Arrays are replacement values, never containers traversed by a change.
   */
  public async patchNested(
    segments: readonly string[],
    revisionSegments: readonly string[],
    changes: readonly SBJSONChange[],
    by: string,
    expectedRevision?: number,
    conditions: readonly SBNestedCondition[] = []
  ): Promise<SBConditionalWriteResult<Type>> {
    return this.writeNested(
      changes.map((change) => ({
        segments: [...segments, ...change.path],
        value: change.op === 'set' ? change.value : undefined,
      })),
      by,
      conditions,
      { segments: revisionSegments, expected: expectedRevision }
    );
  }

  private async writeNested(
    changes: readonly SBNestedChange[],
    by: string,
    conditions: readonly SBNestedCondition[],
    revision?: NestedRevision
  ): Promise<SBConditionalWriteResult<Type>> {
    // Callers pass identifier segments ([a-zA-Z0-9_-], never prototype keys).
    try {
      const result = await this._redisClient.eval(
        `
        local original = redis.call('JSON.GET', KEYS[1])
        if not original then
          return false
        end

        local changes = cjson.decode(ARGV[1])
        local conditions = cjson.decode(ARGV[2])
        local revision = cjson.decode(ARGV[3])
        local function pathFor(root, segments)
          for _, segment in ipairs(segments) do
            root = root .. '.' .. segment
          end
          return root
        end

        -- Stage with RedisJSON rather than cjson roundtrips: [] and {} must stay
        -- distinct. This private key exists only during the atomic Lua invocation.
        redis.call('JSON.SET', KEYS[2], '.', '{"doc":' .. original .. ',"expected":null}')
        local ok, result = pcall(function()
          for _, condition in ipairs(conditions) do
            local path = pathFor('.data', condition.segments)
            local current = redis.call('JSON.TYPE', KEYS[1], path) and redis.call('JSON.GET', KEYS[1], path)
            if condition.absent then
              if current then
                return 'conflict'
              end
            else
              redis.call('JSON.SET', KEYS[2], '.expected', condition.json)
              if current ~= redis.call('JSON.GET', KEYS[2], '.expected') then
                return 'conflict'
              end
            end
          end

          local nextRevision
          if revision ~= cjson.null then
            local path = pathFor('.data', revision.segments)
            local raw = redis.call('JSON.TYPE', KEYS[1], path) and redis.call('JSON.GET', KEYS[1], path)
            local current = 0
            if raw then
              current = cjson.decode(raw)
            end
            if revision.expected ~= cjson.null and current ~= revision.expected then
              return 'conflict'
            end

            nextRevision = current + 1
          end

          local function write(segments, value, remove)
            local path = '.doc.data'
            for index, segment in ipairs(segments) do
              local parentType = redis.call('JSON.TYPE', KEYS[2], path)
              if not parentType then
                redis.call('JSON.SET', KEYS[2], path, '{}')
              elseif parentType ~= 'object' then
                error('Nested changes require object parents.')
              end
              path = path .. '.' .. segment
            end
            if remove then
              redis.call('JSON.DEL', KEYS[2], path)
            else
              redis.call('JSON.SET', KEYS[2], path, value)
            end
          end

          for _, change in ipairs(changes) do
            write(change.segments, change.json, change.absent)
          end
          if nextRevision then
            write(revision.segments, tostring(nextRevision), false)
          end

          redis.call('JSON.SET', KEYS[2], '.doc._updatedAt', ARGV[4])
          redis.call('JSON.SET', KEYS[2], '.doc._updatedBy', ARGV[5])
          local doc = redis.call('JSON.GET', KEYS[2], '.doc')
          local data = redis.call('JSON.GET', KEYS[2], '.doc.data')
          local message = '{"type":"UPDATE","col":' .. ARGV[6] .. ',"doc":[' .. doc ..
            '],"updates":[{"id":' .. ARGV[7] .. ',"updates":' .. data .. '}]}'

          redis.call('JSON.SET', KEYS[1], '.', doc)
          redis.call('PUBLISH', KEYS[1], message)
          return doc
        end)
        redis.call('DEL', KEYS[2])
        if not ok then
          return false
        end
        return result
        `,
        {
          keys: [this.path, stagingKey],
          arguments: [
            JSON.stringify(changes.map(serializeNestedChange)),
            JSON.stringify(conditions.map(serializeNestedChange)),
            JSON.stringify(revision ? { segments: revision.segments, expected: revision.expected ?? null } : null),
            String(Date.now()),
            JSON.stringify(by),
            JSON.stringify(this._colName),
            JSON.stringify(this.id),
          ],
        }
      );

      if (result === 'conflict') {
        return { ...generateWriteResult<Type>('update', this._colName, false), conflict: true };
      }
      if (typeof result !== 'string') {
        return generateWriteResult('update', this._colName, false);
      }

      return generateWriteResult('update', this._colName, true, JSON.parse(result) as SBDocument<Type>);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult('update', this._colName, false);
    }
  }

  /**
   * Append one or more values to a JSON array field of this document's data,
   * without rewriting the whole array (RedisJSON ARRAPPEND).  This makes adding
   * an element O(appended) instead of O(existing).  When `publish` is false the
   * full document is not read back, keeping the whole operation independent of
   * the array's current size.
   */
  public async arrayAppend(field: string, values: any[], by: string, publish = true): Promise<SBDocWriteResult<Type>> {
    if (!values || values.length === 0) return generateWriteResult('update', this._colName, false);
    const exists = await this._redisClient.exists(`${this.path}`);
    if (exists === 0) {
      this.ERRORLOG(`Doc does not exists.`);
      return generateWriteResult('update', this._colName, false);
    }
    try {
      await this._redisClient.json.arrAppend(`${this.path}`, `.data.${field}`, ...values);
      // Refresh the updatedAt/updatedBy metadata.
      await this.refreshUpdate(by);
      // Only read back and broadcast the full document when asked to publish.
      if (publish) {
        const newValue = await this.read();
        if (newValue) await this.publishUpdateAction(newValue, {});
        return generateWriteResult<Type>('update', this._colName, true, newValue);
      }
      return generateWriteResult<Type>('update', this._colName, true);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult<Type>('update', this._colName, false);
    }
  }

  private async refreshUpdate(by?: string): Promise<void> {
    const updatedAt = Date.now();
    const redisRes = await this._redisClient.json.set(`${this.path}`, `._updatedAt`, updatedAt, { XX: true });
    if (redisRes && redisRes != 'OK') {
      console.error('refreshUpdate', redisRes);
    }
    if (by) {
      const res = await this._redisClient.json.set(`${this.path}`, `._updatedBy`, by, { XX: true });
      if (res && res != 'OK') {
        console.error('refreshUpdate', res);
      }
    }
  }

  /**
   * Change the _createdBy field of the document
   */
  public async updateCreatedBy(newId: string): Promise<SBDocWriteResult<Type>> {
    const redisRes = await this._redisClient.json.set(`${this.path}`, `._createdBy`, newId, { XX: true });
    if (redisRes && redisRes != 'OK') {
      this.refreshUpdate(newId);
      console.error('updateCreatedBy', redisRes);
      return generateWriteResult<Type>('update', this._colName, false);
    } else {
      const newValue = await this.read();
      // Publish the new document value
      if (newValue) {
        await this.publishUpdateAction(newValue, {});
      }
      return generateWriteResult<Type>('update', this._colName, true, newValue);
    }
  }

  public async delete(
    publish = true,
    conditions: readonly SBNestedCondition[] = []
  ): Promise<SBConditionalWriteResult<Type>> {
    try {
      const result = await this._redisClient.eval(
        `
        local original = redis.call('JSON.GET', KEYS[1])
        if not original then
          return false
        end

        redis.call('JSON.SET', KEYS[2], '.', '{"expected":null}')
        local ok, result = pcall(function()
          for _, condition in ipairs(cjson.decode(ARGV[1])) do
            local path = '.data'
            for _, segment in ipairs(condition.segments) do
              path = path .. '.' .. segment
            end
            local current = redis.call('JSON.TYPE', KEYS[1], path) and redis.call('JSON.GET', KEYS[1], path)
            if condition.absent then
              if current then
                return 'conflict'
              end
            else
              redis.call('JSON.SET', KEYS[2], '.expected', condition.json)
              if current ~= redis.call('JSON.GET', KEYS[2], '.expected') then
                return 'conflict'
              end
            end
          end

          redis.call('JSON.DEL', KEYS[1])
          if ARGV[2] == 'true' then
            redis.call('PUBLISH', KEYS[1], '{"type":"DELETE","col":' .. ARGV[3] .. ',"doc":[' .. original .. ']}')
          end
          return original
        end)
        redis.call('DEL', KEYS[2])
        if not ok then
          return false
        end
        return result
        `,
        {
          keys: [this.path, stagingKey],
          arguments: [
            JSON.stringify(conditions.map(serializeNestedChange)),
            String(publish),
            JSON.stringify(this._colName),
          ],
        }
      );

      if (result === 'conflict') {
        return { ...generateWriteResult<Type>('delete', this._colName, false), conflict: true };
      }

      if (typeof result !== 'string') {
        return generateWriteResult('delete', this._colName, false);
      }

      return generateWriteResult('delete', this._colName, true, JSON.parse(result) as SBDocument<Type>);
    } catch (error) {
      this.ERRORLOG(error);
      return generateWriteResult('delete', this._colName, false);
    }
  }

  public async subscribe(callback: (message: SBDocumentMessage<Type>) => void) {
    const subscriber = this._redisClient.duplicate();
    await subscriber.connect();

    await subscriber.subscribe(`${this.path}`, (message: string) => {
      const parsedMsg = JSON.parse(message) as SBDocumentMessage<Type>;
      parsedMsg.col = this._colName;
      callback(parsedMsg);
    });

    return async () => {
      await subscriber.unsubscribe(`${this.path}`);
      await subscriber.disconnect();
    };
  }

  private async publishCreateAction(doc: SBDocument<Type>): Promise<void> {
    const action = {
      type: 'CREATE',
      col: this._colName,
      doc: [doc],
    } as SBDocumentCreateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private async publishUpdateAction(doc: SBDocument<Type>, updates: Partial<Type>): Promise<void> {
    const action = {
      type: 'UPDATE',
      col: this._colName,
      doc: [doc],
      updates: [{ id: doc._id, updates }],
    } as SBDocumentUpdateMessage<Type>;
    await this._redisClient.publish(`${this._path}`, JSON.stringify(action));
    return;
  }

  private ERRORLOG(error: unknown) {
    console.log('SAGEBase SBDocumentRef ERROR: ', error);
  }
}

type WriteResultAction = 'create' | 'update' | 'delete';

function generateWriteResult<Type extends SBJSON>(
  action: WriteResultAction,
  collection: string,
  success: boolean,
  doc?: SBDocument<Type>
): SBDocWriteResult<Type> {
  const result = {
    success,
    writetime: Date.now(),
    doc,
  } as SBDocWriteResult<Type>;
  // only the create and delete actions are logged to limit the amount of logs
  if (success && (action === 'create' || action === 'delete')) {
    SBLogger.log(collection, action, result);
  }
  return result;
}

export function generateSBDocumentTemplate<Type extends SBJSON>(data: Type, by: string): SBDocument<Type> {
  const id = v4();
  const createdAt = Date.now();
  const updatedAt = createdAt;
  const dataCopy = JSON.parse(JSON.stringify(data)) as Type;
  const doc = {
    _id: id,
    _createdAt: createdAt,
    _createdBy: by,
    _updatedAt: updatedAt,
    _updatedBy: by,
    data: { ...dataCopy },
  } as SBDocument<Type>;
  return doc;
}


function serializeNestedChange(change: SBNestedChange) {
  return {
    segments: change.segments,
    absent: change.value === undefined,
    json: JSON.stringify(change.value ?? null),
  };
}
