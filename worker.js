require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// 1. Setup
const TMDB_KEY = process.env.TMDB_API_KEY;

// 2. The "Recipes"
const RECIPES = [
    {
        id: "80s_action",
        name: "80s Action Hits",
        filter: "&with_genres=28&primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&vote_average.gte=6.5"
    },
    {
        id: "hidden_gems",
        name: "Highly Rated Hidden Gems",
        filter: "&vote_count.gte=100&vote_count.lte=1000&vote_average.gte=7.5"
    }
];

// Helper: Pause for a moment to be polite to the API
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generate() {
    console.log("🤖 Worker started...");

    const dir = './catalog/movie';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    const catalogDefinitions = [];

    for (const recipe of RECIPES) {
        console.log(`   Processing Recipe: ${recipe.name}`);
        
        try {
            // 1. Get the list of movies
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false${recipe.filter}`;
            const response = await axios.get(url);
            const rawMovies = response.data.results;
            const validMetas = [];

            // 2. Loop through each movie to find the Real IMDb ID
            for (const m of rawMovies) {
                try {
                    // Ask TMDB for external IDs
                    const detailsUrl = `https://api.themoviedb.org/3/movie/${m.id}/external_ids?api_key=${TMDB_KEY}`;
                    const details = await axios.get(detailsUrl);
                    const imdbId = details.data.imdb_id;

                    // Only keep it if it has a valid IMDb ID
                    if (imdbId) {
                        validMetas.push({
                            id: imdbId,  // Use the REAL ID (e.g., tt0093773)
                            type: "movie",
                            name: m.title,
                            poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                            description: m.overview
                        });
                        process.stdout.write("."); // Show a dot for progress
                    }
                    
                    // Wait 50ms between calls to avoid rate limits
                    await sleep(50); 

                } catch (err) {
                    // If one movie fails, just skip it
                    continue;
                }
            }
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
    const manifest = require('./manifest.json');
    manifest.catalogs = catalogDefinitions;
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));

    console.log("✅ Update Complete! Real IMDb IDs fetched.");
}

generate();