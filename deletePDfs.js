const { Client } = require('@elastic/elasticsearch');
const https = require('https');

// Connect to Elasticsearch
const client = new Client({
    node: 'https://localhost:9200', // Use 'https' instead of 'http'
    auth: {
        username: 'marius',
        password: 'kottek'
    },
    ssl: {
        // This is for self-signed certificates, in production use valid certificates.
        rejectUnauthorized: false
    },
    agent: {
        https: new https.Agent({
            rejectUnauthorized: false
        })
    }
});

async function deletePdfs() {
    try {
        // Define the query to match PDF documents
        const query = {
            query: {
                match: {
                    file_type: 'pdf'
                }
            }
        };
        
        // Execute the delete by query request
        const response = await client.deleteByQuery({
            index: 'pdfs', // Make sure to use the correct index name
            body: query
        });
        
        // Log the response
        console.log(response);
    } catch (error) {
        console.error('Error deleting documents:', error);
    }
}

// Execute the deletePdfs function
deletePdfs();
