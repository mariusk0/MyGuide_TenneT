const cors = require('cors');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');
const app = express();

const upload = multer({ dest: 'uploads/' });

// Disable Certificate Verification , only for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const client = new Client({ 
  node: 'https://localhost:9200',
  auth: {
    username: 'marius',
    password: 'kottek'
  }
});

app.use(cors());

app.post('/upload-pdf', upload.single('pdf-file'), async (req, res) => {
  try {
    // Get data from form
    const pdfFile = req.file;
    const titleU = req.body.titleU;
    const autherU = req.body.autherU;
    const subject = req.body.subject;
    const language = req.body.language;
    const companyUnit = req.body['company-unit'];
    const docType = req.body['doc-type'];
    const docLevel = req.body['doc-level'];

    // Read the PDF file and convert it to base64
    const pdf = fs.readFileSync(pdfFile.path);
    const base64String = Buffer.from(pdf).toString('base64');

    // Delete the file from uploads folder
    fs.unlinkSync(pdfFile.path);

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

    // Index the PDF file
    await client.index({
      index: 'pdfs',
      pipeline: 'attachment',
      body: {
        data: base64String,
        title: titleU,
        auther: autherU,
        subject: subject,
        language: language,
        company_unit: companyUnit,
        doc_type: docType,
        doc_level: docLevel
      }
    });

    res.send({ message: 'PDF uploaded successfully!' });
  } catch (error) {
    console.error(`Error indexing ${req.file.originalname}: ${error}`);
    res.status(500).send({ error: 'Error uploading PDF.' });
  }
});

app.listen(3000, () => console.log('Server started on port 3000'));
