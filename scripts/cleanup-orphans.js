require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Lists (dry run by default) local uploaded files older than 24h that no
// product, category, or settings document references.
// Usage:
//   npm run cleanup-orphans            # dry run: print only
//   npm run cleanup-orphans -- --delete  # actually delete
// NOTE: covers local-disk storage only (dev fallback). Cloudinary orphans
// must be reviewed in the Cloudinary console (Media Library → unattached).
const APPLY = process.argv.includes('--delete');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const Product = require('../models/Product');
  const Category = require('../models/Category');

  const referenced = new Set();
  for (const p of await Product.find({}).select('images').lean()) {
    for (const url of p.images || []) {
      if (url.startsWith('/uploads/')) referenced.add(path.basename(url));
    }
  }
  for (const c of await Category.find({}).select('image').lean()) {
    if (c.image && c.image.startsWith('/uploads/')) referenced.add(path.basename(c.image));
  }

  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) {
    console.log('No local uploads dir — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  const now = Date.now();
  const orphans = [];
  for (const file of fs.readdirSync(dir)) {
    if (file === '.gitkeep') continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    if (referenced.has(file)) continue;
    if (now - stat.mtimeMs < MAX_AGE_MS) continue; // grace period (form may still be open)
    orphans.push(file);
  }

  if (orphans.length === 0) {
    console.log('No orphan uploads found.');
  } else {
    console.log(`${APPLY ? 'Deleting' : 'Found (dry run)'} ${orphans.length} orphan upload(s):`);
    for (const f of orphans) {
      console.log(`  ${APPLY ? '-' : '?'} ${f}`);
      if (APPLY) fs.unlinkSync(path.join(dir, f));
    }
    if (!APPLY) console.log('Re-run with -- --delete to remove them.');
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
