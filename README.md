# Windsor Cup

Tennis round-robin league tracker. Static site hosted on GitHub Pages with a GitHub Gist as the data store.

## Features

- **Standings** with live ranking (wins → head-to-head → set% → game%)
- **Schedule** with round-by-round accordion and inline result submission
- **Head-to-Head** matrix showing all player matchups
- **Player Profiles** with cross-season stats, win rate, streak, and match history
- **Admin Panel** for season/player/result management (separate admin password)
- Walkover support

## Setup

### 1. Create a GitHub Gist

1. Go to [gist.github.com](https://gist.github.com)
2. Create a **public** gist with one file named `config.json` containing:

```json
{
  "league": { "name": "Windsor Cup" },
  "seasons": [],
  "active_season": null
}
```

3. Note the **Gist ID** from the URL (e.g. `https://gist.github.com/youruser/abc123` → `abc123`)

### 2. Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create a token with **Gists** read/write permission
3. Copy the token

### 3. Generate encrypted config

1. Open `tools/encrypt.html` in your browser
2. Enter your GitHub token, Gist ID, match passphrase, and admin passphrase
3. Copy the generated output into `js/config.js`

### 4. Deploy

Push to a GitHub repo and enable GitHub Pages from the repository settings (deploy from the `main` branch root).

### 5. Create your first season

1. Go to the Admin tab and enter your admin passphrase
2. Create a new season with player names and country codes (e.g. `Javier, ES`)
3. Choose the number of rounds (1 or 2) and match format (best of 1, 3, or 5 sets)
4. The schedule is auto-generated using the round-robin circle method

## Tech Stack

- Vanilla HTML, CSS, JavaScript (ES modules)
- No build step, no dependencies
- GitHub Gist API for data storage
- Web Crypto API (AES-GCM) for passphrase-based token encryption

## Project Structure

```
index.html          Single-page app shell
css/styles.css      Design system and all styles
js/
  app.js            Entry point
  config.js         Gist ID and encrypted token blobs
  router.js         Hash-based SPA router
  api.js            GitHub Gist API layer
  auth.js           AES encryption/decryption and access control
  ranking.js        Ranking engine (tiebreaker logic)
  utils.js          Shared utilities (toast, score formatting, round-robin generation)
  views/
    standings.js    Standings table (clickable player names)
    schedule.js     Schedule accordion with inline result submission
    h2h.js          Head-to-head matrix (clickable player names)
    player.js       Player profile with cross-season stats
    admin.js        Admin panel (seasons, players, results)
assets/
  logo.svg          Crown + tennis ball logo
tools/
  encrypt.html      One-time token encryption setup tool
```
