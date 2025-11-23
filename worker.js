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

async function generate() {
    console.log("🤖 Worker started...");

    // Create the folder structure Stremio expects: catalog/movie/
    const dir = './catalog/movie';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    const catalogDefinitions = [];

    for (const recipe of RECIPES) {
        console.log(`   Processing: ${recipe.name}`);
        
        try {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false${recipe.filter}`;
            const response = await axios.get(url);
            const movies = response.data.results;

            const metas = movies.map(m => ({
                id: `tt${m.id}`, 
                type: "movie",
                name: m.title,
                poster: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
                description: m.overview
            }));

            // Write specific file: catalog/movie/genre_id.json
            const fileData = { metas: metas };
            fs.writeFileSync(`${dir}/${recipe.id}.json`, JSON.stringify(fileData));

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

    console.log("✅ Update Complete! sorted files created.");
}

generate();