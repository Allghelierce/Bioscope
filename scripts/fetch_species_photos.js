const fs = require('fs');
const https = require('https');
const path = require('path');

const MASTER_SPECIES_PATH = 'frontend/src/lib/masterSpecies.json';
const OUTPUT_PATH = 'frontend/public/data/species-photos.json';

if (!fs.existsSync(MASTER_SPECIES_PATH)) {
  console.error('masterSpecies.json not found. Run process_data.py first.');
  process.exit(1);
}

const masterSpecies = JSON.parse(fs.readFileSync(MASTER_SPECIES_PATH, 'utf8'));
const speciesNames = Object.keys(masterSpecies);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'BioScope/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Parse error')); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Load existing photos to avoid re-fetching
  let photos = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try { photos = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')); }
    catch (e) { console.warn('Could not read existing photos, starting fresh.'); }
  }

  let found = 0;
  let skipped = 0;

  console.log(`Expansion starting: 0/${speciesNames.length} species checked`);

  for (let i = 0; i < speciesNames.length; i++) {
    const name = speciesNames[i];
    
    // Skip if we already have a URL or have explicitly marked as null
    if (photos[name] !== undefined && photos[name] !== null) {
      skipped++;
      found++;
      continue;
    }

    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=1`;

    try {
      const data = await fetchJSON(url);
      if (data.results && data.results.length > 0) {
        const taxon = data.results[0];
        if (taxon.default_photo && taxon.default_photo.square_url) {
          let photoUrl = taxon.default_photo.square_url;
          photoUrl = photoUrl.replace('/square', '/medium');
          photos[name] = photoUrl;
          found++;
          if (i % 5 === 0) console.log(`[${i + 1}/${speciesNames.length}] ${name} -> OK`);
        } else {
          photos[name] = null;
        }
      } else {
        photos[name] = null;
      }
    } catch (e) {
      console.log(`[${i + 1}/${speciesNames.length}] ${name} -> error: ${e.message}`);
    }

    // Rate limit: ~150ms between requests is safe for iNat API if sequential
    await sleep(150);
    
    // Periodically save progress
    if (i % 20 === 0) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photos, null, 2));
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photos, null, 2));
  console.log(`\nDone! ${found}/${speciesNames.length} photos ready in ${OUTPUT_PATH} (${skipped} skipped)`);
}

main().catch(console.error);
