import { expect, test } from '@jest/globals';

import { SAGEBase, SAGEBaseConfig } from '../lib/core/SAGEBase';

/**
 * SAGEBase Testing File
 * Currently requires a REDIS server to be running on the provided url below
 * Tested a few MOCK Redis libs for testing but non support REDIS v4
 */

const redisUrl = 'redis://localhost:6379';

test('Init SAGEBase without Auth', async () => {
  const config = {
    redisUrl,
    projectName: 'test',
  } as SAGEBaseConfig;
  await SAGEBase.init(config);
  expect(SAGEBase.Database).toBeDefined();
  expect(SAGEBase.PubSub).toBeDefined();
  expect(SAGEBase.Auth).toBeUndefined();
});

test('Create Collection', async () => {
  const config = {
    redisUrl,
    projectName: 'test',
  } as SAGEBaseConfig;
  await SAGEBase.init(config);
  const collection = await SAGEBase.Database.collection('collectionTest');
  expect(collection).toBeDefined();
});

test('Create Collection and Add Doc', async () => {
  const config = {
    redisUrl,
    projectName: 'test',
  } as SAGEBaseConfig;
  await SAGEBase.init(config);
  const collection = await SAGEBase.Database.collection<{ name: string }>('collectionTest', { name: '' });
  const doc = await collection.addDoc({ name: 'test' }, 'me');
  expect(doc).toBeDefined();
  const queryDoc = await collection.query('name', 'test');
  expect(queryDoc[0]._createdBy).toBe('me');
  expect(queryDoc[0].data.name).toBe('test');

  // Clean up collection
  collection.getAllDocRefs().then((docs) => {
    docs.forEach((ref) => ref.delete());
  });
});

test('Create Collection and Add Doc with forced ID', async () => {
  const config = {
    redisUrl,
    projectName: 'test',
  } as SAGEBaseConfig;
  await SAGEBase.init(config);
  const collection = await SAGEBase.Database.collection<{ name: string }>('collectionTest', { name: '' });
  const doc = await collection.addDoc({ name: 'test' }, 'me', '1234');
  expect(doc).toBeDefined();

  const docRef = collection.docRef('1234');
  const docById = await docRef.read();
  expect(docById).toBeDefined();
  expect(docById?._id).toBe('1234');
  expect(docById?._createdBy).toBe('me');
  expect(docById?.data.name).toBe('test');

  // Clean up collection
  collection.getAllDocRefs().then((docs) => {
    docs.forEach((ref) => ref.delete());
  });
});

// NEEDS EXPRESS
// test('Init SAGEBase with Auth', async () => {
//   const config = {
//     projectName: 'test',
//     authConfig: {
//       sessionMaxAge: 1000,
//       sessionSecret: 'test',
//       strategies: {
//         guest: {
//           routeEndpoint: '/auth/guest',
//         } as SBAuthGuestConfig,
//       },
//     } as SBAuthConfig,
//   } as SAGEBaseConfig;
//   await SAGEBase.init(config);
//   expect(SAGEBase.Database).toBeDefined();
//   expect(SAGEBase.Auth).toBeDefined();
// });
