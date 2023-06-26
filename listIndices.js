const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://localhost:9200' })

async function listIndices() {
  try {
    const response = await client.cat.indices({ format: 'json' });
    console.log(response.body);
  } catch (error) {
    console.error(error);
  }
}

listIndices();
