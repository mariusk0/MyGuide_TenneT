const express = require('express');
const router = express.Router();

router.get('/pdfs/:title', async (req, res) => {
    const client = new Client({ node: 'https://localhost:9200',
    auth: {
      username: 'marius',
      password: 'kottek'
    } });
    const { title } = req.params;
  const result = await client.search({
    index: 'pdfs',
    body: {
      query: {
        match: { title }
      }
    }
  });

  if (result.hits.hits.length === 0) {
    return res.status(404).send('Not found');
  }

  const pdfData = result.hits.hits[0]._source.data; // This is your base64 string
  const buffer = Buffer.from(pdfData, 'base64');

  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=' + title + '.pdf',
    'Content-Length': buffer.length
  });

  res.end(buffer);
});

module.exports = router;
