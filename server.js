const express = require('express');
const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '16kb' }));

app.get('/practice', (req, res) => res.json({ practice: 6, variant: 10, version: 'independent' }));
app.get('/', (req, res) => res.send('Файлдар REST API қызметі жұмыс істеп тұр'));
app.get('/demo', (req, res) => res.sendFile(require('node:path').join(__dirname, 'demo.html')));
app.get('/info', (req, res) => res.json({
  status: 'ok',
  practice: 6,
  variant: process.env.STUDENT_VARIANT || 'not-set',
  databaseConfigured: Boolean(process.env.DATABASE_URL)
}));

async function listFiles(req, res) {
  const result = await pool.query('SELECT id, name, content_type, size_bytes FROM files ORDER BY id');
  res.json(result.rows);
}
app.get('/api/files', listFiles);
app.get('/files', listFiles);

app.get('/api/files/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!/^\d+$/.test(req.params.id) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(400).json({ error: 'id оң бүтін сан болуы керек' });
  }
  const result = await pool.query(
    'SELECT id, name, content_type, size_bytes FROM files WHERE id = $1', [id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Файл табылмады' });
  res.json(result.rows[0]);
});

app.post('/api/files', async (req, res) => {
  const { name, content_type, size_bytes } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 255 ||
      typeof content_type !== 'string' || !content_type.trim() || content_type.trim().length > 127 ||
      !Number.isInteger(size_bytes) || size_bytes < 0 || size_bytes > 2147483647) {
    return res.status(400).json({ error: 'name, content_type және теріс емес бүтін size_bytes қажет' });
  }
  const result = await pool.query(
    'INSERT INTO files (name, content_type, size_bytes) VALUES ($1, $2, $3) RETURNING id, name, content_type, size_bytes',
    [name.trim(), content_type.trim(), size_bytes]
  );
  res.location(`/api/files/${result.rows[0].id}`).status(201).json(result.rows[0]);
});

app.use((req, res) => res.status(404).json({ error: 'Маршрут табылмады' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON пішімі қате' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Сұраныс көлемі тым үлкен' });
  if (error.code === '23505') return res.status(409).json({ error: 'Мұндай атауы бар файл тіркелген' });
  console.error('DB_QUERY_ERROR', error.code || 'UNKNOWN');
  res.status(503).json({ error: 'Деректер қоры уақытша қолжетімсіз' });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`Сервер ${PORT} портында іске қосылды`));
async function stop() {
  server.close(async () => { await pool.end(); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
