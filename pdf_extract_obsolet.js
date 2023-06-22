async function run() {
  // Your previous code goes here...

  // Disable Certificate Verification , only for development
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const fs = require('fs');
  const { Client } = require('@elastic/elasticsearch')

  const client = new Client({ 
    node: 'https://localhost:9200',
    auth: {
      username: 'marius',
      password: 'kottek'
    },
  });

  // Delete the index if it exists
  await client.indices.delete({
    index: 'pdfs',
  }, { ignore: [404] });

/
  // Create the ingest pipeline
  await client.ingest.putPipeline({
    id: 'attachment',
    body: {
      description: 'Extract attachment information',
      processors: [{
        attachment: {
          field: 'data'
        }
      }]
    }
  });

  // Path containing PDFs
  const pdfDir = 'PDF_Guidelines';

  // Read all files from the directory
  const promises = fs.readdirSync(pdfDir).map(file => {
    if (file.endsWith('.pdf')) {
      // Read the PDF file and convert it to base64
      const pdf = fs.readFileSync(`${pdfDir}/${file}`);
      const base64String = Buffer.from(pdf).toString('base64');

      // Index the PDF file
      return client.index({
        index: 'pdfs',
        id: file, // Use the filename as the _id of the document
        pipeline: 'attachment',
        body: {
          data: base64String,
          title: file // Use file name as the title of the document
        }
      }, (err, resp) => {
        if (err) {
          console.error(`Error indexing ${file}: ${err}`);
        } else {
          console.log(`Indexed ${file}`);
        }
      });
    }
  });

  await Promise.all(promises).catch((err) => {
    console.error(`Error indexing ${file}: ${err}`);
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const response = await client.search({
      index: 'pdfs',
      body: {
        query: {
          match_all: {}
        }
      }
    });

    console.log(response);

    if (response && response.hits && response.hits.total.value > 0) {
      console.log(`Found ${response.hits.total.value} documents.`);
      response.hits.hits.forEach(hit => {
        console.log(`Document: ${hit._source.title}`);
      });
    } else {
      console.log('No documents found or an error occurred while fetching documents.');
    }
  } catch(error) {
    console.error('An error occurred:', error);
  }
*/
}


run().catch(console.log);