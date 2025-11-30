const fs = require('fs');

const manifestPath = './public/manifest.json';
const catalogPath = './public/catalog/movie/80s_action.json';

console.log('--- Manifest Content ---');
try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    console.log(JSON.parse(manifestContent));
} catch (error) {
    console.error(`Error reading manifest: ${error.message}`);
}

console.log('\n--- Catalog Content (80s_action) ---');
try {
    const catalogContent = fs.readFileSync(catalogPath, 'utf8');
    console.log(JSON.parse(catalogContent));
} catch (error) {
    console.error(`Error reading catalog: ${error.message}`);
}
