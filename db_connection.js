const cors = require('cors');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //turn off ssl, only for development

const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@elastic/elasticsearch')

const app = express();
const client = new Client({ 
  node: 'https://localhost:9200',
  auth: {
    username: 'marius',
    password: 'kottek'
  }
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/search', async function(req, res) {
  const query = req.query.query;
  try {
    const response = await client.search({
      index: 'pdfs',
      body: {
        query: {
          match: { 'attachment.content': query }
        },
      }
    });
    
    if(response && response.hits && response.hits.hits && response.hits.hits.length > 0) {
      const hits = response.hits.hits;
      const results = hits.map(hit => ({ 
        title: hit._source.title 
      }));
    
    console.log(results)

      res.json(results);
    } else {
      res.json([]);
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while searching.');
  }
});

app.listen(3000, () => console.log('Server listening on port 3000'));
