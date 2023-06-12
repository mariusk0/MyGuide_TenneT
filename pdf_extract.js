const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'https://localhost:9200' });

// Replace with the path to your folder containing the PDF files
const pdfDir = '/workspaces/MyGuide_TenneT/PDF Guidelines';

fs.readdir(pdfDir, (err, files) => {
    if (err) {
        return console.error(`Unable to scan directory: ${err}`);
    }

    files.forEach((file) => {
        if (path.extname(file) === '.pdf') {
            let dataBuffer = fs.readFileSync(path.join(pdfDir, file));

            pdfParse(dataBuffer).then((data) => {
                client.index({
                    index: 'pdf-documents',
                    body: {
                        content: data.text
                    }
                }, (err, resp, status) => {
                    if (err) {
                        console.log(`Error indexing document: ${err}`);
                    } else {
                        console.log(`Indexed document from file: ${file}`);
                    }
                });
            });
        }
    });
});
