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
    
    console.log(response);

    console.log('Response Body:', response.body);
    console.log('Hits:', response.body.hits);

    if(response.body && response.body.hits && response.body.hits.hits && response.body.hits.hits.length > 0) {
      console.log(JSON.stringify(response.body.hits.hits[0], null, 2));
    } else {
      console.log("No hits found");
    }    
    console.log("Response Body:", JSON.stringify(response.body, null, 2));
    console.log("Hits:", JSON.stringify(response.body.hits, null, 2));

    if (response.body && response.body.hits && response.body.hits.hits.length > 0) {
      const hits = response.body.hits.hits;
      const results = hits.map(hit => ({ 
        title: hit._source.title 
      }));

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