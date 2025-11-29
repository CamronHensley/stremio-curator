# Project Overview

This project is a Stremio addon that provides curated movie lists. It works by fetching movie data from The Movie Database (TMDB) API, processing it, and generating static JSON files that Stremio can consume. The addon is automatically updated daily using a GitHub Action.

## Key Technologies

*   **Node.js:** The core logic is written in JavaScript and runs on Node.js.
*   **Axios:** Used for making HTTP requests to the TMDB API.
*   **dotenv:** Used for managing environment variables (specifically the TMDB API key).
*   **GitHub Actions:** Used for automating the daily update process.

## Architecture

The project consists of three main parts:

1.  **`worker.js`:** This is the main script that fetches and processes the movie data. It reads "recipes" (pre-defined filters) to create different movie lists, fetches the corresponding data from TMDB, gets the IMDb ID for each movie, and then saves the data to JSON files.
2.  **`manifest.json`:** This file defines the Stremio addon, including its name, description, and the catalogs it provides. This file is updated by the `worker.js` script.
3.  **`.github/workflows/update.yml`:** This GitHub Action workflow automates the process of running the `worker.js` script every day, and committing the updated catalog files back to the repository.

# Building and Running

To run the project locally, you will need to have Node.js installed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file in the root of the project and add your TMDB API key:
    ```
    TMDB_API_KEY=your_api_key_here
    ```

3.  **Run the Worker:**
    ```bash
    node worker.js
    ```

# Development Conventions

*   The core logic is contained in a single file (`worker.js`).
*   Movie categories are defined as "recipes" in the `RECIPES` constant in `worker.js`. To add a new category, you can add a new recipe object to this array.
*   The script is designed to be run from the command line or as part of an automated process.
