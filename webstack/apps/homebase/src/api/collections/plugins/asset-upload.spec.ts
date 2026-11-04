import type express from 'express';
import { uploadPluginAsset } from '../../../../../homebase-files/src/api/uploadHandler';
import { AssetsCollection } from '../../../../../homebase-files/src/api/assetsCollection';

jest.mock('../../../../../homebase-files/src/api/assetsCollection', () => ({
  AssetsCollection: {
    metadataFile: jest.fn(),
    processFile: jest.fn(),
    addBatch: jest.fn(),
    deleteAssetFiles: jest.fn(),
  },
}));
jest.mock('../../../../../homebase-files/src/api/messageCollection', () => ({ addUploadMessage: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../../../homebase-files/src/connectors/upload-connector', () => ({
  UploadConnector: {
    getInstance: () => ({ pluginUploadMiddleware: () => (req: unknown, res: unknown, next: () => void) => next() }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (AssetsCollection.metadataFile as jest.Mock).mockResolvedValue({ dateCreated: '0', metadata: '/private/metadata.json' });
  (AssetsCollection.processFile as jest.Mock).mockResolvedValue(undefined);
  (AssetsCollection.addBatch as jest.Mock).mockImplementation(async (assets) =>
    assets.map((data: unknown) => ({ _id: 'new-asset', data })),
  );
});

it('uses native processing and persistence with server-derived room/user and only returns public metadata', async () => {
  const request = {
    user: { id: 'native-user' },
    body: { room: 'foreign-room', user: 'forged-user' },
    header: () => 'foreign-room',
    files: [
      {
        originalname: 'note.txt',
        mimetype: 'text/plain',
        filename: 'stored.txt',
        path: '/private/stored.txt',
        destination: '/private',
        size: 4,
      },
    ],
  } as unknown as express.Request;

  let finish!: (value: unknown) => void;
  const result = new Promise((resolve) => {
    finish = resolve;
  });
  const response = { status: jest.fn().mockReturnThis(), send: finish, json: finish } as unknown as express.Response;

  await uploadPluginAsset(request, response, 'trusted-room');

  expect(await result).toEqual({ id: 'new-asset', name: 'note.txt', mimeType: 'text/plain', size: 4 });
  expect(AssetsCollection.metadataFile).toHaveBeenCalledWith(expect.any(String), 'stored.txt', 'text/plain');
  expect(AssetsCollection.processFile).toHaveBeenCalledWith(
    expect.any(String),
    'stored.txt',
    'text/plain',
    'native-user',
    'note.txt',
    expect.any(String),
    expect.any(String),
    'trusted-room',
  );
  expect(AssetsCollection.addBatch).toHaveBeenCalledWith(
    [expect.objectContaining({ room: 'trusted-room', owner: 'native-user', path: '/private/stored.txt' })],
    'native-user',
  );
});
