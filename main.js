// Load enviroment var
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');
const pdfParse = require('pdf-parse');
const bodyParser = require('body-parser');
const upload = multer({ dest: 'uploads/' });

const app = express();

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
app.use(express.json());
app.use(express.static('Front_End'));

// User Index
client.indices.create({
  index: 'users',
  body: {
    mappings: {
      properties: {
        username: { type: 'keyword' },
        password: { type: 'keyword' },
        role: { type: 'keyword' }
      }
    }
  }
}, { ignore: [400] });

// Rollensystem ##################################################################################################

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  // Check if user already exists
  const user = await client.search({
    index: 'users',
    body: {
      query: {
        match: { username }
      }
    }
  });
  console.log(user);

  if (user.hits.total.value > 0) {
    return res.status(400).send('User already exists');
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Store user in Elasticsearch
  await client.index({
    index: 'users',
    id: username,
    body: {
      username,
      password: hashedPassword,
      role
    }
  });

  res.send('User created successfully');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Check if user exists
  const user = await client.search({
    index: 'users',
    body: {
      query: {
        match: { username }
      }
    }
  });

  if (user.hits.total.value === 0) {
    return res.status(404).send('User not found');
  }

  // We assume the first hit is the correct user, as usernames should be unique
  const userData = user.hits.hits[0]._source;

  // Check password
  const validPassword = await bcrypt.compare(password, userData.password);
  if (!validPassword) {
    return res.status(401).send('Invalid password');
  }

  // Create JWT token
  const token = jwt.sign({ id: username, role: userData.role }, 'YourSecretKey', {
    expiresIn: 86400 // expires in 24 hours
  });

  res.json({ token });
});

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(403).send('No token provided');

  jwt.verify(token, 'YourSecretKey', (err, decoded) => {
    if (err) return res.status(500).send('Failed to authenticate token');

    // Save user ID and role for use in other routes
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') return res.status(403).send('Requires admin role');
  next();
};


// UPLOAD FUNCTION ###############################################################################################

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
      temperature: 0.9,
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

// Use express.static middleware to serve files from a directory
app.use('/pdfs', express.static('pdfs'));
app.post('/upload-pdf', verifyToken, isAdmin, upload.single('pdf-file'), async (req, res) => {
  try {
    // Get data from form
    const pdfFile = req.file;
    const title = req.body.title;
    const author = req.body.author;
    const subject = req.body.subject;
    const language = req.body.language;
    const company_unit = req.body.company_unit;
    const doc_type = req.body.doc_type;
    const doc_level = req.body.doc_level;

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
    id: title,
    pipeline: 'attachment',
    body: {
      data: base64String,
      title: title,
      author: author,
      subject: subject,
      language: language,
      company_unit: company_unit,
      doc_type: doc_type,
      doc_level: doc_level,
      summary: summary,
      filename: pdfFile.originalname, // for download
      created_at: new Date().toISOString(),
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

// SEARCH FUNCTION ###############################################################################################################
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// date format change function
function formatDate(isoString) {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed in JavaScript
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

app.get('/search', verifyToken, async function(req, res) {
  const query = req.query.query;
  const language = req.query.language;
  const company_unit = req.query.company_unit;
  const subject = req.query.subject;
  const doc_type = req.query.doc_type;
  const doc_level = req.query.doc_level;
  console.log(doc_level);

  try {
    // Normal search
    let filters = [];
    if (doc_level) {
      filters.push({ match: { doc_level: doc_level } });
    }
    if (language) {
      filters.push({ match: { language: language } });
    }
    if (company_unit) {
      filters.push({ match: { company_unit: company_unit } });
    }
    if (subject) {
      filters.push({ match: { subject: subject } });
    }
    if (doc_type) {
      filters.push({ match: { doc_type: doc_type } });
    };

    async function searchDocuments(query, filters) {
      // First, try multi_match
      let response = await client.search({
        index: 'pdfs',
        body: {
          query: {
            bool: {
              must: {
                multi_match: {
                  query: query,
                  fields: ['attachment.content', 'title', 'author', 'subject', 'language', 'company_unit', 'doc_type', 'doc_level'],
                  type: 'best_fields',
                  fuzziness: 'AUTO'
                }
              },
              filter: filters
            }
          }
        }
      });
    
      // If no results from multi_match, try query_string
      if (response && response.hits && response.hits.hits && response.hits.hits.length === 0) {
        response = await client.search({
          index: 'pdfs',
          body: {
            query: {
              bool: {
                must: {
                  query_string: {
                    query: "*" + query + "*",
                    fields: ['attachment.content', 'title', 'author', 'subject', 'language', 'company_unit', 'doc_type', 'doc_level'],
                    default_operator: "AND",
                    fuzziness: 'AUTO'
                  }
                },
                filter: filters
              }
            }
          }
        });
      }
    
      return response;
    }
    
    // Use the search function
    const response = await searchDocuments(query, filters);
    
    //console.log('Response:', JSON.stringify(response, null, 2));
    
    if(response && response.hits && response.hits.hits && response.hits.hits.length > 0) {
      const hits = response.hits.hits;
      const results = hits.map(hit => ({ 
        title: hit._source.title,
        company_unit: hit._source.company_unit,
        summary: hit._source.summary,
        created_at: formatDate(hit._source.created_at),
        author: hit._source.author,
        url: `http://localhost:3000/pdfs/${encodeURIComponent(hit._source.title)}`,
        level: hit._source.doc_level,
      }));
    
    //console.log(results)

      res.json(results);
    } else {
      res.json([]);
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while searching.');
  }
});


// SERVE PDF ###########################################################################################################

app.get('/pdfs/:title', async (req, res) => {
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

app.listen(3000, () => console.log('Server started on port 3000'));