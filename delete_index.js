// Load enviroment var
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');
const app = express();
const pdfParse = require('pdf-parse');
const bodyParser = require('body-parser');

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

client.indices.delete({
    index: 'pdfs',
  }, { ignore: [404] });