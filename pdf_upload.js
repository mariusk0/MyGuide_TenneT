// Load enviroment var
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');
const app = express();
const pdfParse = require('pdf-parse');

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


// Create Summery function using openAI API
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const getSummary = async (text) => {
  try {
    
    // get summery from chatGPT
    const response = await openai.createCompletion({
      model: 'text-davinci-003', // choose engine
      prompt: `Please provide a short summary of approximately 60 words, do not mention the title. My document is: ${text}\n`,
      temperature: 1,
      max_tokens: 256, // how long should the summary be
    });

    /* Delete Index
    await client.indices.delete({
      index: 'pdfs',
    }, { ignore: [404] });
    */

    // console.log(response);
    return response.data.choices[0].text;

  } catch (error) {
    console.error("Error with OpenAI API: ", error);
    throw error; // re-throw the error so it can be caught in the route handler
  }
};


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

    // Extract text from PDF
    const data = await pdfParse(pdf);
    const extractedText = data.text;

    // Generate summary using OpenAI GPT-4
    const summary = await getSummary(extractedText);

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
    id: titleU,
    pipeline: 'attachment',
    body: {
      data: base64String,
      title: titleU,
      auther: autherU,
      subject: subject,
      language: language,
      company_unit: companyUnit,
      doc_type: docType,
      doc_level: docLevel,
      summary: summary,
    }
  });

  res.send({ message: 'PDF uploaded successfully!' });
  } catch (error) {
    console.error(`Error indexing ${req.file.originalname}: ${error}`);
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).send({ error: 'Error uploading PDF.' });
    }
  }
});

app.listen(3000, () => console.log('Server started on port 3000'));
