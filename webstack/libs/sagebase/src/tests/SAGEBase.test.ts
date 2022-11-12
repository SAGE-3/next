import { expect, test, describe, it } from '@jest/globals';
import { SAGEBase, SAGEBaseConfig, SBAuthConfig, SBAuthSchema } from '../lib/core/SAGEBase';
// Express web server framework
const express = require('express');
import { SBAuthGuestConfig } from '../lib/modules/auth/adapters';
const cookieParser = require('cookie-parser');
const request = require('supertest');
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

test('SAGEBase Guest Authentication', async () => {
  const app = express();
  app.enable('trust proxy');
  app.use(express.json());
  app.use(cookieParser());
  const config = {
    projectName: 'test',
    authConfig: {
      sessionMaxAge: 604800000,
      sessionSecret: 'SUPERSECRET!!$$',
      strategies: {
        guestConfig: {
          routeEndpoint: '/auth/guest',
        } as SBAuthGuestConfig,
      },
    } as SBAuthConfig,
  } as SAGEBaseConfig;
  await SAGEBase.init(config, app);
  expect(SAGEBase.Auth).toBeDefined();
  const response = await request(app)
    .post('/auth/guest')
    .type('form')
    .send({ username: 'guest-username', password: 'guest-pass' })
    .set('Accept', 'application/json')
    .set('Content-Type', 'application/json');
  const cookie = response.header['set-cookie'];
  expect(response.status).toEqual(302);
  expect(response.header['set-cookie']).toBeDefined();
  expect(response.headers['location']).toEqual('/');
  const authRes = await request(app).get('/auth/verify').set('Cookie', cookie);
  const authBody = authRes.body;
  const auth = authBody.auth as SBAuthSchema;
  console.log(auth);
  expect(authRes.status).toEqual(200);
  expect(authBody.success).toEqual(true);
  expect(authBody.authentication).toEqual(true);
  expect(auth).toBeDefined();
  expect(auth.provider).toEqual('guest');
});
