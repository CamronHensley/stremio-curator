require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

// 1. Setup
const TMDB_KEY = process.env.TMDB_API_KEY;
const OUTPUT_FILE = 'catalog.json';

// 2. The "Recipes" - Add your custom rows here!
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

// 3. The Worker
async function generate() {
    console.log("🤖 Worker started...");
    const catalogs = [];

    for (const recipe of RECIPES) {
        console.log(`   Processing: ${recipe.name}`);
        
        try {
            // Fetch from TMDB
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false${recipe.filter}`;
            const response = await axios.get(url);
            const movies = response.data.results;

            // Convert to Stremio Format
            const metas = movies.map(m => ({
                id: `tt${m.id}`, // Note: This is a simplification. Usually needs ID conversion, but TMDB often maps well.
                type: "movie",
                name: m.title,
                poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                description: m.overview
            }));

            catalogs.push({
                id: recipe.id,
                type: "movie",
                name: recipe.name,
                extra: [],
                metas: metas
            });

        } catch (error) {
            console.error(`   Error with ${recipe.name}:`, error.message);
        }
    }

    // 4. Update the Manifest
    const manifest = require('./manifest.json');
    manifest.catalogs = catalogs.map(c => ({
        id: c.id,
        type: "movie",
        name: c.name
    }));

    // Write Files
    fs.writeFileSync('catalog.json', JSON.stringify(catalogs)); // The movie data
    fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2)); // The updated menu

    console.log("✅ Update Complete! catalog.json written.");
}

generate();