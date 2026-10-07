const SupplyList = require('../models/SupplyList');
const Product = require('../models/Product');

// Effective line price: offer price when set, else regular price.
function linePrice(product) {
  if (!product) return 0;
  return product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.price || 0;
}

// Computes regularTotal from CURRENT product prices (effective prices,
// skipping deleted products) in ONE query for all lists (change 5).
// Re-checks bundle validity on every read WITHOUT writing (change: offers):
// stale bundles (bundlePrice >= regularTotal) come back as offerValid=false
// with bundlePrice nulled, so the UI can never show a fake discount.
async function attachTotals(lists) {
  // Accepts ObjectIds AND already-populated product objects (update path).
  const idOf = (p) => String((p && p._id) || p);
  const ids = [...new Set(lists.flatMap((l) => (l.items || []).map((it) => idOf(it.product))))];
  const prods = await Product.find({ _id: { $in: ids } })
    .select('_id name price salePrice images slug stockStatus')
    .lean();
  const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
  return lists.map((l) => {
    const items = (l.items || [])
      .map((it) => ({ ...it, product: byId[idOf(it.product)] || null }))
      .filter((it) => it.product); // skip deleted products (change 6)
    const regularTotal = items.reduce((s, it) => s + linePrice(it.product) * (it.qty || 0), 0);
    const hasBundle = l.bundlePrice != null && Number(l.bundlePrice) > 0;
    const offerValid = hasBundle && Number(l.bundlePrice) < regularTotal;
    return {
      ...l,
      items,
      regularTotal,
      totalPrice: regularTotal, // legacy alias (was the only total before offers)
      // storedBundlePrice is the RAW value (for the admin invalid-offer warning);
      // bundlePrice is nulled whenever the offer is not currently valid.
      storedBundlePrice: l.bundlePrice ?? null,
      bundlePrice: offerValid ? l.bundlePrice : null,
      savings: offerValid ? regularTotal - l.bundlePrice : 0,
      offerValid,
    };
  });
}

async function list(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.featured === 'true') filter.isFeatured = true; // home offers section
    const lists = await SupplyList.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(await attachTotals(lists));
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const found = await SupplyList.findById(req.params.id).lean();
    if (!found) return res.status(404).json({ message: 'Supply list not found' });
    const [withTotal] = await attachTotals([found]);
    return res.json(withTotal);
  } catch (err) {
    return next(err);
  }
}

// Save-time bundle check: bundlePrice must stay below the regular total
// computed from current effective prices (change: offers).
async function checkBundle(items, bundlePrice) {
  if (bundlePrice == null || bundlePrice === '') return null;
  const b = Number(bundlePrice);
  if (!Number.isFinite(b) || b <= 0) return 'bundlePrice must be greater than 0';
  const ids = [...new Set((items || []).map((it) => String(it.product)))];
  const prods = await Product.find({ _id: { $in: ids } }).select('_id price salePrice').lean();
  const byId = Object.fromEntries(prods.map((p) => [String(p._id), p]));
  const total = (items || []).reduce((s, it) => s + linePrice(byId[String(it.product)]) * (it.qty || 0), 0);
  if (!(b < total)) return 'bundlePrice must be less than the regular total';
  return null;
}

async function create(req, res, next) {
  try {
    const errMsg = await checkBundle(req.body.items, req.body.bundlePrice);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const doc = await SupplyList.create(req.body);
    return res.status(201).json(doc);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const doc = await SupplyList.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Supply list not found' });
    // Partial bilingual objects merge (never replace stored ar/en).
    for (const k of ['title', 'school', 'grade']) {
      const incoming = req.body[k];
      if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
        const current = doc[k] || {};
        req.body[k] = {
          ar: current.ar !== undefined ? current.ar : '',
          en: current.en !== undefined ? current.en : '',
          ...incoming,
        };
      }
    }
    // Explicit null/"" on bundlePrice UNSETS the offer (never stores 0/NaN/"").
    const unsetBundle = req.body.bundlePrice === null || (typeof req.body.bundlePrice === 'string' && req.body.bundlePrice.trim() === '');
    if (unsetBundle) delete req.body.bundlePrice;
    // Merged check: items/bundle may come from the body or the stored doc
    // (an unset bundle counts as absent, never as a value).
    const mergedItems = req.body.items !== undefined ? req.body.items : doc.items;
    const mergedBundle = req.body.bundlePrice !== undefined ? req.body.bundlePrice : (unsetBundle ? undefined : doc.bundlePrice);
    const errMsg = await checkBundle(mergedItems, mergedBundle);
    if (errMsg) return res.status(400).json({ message: errMsg });
    Object.assign(doc, req.body);
    await doc.save();
    if (unsetBundle) {
      await SupplyList.updateOne({ _id: doc._id }, { $unset: { bundlePrice: 1 } });
      const fresh = await SupplyList.findById(doc._id).populate('items.product', 'name price salePrice images slug stockStatus').lean();
      const [withTotal] = await attachTotals([fresh]);
      return res.json(withTotal);
    }
    return res.json(doc);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const doc = await SupplyList.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Supply list not found' });
    await doc.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
