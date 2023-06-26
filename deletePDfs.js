const { Client } = require('@elastic/elasticsearch');

// Connect to Elasticsearch
const client = new Client({
    node: 'http://localhost:9200'
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
            index: 'your-index',
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
