const fs = require('fs');
const https = require('https');

const content = fs.readFileSync('frontend/src/lib/speciesData.ts', 'utf8');
const match = content.match(/export const DEPENDENCY_NODES = (\[[\s\S]*?\]) as const/);
const nodes = eval(match[1]);

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
  const photos = {};
  let found = 0;

  for (let i = 0; i < nodes.length; i++) {
    const species = nodes[i];
    const name = species.id;
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=1`;

    try {
      const data = await fetchJSON(url);
      if (data.results && data.results.length > 0) {
        const taxon = data.results[0];
        if (taxon.default_photo && taxon.default_photo.square_url) {
          let photoUrl = taxon.default_photo.square_url;
          // Upgrade to medium size for better quality
          photoUrl = photoUrl.replace('/square', '/medium');
          photos[name] = photoUrl;
          found++;
          console.log(`[${i + 1}/${nodes.length}] ${name} -> OK`);
        } else {
          photos[name] = null;
          console.log(`[${i + 1}/${nodes.length}] ${name} -> no photo`);
        }
      } else {
        photos[name] = null;
        console.log(`[${i + 1}/${nodes.length}] ${name} -> not found`);
      }
    } catch (e) {
      photos[name] = null;
      console.log(`[${i + 1}/${nodes.length}] ${name} -> error: ${e.message}`);
    }

    // Rate limit: ~60 req/min
    if (i < nodes.length - 1) await sleep(600);
  }

  // Generate TypeScript file
  const tsContent = `// Auto-generated species photo URLs from iNaturalist
// ${found}/${nodes.length} species with photos

export const SPECIES_PHOTOS: Record<string, string | null> = ${JSON.stringify(photos, null, 2)};
`;

  fs.writeFileSync('frontend/src/lib/speciesPhotos.ts', tsContent);
  console.log(`\nDone! ${found}/${nodes.length} photos saved to frontend/src/lib/speciesPhotos.ts`);
}

main().catch(console.error);
