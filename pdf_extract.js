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

async function run() {
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
  fs.readdirSync(pdfDir).forEach(file => {
    if (file.endsWith('.pdf')) {
      // Read the PDF file and convert it to base64
      const pdf = fs.readFileSync(`${pdfDir}/${file}`);
      const base64String = Buffer.from(pdf).toString('base64');

      // Index the PDF file
      client.index({
        index: 'pdfs',
        pipeline: 'attachment',
        body: {
          data: base64String,
          title: file // For example, we can use file name as the title of the document
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
}
