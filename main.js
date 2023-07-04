// Load environment var
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');
const app = express();
const pdfParse = require('pdf-parse');
const bodyParser = require('body-parser');
const path = require('path');

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const upload = multer({ dest: 'uploads/' });

// Disable Certificate Verification, only for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Role System
const UserRepository = require('./UserRepository');
const userRepository = new UserRepository();

// Set roles
userRepository.setRoles().catch(console.error);

// Create Users
userRepository.createAdmin('admin', '123456').catch(console.error);
userRepository.createUser('user', '123456').catch(console.error);

// Log-In
app.use(session({ secret: 'secret key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'Front_End')));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// In your passport strategy
passport.use(new LocalStrategy(
  async function(username, password, done) {
    try {
      const client = new Client({ node: 'https://localhost:9200' });
      const { body } = await client.security.getUser({ name: username });

      if (!body[username]) {
        console.log('Incorrect username');
        return done(null, false, { message: 'Incorrect username.' });
      }

      const user = body[username];
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        console.log('Incorrect password');
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);

    } catch (error) {
      console.log('Error in passport strategy', error);
      return done(error);
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// Ensure authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login.html');
  }
}

// Routes
app.get('/login', function(req, res) {
  res.sendFile(__dirname + '/login.html');
});

app.get('/index', function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login.html' }),
  function(req, res) {
    res.redirect('/index.html');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/login.html');
});


app.post('/upload-pdf', ensureAuthenticated, upload.single('pdf-file'), async (req, res) => {
// UPLOAD FUNCTION

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

// Use express.static middleware to serve files from a directory
app.use('/pdfs', express.static('pdfs'));

app.post('/upload-pdf', upload.single('pdf-file'), async (req, res) => {
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
});

app.get('/search', ensureAuthenticated, async function(req, res) {
// SEARCH FUNCTION

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

app.get('/search', async function(req, res) {
  const query = req.query.query;
  const language = req.query.language;
  const company_unit = req.query.company_unit
  const subject = req.query.subject
  const doc_type = req.query.doc_type
  const doc_level = req.query.doc_level
  console.log(doc_level)

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


    const response = await client.search({
      index: 'pdfs',
       body: {
        query: {
          bool: {
            must: {
              multi_match: {
                query: query,
                fields: ['attachment.content', 'title', 'author', 'subject', 'language', 'company_unit', 'doc_type', 'doc_level'],
                type: 'best_fields'
              }
           },
          filter: filters
        }
      }
    }
    });

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
});


app.use('/pdfs', express.static('pdfs'));
// SERVE PDF
const pdfHandler = require('./pdfHandler');

app.use(pdfHandler);


app.listen(3000, () => console.log('Server started on port 3000'));