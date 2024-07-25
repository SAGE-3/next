import * as express from 'express';
import * as multer from 'multer';

export function ArticulateRouter() {
  const router = express.Router();
  const baseUrl = 'http://localhost:4024';

  // Set up multer for file handling
  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/uploadcsv', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

      const artiRes = await fetch(`${baseUrl}/api/llm/chart/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!artiRes.ok) throw new Error('Failed to upload CSV');

      const message = {
        success: true,
        data: await artiRes.json(),
      };
      res.status(200).json(message);
    } catch (error) {
      const message = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload CSV',
      };
      res.status(500).json(message);
    }
  });

  router.post('/query', async (req, res) => {
    try {
      console.log('[query] req.body', req.body);
      const { prompt, dataset, skip } = req.body;
      if (!prompt || !dataset) {
        throw new Error('Prompt and dataset are required');
      }

      const body = {
        prompt,
        dataset,
        skip,
      };

      const artiRes = await fetch(`${baseUrl}/api/llm/chart/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!artiRes.ok) throw new Error('Failed to generate chart');

      const message = {
        success: true,
        data: await artiRes.json(),
      };
      res.status(200).json(message);
    } catch (error) {
      const message = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart',
      };
      res.status(500).json(message);
    }
  });

  router.get('/csv/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const artiRes = await fetch(`${baseUrl}/api/llm/chart/csv/${id}`);

      if (!artiRes.ok) throw new Error('Failed to get CSV');

      const message = {
        success: true,
        data: await artiRes.text(),
      };
      res.status(200).json(message);
    } catch (error) {
      const message = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get CSV',
      };
      res.status(500).json(message);
    }
  });

  return router;
}
