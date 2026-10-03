// Seed script — sample catalog for development, base-only bootstrap for deploy.
// Usage:
//   npm run seed                    # full dev seed (products + lists)
//   npm run seed -- --base-only     # admin + categories + settings only (safe bootstrap)
//   npm run seed -- --base-only --force   # required form in production (NODE_ENV=production)
// SAFETY:
// 1. Full sample data only ever targets the "toyshop" dev database.
// 2. Production ALWAYS requires --force and prints the database it will modify.
//    Even with --force, production only runs --base-only (never sample fixtures).
// RE-RUN SAFETY: upserts use $setOnInsert, so manual admin edits are never
// overwritten. Already-existing docs are counted as "skipped".
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizeArabic } = require('../utils/arabicNormalize');

// Extracts the database name from mongodb:// or mongodb+srv:// URIs.
function dbNameFromUri(uri) {
  const m = String(uri || '').match(/\/([^/?]+)(\?.*)?$/);
  return m ? decodeURIComponent(m[1]) : '';
}

async function main() {
  const BASE_ONLY = process.argv.includes('--base-only');
  const FORCE = process.argv.includes('--force');
  const isProd = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  const dbName = dbNameFromUri(uri) || '(none)';

  if (isProd) {
    // Production never receives sample fixtures; base bootstrap needs --force.
    if (!BASE_ONLY) {
      console.error('REFUSING to seed sample data in production (NODE_ENV=production).');
      console.error('Use --base-only --force to bootstrap admin/categories/settings.');
      process.exit(1);
    }
    if (!FORCE) {
      console.error(`REFUSING to touch production database "${dbName}" without --force.`);
      console.error('Re-run with: npm run seed -- --base-only --force');
      process.exit(1);
    }
    console.log(`Production base seed: will modify database "${dbName}".`);
  } else if (!BASE_ONLY && dbName !== 'toyshop') {
    console.error(`REFUSING to seed: full sample data targets "toyshop" only, got "${dbName}".`);
    process.exit(1);
  }

  const Admin = require('../models/Admin');
  const Category = require('../models/Category');
  const Product = require('../models/Product');
  const SupplyList = require('../models/SupplyList');
  const StoreSettings = require('../models/StoreSettings');

  await mongoose.connect(uri);
  console.log(`Connected (seed target database: "${dbName}").`);

  // --- Admin from env (dev defaults only outside production) ---
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('Using default admin credentials (set ADMIN_USERNAME/ADMIN_PASSWORD in .env).');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.updateOne({ username }, { $set: { username, passwordHash } }, { upsert: true });
  console.log(`Admin upserted: ${username}`);

  // --- Categories (managed, not hardcoded) ---
  const categories = [
    { name: { ar: 'قرطاسية', en: 'Stationery' }, slug: 'stationery', sortOrder: 1 },
    { name: { ar: 'ألعاب', en: 'Toys' }, slug: 'toys', sortOrder: 2 },
    { name: { ar: 'كتب', en: 'Books' }, slug: 'books', sortOrder: 3 },
    { name: { ar: 'مستلزمات مدرسية', en: 'School Supplies' }, slug: 'school-supplies', sortOrder: 4 },
    { name: { ar: 'أدوات فنية', en: 'Art Supplies' }, slug: 'art-supplies', sortOrder: 5 },
  ];
  for (const c of categories) {
    // eslint-disable-next-line no-await-in-loop
    await Category.updateOne({ slug: c.slug }, { $set: c }, { upsert: true });
  }
  console.log(`Categories upserted: ${categories.length}`);

  // --- Store settings (new Syrian Pound defaults) ---
  await StoreSettings.updateOne(
    {},
    {
      $setOnInsert: {
        storeName: { ar: 'مكتبة الألعاب والقرطاسية', en: 'Stationery & Toys Library' },
        currency: {
          code: 'SYP',
          name: { ar: 'الليرة السورية', en: 'Syrian Pound' },
          symbol: { ar: 'ل.س', en: 'SYP' },
          decimals: 0,
          symbolPosition: 'after',
        },
        digitStyle: 'western',
      },
    },
    { upsert: true }
  );
  console.log('StoreSettings ensured.');

  if (BASE_ONLY) {
    console.log('Base-only seed done (admin, categories, settings — no products or lists).');
    await mongoose.disconnect();
    return;
  }

  // --- Sample products (realistic new-SYP prices) ---
  // `category` here is the category SLUG, resolved to ObjectId below.
  // NOTE: updateOne() bypasses the pre-validate hook, so searchIndex is
  // computed here with the same normalizeArabic() the model uses.
  const catDocs = await Category.find({}).select('_id slug').lean();
  const catBySlug = Object.fromEntries(catDocs.map((c) => [c.slug, c._id]));

  const PRODUCTS = [
    {
      slug: 'school-notebook-60-pages',
      name: { ar: 'دفتر مدرسي ٦٠ ورقة', en: 'School Notebook 60 Pages' },
      description: {
        ar: 'دفتر مدرسي بغلاف مقوى، ٦٠ ورقة مسطرة، مناسب للصفوف الابتدائية.',
        en: 'Sturdy school notebook with 60 ruled pages, ideal for primary grades.',
      },
      price: 25, category: 'school-supplies', images: [],
      stockStatus: 'in', stockQty: 40, isNewArrival: true,
    },
    {
      slug: 'pencil-box',
      name: { ar: 'مقلمة أقلام', en: 'Pencil Box' },
      description: {
        ar: 'مقلمة قماشية بسحاب، تتسع للأقلام والمسطرة والممحاة.',
        en: 'Zippered fabric pencil box that fits pens, ruler and eraser.',
      },
      price: 60, category: 'stationery', images: [],
      stockStatus: 'in', stockQty: 25, isNewArrival: true,
    },
    {
      slug: 'pencils-box-of-12',
      name: { ar: 'علبة أقلام رصاص ١٢', en: 'Pencils Box of 12' },
      description: {
        ar: 'علبة ١٢ قلم رصاص بجودة عالية وسهلة البري.',
        en: 'Box of 12 high-quality, easy-to-sharpen pencils.',
      },
      price: 30, category: 'stationery', images: [],
      stockStatus: 'in', stockQty: 50, isNewArrival: false,
    },
    {
      slug: 'eraser',
      name: { ar: 'ممحاة', en: 'Eraser' },
      // No description.en on purpose — proves the AR-fallback path.
      description: { ar: 'ممحاة ناعمة لا تترك أثراً وتمسح نظيفاً.', en: '' },
      price: 8, category: 'stationery', images: [],
      stockStatus: 'in', stockQty: 100, isNewArrival: false,
    },
    {
      slug: 'colored-pencils-12',
      name: { ar: 'علبة ألوان خشبية ١٢ لون', en: 'Colored Pencils 12' },
      description: {
        ar: 'علبة ١٢ لون خشبي زاهية وآمنة للأطفال.',
        en: 'Box of 12 bright, child-safe colored pencils.',
      },
      price: 45, category: 'art-supplies', images: [],
      stockStatus: 'in', stockQty: 30, isNewArrival: true,
    },
    {
      slug: 'glue-stick',
      name: { ar: 'أصبع غراء شفاف', en: 'Glue Stick' },
      description: {
        ar: 'أصبع غراء شفاف يلصق الورق بسرعة وبدون فوضى.',
        en: 'Quick-dry, mess-free transparent glue stick for paper.',
      },
      price: 15, category: 'school-supplies', images: [],
      stockStatus: 'in', stockQty: 60, isNewArrival: false,
    },
    {
      slug: 'battery-toy-car',
      name: { ar: 'سيارة لعبة تعمل بالبطارية', en: 'Battery Toy Car' },
      description: {
        ar: 'سيارة لعبة تعمل بالبطارية بألوان جذابة وحركات ممتعة.',
        en: 'Battery-powered toy car with bright colors and fun moves.',
      },
      price: 120, category: 'toys', images: [],
      stockStatus: 'in', stockQty: 12, ageMin: 3, ageMax: 8, isNewArrival: true,
    },
    {
      slug: 'building-blocks-100pcs',
      name: { ar: 'مكعبات تركيب ١٠٠ قطعة', en: 'Building Blocks 100pcs' },
      description: {
        ar: '١٠٠ قطعة مكعبات تركيب ملونة تنمي الإبداع والتركيز.',
        en: '100 colorful building blocks that spark creativity and focus.',
      },
      price: 150, category: 'toys', images: [],
      stockStatus: 'in', stockQty: 10, ageMin: 4, ageMax: 10, isNewArrival: false,
    },
    {
      slug: 'teddy-bear-plush',
      name: { ar: 'دمية دب محشوة', en: 'Teddy Bear Plush' },
      description: {
        ar: 'دب محشو ناعم بحجم متوسط، رفيق محبب للأطفال.',
        en: 'Medium-size soft plush teddy bear, a lovely companion for kids.',
      },
      price: 90, category: 'toys', images: [],
      stockStatus: 'out', stockQty: 0, ageMin: 3, isNewArrival: false,
    },
    {
      slug: 'illustrated-kids-story',
      name: { ar: 'قصة أطفال مصورة', en: 'Illustrated Kids Story' },
      description: {
        ar: 'قصة أطفال مصورة برسوم جميلة وقيم تربوية.',
        en: 'Illustrated children story with lovely pictures and good values.',
      },
      price: 35, category: 'books', images: [],
      stockStatus: 'in', stockQty: 20, ageMin: 5, ageMax: 9, isNewArrival: false,
    },
    {
      slug: 'sketchbook-crayons-set',
      name: { ar: 'دفتر رسم مع أقلام تلوين', en: 'Sketchbook Crayons Set' },
      description: {
        ar: 'دفتر رسم بغلاف جميل مع علبة أقلام تلوين شمعية.',
        en: 'Pretty sketchbook bundled with a box of wax crayons.',
      },
      price: 55, category: 'art-supplies', images: [],
      stockStatus: 'in', stockQty: 18, isNewArrival: false,
    },
    {
      slug: 'ruler-sharpener-scissors-set',
      name: { ar: 'طقم مسطرة وبراية ومقص', en: 'Ruler Sharpener Scissors Set' },
      description: {
        ar: 'طقم مدرسي: مسطرة وبراية ومقص آمن للأطفال.',
        en: 'School set: ruler, sharpener and child-safe scissors.',
      },
      price: 20, category: 'school-supplies', images: [],
      stockStatus: 'out', stockQty: 0, isNewArrival: false,
    },
    {
      // Offer fixture (change: offers) — 25% off, drives the on-sale filter,
      // the home sale strip, and effective-price sorting tests.
      slug: 'kids-backpack',
      name: { ar: 'حقيبة مدرسية للأطفال', en: 'Kids Backpack' },
      description: {
        ar: 'حقيبة مدرسية متينة بجيوب متعددة ورسومات مرحة.',
        en: 'Durable kids backpack with multiple pockets and fun prints.',
      },
      price: 200, salePrice: 150, category: 'school-supplies', images: [],
      stockStatus: 'in', stockQty: 15, isNewArrival: true,
    },
  ];

  // NOTE: updateOne upserts bypass model hooks, so derived fields are set here
  // explicitly (reindex backfills older docs all the same).
  const withDerived = (p) => ({
    ...p,
    category: catBySlug[p.category],
    effectivePrice: p.salePrice != null && p.salePrice > 0 ? p.salePrice : p.price,
    searchIndex: normalizeArabic(
      [p.name.ar, p.name.en, p.description.ar, p.description.en].filter(Boolean).join(' ')
    ),
  });

  let productsCreated = 0;
  let productsSkipped = 0;
  for (const p of PRODUCTS) {
    // eslint-disable-next-line no-await-in-loop
    const r = await Product.updateOne({ slug: p.slug }, { $setOnInsert: withDerived(p) }, { upsert: true });
    if (r.upsertedCount > 0) {
      productsCreated += 1;
      console.log(`  + created product ${p.slug}`);
    } else {
      productsSkipped += 1;
    }
  }
  console.log(`Products: ${productsCreated} created, ${productsSkipped} skipped (already existed, manual edits kept).`);

  // --- Sample supply lists (Grade 3 + featured Grade 1 offer) ---
  // Grade 1 items total 25*2+30+8*2+15+20 = 131; bundle 105 sits clearly below.
  const LISTS = [
    {
      title: { ar: 'مستلزمات الصف الثالث', en: 'Grade 3 Supplies' },
      school: { ar: '', en: '' },
      grade: { ar: 'الصف الثالث', en: 'Grade 3' },
      items: {
        'school-notebook-60-pages': 4,
        'pencil-box': 1,
        'pencils-box-of-12': 2,
        eraser: 2,
        'colored-pencils-12': 1,
        'glue-stick': 1,
      },
      isActive: true,
    },
    {
      title: { ar: 'مستلزمات الصف الأول', en: 'Grade 1 Supplies' },
      school: { ar: '', en: '' },
      grade: { ar: 'الصف الأول', en: 'Grade 1' },
      items: {
        'school-notebook-60-pages': 2,
        'pencils-box-of-12': 1,
        eraser: 2,
        'glue-stick': 1,
        'ruler-sharpener-scissors-set': 1,
      },
      bundlePrice: 105,
      isFeatured: true,
      isActive: true,
    },
  ];

  const neededSlugs = [...new Set(LISTS.flatMap((l) => Object.keys(l.items)))];
  const prods = await Product.find({ slug: { $in: neededSlugs } }).select('_id slug price').lean();
  const prodBySlug = Object.fromEntries(prods.map((p) => [p.slug, p]));
  const missing = neededSlugs.filter((s) => !prodBySlug[s]);
  if (missing.length > 0) throw new Error('Seed products missing for supply list: ' + missing.join(', '));

  let listsCreated = 0;
  let listsSkipped = 0;
  for (const l of LISTS) {
    const listDoc = {
      title: l.title,
      school: l.school,
      grade: l.grade,
      items: Object.entries(l.items).map(([s, qty]) => ({ product: prodBySlug[s]._id, qty })),
      ...(l.bundlePrice !== undefined ? { bundlePrice: l.bundlePrice } : {}),
      ...(l.isFeatured !== undefined ? { isFeatured: l.isFeatured } : {}),
      isActive: l.isActive,
    };
    // eslint-disable-next-line no-await-in-loop
    const lr = await SupplyList.updateOne(
      { 'title.ar': listDoc.title.ar },
      { $setOnInsert: listDoc },
      { upsert: true }
    );
    if (lr.upsertedCount > 0) {
      listsCreated += 1;
      console.log(`  + created list ${listDoc.title.en}`);
    } else {
      listsSkipped += 1;
    }
  }
  console.log(`Supply lists: ${listsCreated} created, ${listsSkipped} skipped (already existed, manual edits kept).`);

  console.log('Seed done. Next: npm run reindex');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
