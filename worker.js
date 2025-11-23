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

    // Ensure main folder exists
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

            const fileData = { metas: metas };

            // --- THE STREMIO FIX ---
            
            // 1. Save the standard file: catalog/movie/id.json
            fs.writeFileSync(`${dir}/${recipe.id}.json`, JSON.stringify(fileData));

            // 2. Save the "skip" file: catalog/movie/id/skip=0.json
            // We have to make a folder named after the ID first!
            const skipDir = `${dir}/${recipe.id}`;
            if (!fs.existsSync(skipDir)){
                fs.mkdirSync(skipDir, { recursive: true });
            }
            fs.writeFileSync(`${skipDir}/skip=0.json`, JSON.stringify(fileData));

            // -----------------------

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

    console.log("✅ Update Complete! Files created in both paths.");
}

generate();