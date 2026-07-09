# SELGRA Website

Static website for SELGRA: Student chapter of the European Low Gravity Research Association.

## Project Knowledge Base

- This is a pure HTML, CSS and JavaScript website for GitHub Pages.
- There is no backend, no real registration and no real authentication.
- `data/opportunities.json` contains only the provided public calls. Feed and events data files are empty unless real items are supplied.
- The Member Area password is configured in `app.js`.
- Member Area state is stored in `localStorage`; it must not be used to protect sensitive data.

## Files

- `index.html` - page structure and public/member sections.
- `styles.css` - responsive public mode and dark Member Mode styling.
- `app.js` - JSON loading, rendering, filters, modals and Member Mode state.
- `data/feed.json` - empty placeholder for supplied public feed cards.
- `data/events.json` - empty placeholder for supplied public events.
- `data/professionals.json` - empty placeholder for supplied professional directory entries.
- `data/opportunities.json` - the provided open calls only, with their source links and quoted descriptions.
- `assets/selgra-hero.png` - generated local hero image.

## Run Locally

Use any static server from the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

This repository is ready for GitHub Pages from the `main` branch and `/` root directory.
Push to `main`, then use repository settings to set Pages source to `Deploy from a branch` if it is not enabled automatically.
