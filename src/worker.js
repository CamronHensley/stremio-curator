require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// 1. Setup
const TMDB_KEY = process.env.TMDB_API_KEY;

const tmdb = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    params: {
        api_key: TMDB_KEY,
        language: 'en-US'
    }
});


// 2. The "Recipes"
const RECIPES = require('./recipes.json');

// Helper: Pause for a moment to be polite to the API
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch a single IMDb ID
async function getImdbId(tmdbId) {
    try {
        const response = await tmdb.get(`/movie/${tmdbId}/external_ids`);
        return response.data.imdb_id;
    } catch (err) {
        // If one movie fails, just return null
        return null;
    }
}

// Helper: Process movies in chunks to respect rate limits
async function processInChunks(movies, chunkSize = 20, delay = 5000) {
    const allImdbIds = {}; // Use a map for quick lookups
    for (let i = 0; i < movies.length; i += chunkSize) {
        const chunk = movies.slice(i, i + chunkSize);
        const promises = chunk.map(m => getImdbId(m.id));
        const chunkResults = await Promise.all(promises);
        
        chunk.forEach((movie, index) => {
            if (chunkResults[index]) {
                allImdbIds[movie.id] = chunkResults[index];
            }
        });

        if (i + chunkSize < movies.length) {
            await sleep(delay); // Wait before the next chunk
        }
    }
    return allImdbIds;
}

async function generate() {
    console.log("🤖 Worker started...");

    const dir = './public/catalog/movie';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    const catalogDefinitions = [];
    // DIAGNOSTIC CHECK
    console.log(`TMDB Key Loaded: ${TMDB_KEY ? 'Yes' : 'No'}`);

    for (const recipe of RECIPES) {
        console.log(`   Processing Recipe: ${recipe.name}`);
        
        try {
            // 1. Get the list of movies
            const response = await tmdb.get(`/discover/movie?sort_by=popularity.desc&include_adult=false${recipe.filter}`);
            const rawMovies = response.data.results;
            
            console.log(`      Found ${rawMovies.length} movies. Fetching IMDb IDs in chunks...`);
            const imdbIdsMap = await processInChunks(rawMovies);
            
            // 2. Filter movies and build metadata
            const validMetas = rawMovies
                .filter(m => imdbIdsMap[m.id]) // Keep only movies where we found an IMDb ID
                .map(m => {
                    process.stdout.write("."); // Show a dot for progress
                    return {
                        id: imdbIdsMap[m.id],
                        type: "movie",
                        name: m.title,
                        poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                        description: m.overview
                    };
                });
            
            console.log(" Done!");

            // 3. Save the Files (Standard + Stremio Skip Path)
            const fileData = { metas: validMetas };
            
            fs.writeFileSync(`${dir}/${recipe.id}.json`, JSON.stringify(fileData));

            const skipDir = `${dir}/${recipe.id}`;
            if (!fs.existsSync(skipDir)){
                fs.mkdirSync(skipDir, { recursive: true });
            }
            fs.writeFileSync(`${skipDir}/skip=0.json`, JSON.stringify(fileData));

            catalogDefinitions.push({
                id: recipe.id,
                type: "movie",
                name: recipe.name
            });

        } catch (error) {
            console.error(`   Error with ${recipe.name}:`, error.message);
        }
    }

    // Update Manifest
    const manifest = require('../public/manifest.json');
    manifest.catalogs = catalogDefinitions;
    fs.writeFileSync('public/manifest.json', JSON.stringify(manifest, null, 2));

    console.log("✅ Update Complete! Real IMDb IDs fetched.");
}

generate();

// Force update fix for Stremio structure