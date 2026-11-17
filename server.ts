import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/extract-evisa', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!rawText) {
      res.status(400).json({ error: 'Please paste UKVI eVisa text before running extraction.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
        code: 'MISSING_API_KEY',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extract structured UKVI eVisa / Right-to-Work fields from the following portal text:\n\n${rawText}`,
        config: {
          systemInstruction:
            'You are a UK Home Office Appendix D Right-to-Work compliance extractor. Extract exact fields from UKVI portal output. Format expiryDate strictly as YYYY-MM-DD. Format shareCode as 9 uppercase alphanumeric characters with no spaces. Classify visaRoute as one of: "Skilled Worker", "Graduate Visa", "Health & Care Worker", "Student Visa", or "Global Talent".',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              visaRoute: {
                type: Type.STRING,
                enum: [
                  'Skilled Worker',
                  'Graduate Visa',
                  'Health & Care Worker',
                  'Student Visa',
                  'Global Talent',
                ],
              },
              expiryDate: {
                type: Type.STRING,
                description: 'Expiry date formatted strictly as YYYY-MM-DD',
              },
              shareCode: {
                type: Type.STRING,
                description: '9-character uppercase alphanumeric UKVI share code without spaces',
              },
              workRestrictions: { type: Type.STRING },
            },
            required: ['fullName', 'visaRoute', 'expiryDate', 'shareCode', 'workRestrictions'],
          },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);
      res.json({
        fullName: String(parsed.fullName ?? '').trim(),
        jobTitle: String(parsed.jobTitle ?? '').trim(),
        visaRoute: String(parsed.visaRoute ?? 'Skilled Worker'),
        expiryDate: String(parsed.expiryDate ?? '').trim(),
        shareCode: String(parsed.shareCode ?? '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase()
          .slice(0, 9),
        workRestrictions: String(parsed.workRestrictions ?? '').trim(),
        sourceEngine: 'gemini',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract eVisa details via Gemini.';
      res.status(502).json({
        error: message,
        code: 'AI_EXTRACTION_FAILED',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SponsorGuard UK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
