# Windsor Cup

Tennis round-robin league tracker. Static site hosted on GitHub Pages with JSONBin.io as the data store.

## Features

- **Standings** with live ranking (wins → head-to-head → set% → game%)
- **Schedule** with round-by-round accordion and inline result submission
- **Head-to-Head** matrix showing all player matchups
- **Player Profiles** with cross-season stats, win rate, streak, and match history
- **Admin Panel** for season/player/result management (separate admin password)
- Walkover support

## Setup

### 1. Create JSONBin bins

1. Create a [JSONBin.io](https://jsonbin.io) account
2. Create a **config bin** (set to public) with this structure:

```json
{
  "league": { "name": "Windsor Cup", "format": "best_of_3" },
  "seasons": [],
  "active_season": null
}
```

3. Note your **Master API Key** and the **Config Bin ID**

### 2. Generate encrypted keys

1. Open `tools/encrypt.html` in your browser
2. Enter your API key, Config Bin ID, match passphrase, and admin passphrase
3. Copy the generated setup script
4. Deploy the site and paste the script into the browser console on the deployed site

### 3. Deploy

Push to a GitHub repo and enable GitHub Pages from the repository settings (deploy from the `main` branch root).

### 4. Create your first season

1. Go to the Admin tab and enter your admin passphrase
2. Create a new season with player names
3. The schedule is auto-generated using the round-robin circle method

## Tech Stack

- Vanilla HTML, CSS, JavaScript (ES modules)
- No build step, no dependencies
- JSONBin.io v3 API
- Web Crypto API (AES-GCM) for passphrase-based key encryption

## Project Structure

```
index.html          Single-page app shell
css/styles.css      Design system and all styles
js/
  app.js            Entry point
  router.js         Hash-based SPA router
  api.js            JSONBin API layer
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
  encrypt.html      One-time key encryption setup tool
```
