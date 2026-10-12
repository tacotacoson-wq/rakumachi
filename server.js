import express from 'express';
import { fileURLToPath } from 'node:url';
import { scrape, safeUrl, SOURCE } from './lib/scraper.js';
import { demo } from './lib/demo.js';
const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
let job = null;
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.post('/api/run', (req, res) => {
  if (job?.status === 'running') return res.status(409).json({ error: '取得処理を実行中です。完了までお待ちください。' });
  const { threshold = 10, pages = 1, limit = 20, mode = 'live', sourceUrl = SOURCE } = req.body;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100 || !Number.isInteger(pages) || pages < 1 || pages > 5 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !['live','demo'].includes(mode)) return res.status(400).json({ error: '利回り0〜100%、ページ数1〜5、物件数1〜100で指定してください。' });
  try { safeUrl(sourceUrl); } catch (e) { return res.status(400).json({ error: e.message }); }
  job = { id: crypto.randomUUID(), status: 'running', progress: '準備中', threshold, mode, startedAt: new Date().toISOString() };
  const current = job;
  res.status(202).json(current);
  (async () => {
    try {
      const result = mode === 'demo' ? { properties: demo(), errors: [], discovered: 3, capped: false, sourceUrl } : await scrape({ sourceUrl, pages, limit }, msg => current.progress = msg);
      Object.assign(current, result, { status: 'done', progress: '完了', finishedAt: new Date().toISOString() });
    } catch (e) { Object.assign(current, { status: 'failed', error: e.message }); }
  })();
});
app.get('/api/job/:id', (req, res) => job?.id === req.params.id ? res.json(job) : res.status(404).json({ error: '処理が見つかりません。' }));
app.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('Rakumachi app listening on port ' + (process.env.PORT || 3000)));
