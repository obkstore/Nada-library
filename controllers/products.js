const mongoose = require('mongoose');
const Product = require('../models/Product');
const { normalizeArabic, escapeRegExp } = require('../utils/arabicNormalize');
const { deleteStored } = require('../config/storage');

// GET /api/products?search&category&minPrice&maxPrice&ageMin&ageMax&inStock&isNewArrival&onSale&sort&page&limit
// All query params are optional; filtered URLs are shareable (client keeps them in the address bar).
// Price sorting + min/max filters run on effectivePrice (offer price when set, else price).
async function list(req, res, next) {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      ageMin,
      ageMax,
      inStock,
      isNewArrival,
      onSale,
      sort,
      page = '1',
      limit = '12',
    } = req.query;

    const filter = {};
    if (category) filter.category = category; // accepts category id or slug (resolved below)
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.effectivePrice = {};
      if (minPrice !== undefined && minPrice !== '') filter.effectivePrice.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') filter.effectivePrice.$lte = Number(maxPrice);
    }
    if (ageMin !== undefined && ageMin !== '') filter.ageMin = { $gte: Number(ageMin) };
    if (ageMax !== undefined && ageMax !== '') filter.ageMax = { $lte: Number(ageMax) };
    if (inStock === 'true') filter.stockStatus = 'in';
    else if (inStock === 'false') filter.stockStatus = 'out';
    if (isNewArrival === 'true') filter.isNewArrival = true;
    // Offer filter (change: offers) — evaluated against live values, not trust.
    if (onSale === 'true') {
      filter.$expr = { $and: [{ $gt: ['$salePrice', 0] }, { $lt: ['$salePrice', '$price'] }] };
    }

    // Resolve category slug -> id
    if (filter.category && !String(filter.category).match(/^[a-f0-9]{24}$/i)) {
      const Category = require('../models/Category');
      const cat = await Category.findOne({ slug: filter.category }).lean();
      filter.category = cat ? cat._id : null; // null matches nothing
      if (!cat) return res.json({ data: [], total: 0, page: 1, pages: 0 });
    }

    // Arabic-tolerant search on the precomputed searchIndex.
    // escapeRegExp prevents regex injection from user input (change #5).
    if (search && String(search).trim()) {
      const norm = normalizeArabic(search);
      filter.searchIndex = { $regex: escapeRegExp(norm), $options: 'i' };
    }

    let sortSpec = { createdAt: -1 };
    if (sort === 'price-asc') sortSpec = { effectivePrice: 1 };
    else if (sort === 'price-desc') sortSpec = { effectivePrice: -1 };
    else if (sort === 'newest') sortSpec = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 12));
    const total = await Product.countDocuments(filter);
    const data = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(sortSpec)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.json({ data, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/new — flagged as new arrival OR added in the last 30 days.
async function newArrivals(req, res, next) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const data = await Product.find({
      $or: [{ isNewArrival: true }, { createdAt: { $gte: thirtyDaysAgo } }],
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(24)
      .lean();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

// GET /api/products/:slugOrId — single product by slug OR Mongo ID
// (client route: /:lang/products/:slug; ID fallback helps admin tooling).
async function getBySlugOrId(req, res, next) {
  try {
    const key = req.params.slugOrId;
    let product = await Product.findOne({ slug: key })
      .populate('category', 'name slug')
      .lean();
    if (!product && mongoose.Types.ObjectId.isValid(key)) {
      product = await Product.findById(key).populate('category', 'name slug').lean();
    }
    if (!product) return res.status(404).json({ message: 'Product not found' });
    return res.json(product);
  } catch (err) {
    return next(err);
  }
}

// Offer rule (change: offers): salePrice must be > 0 and < price, checked
// against MERGED values (request body + stored doc) so partial PUTs that
// lower the price below the sale price are rejected with a clear 400.
function checkSaleRule(price, salePrice) {
  if (salePrice == null || salePrice === '') return null; // no offer — always fine
  const s = Number(salePrice);
  const p = Number(price);
  if (!Number.isFinite(s) || s <= 0) return 'salePrice must be greater than 0';
  if (!Number.isFinite(p) || s >= p) return 'salePrice must be less than price';
  return null;
}

async function create(req, res, next) {
  try {
    const errMsg = checkSaleRule(req.body.price, req.body.salePrice);
    if (errMsg) return res.status(400).json({ message: errMsg });
    const product = await Product.create(req.body);
    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const removedImages = [];
    // Track images removed from the array so files can be deleted from storage.
    if (Array.isArray(req.body.images)) {
      const before = new Set(product.images || []);
      const after = new Set(req.body.images);
      for (const url of before) if (!after.has(url)) removedImages.push(url);
    }
    delete req.body.slug; // silently ignored — slug is immutable after creation
    // Merged offer validation BEFORE save (change 2: offers).
    const mergedPrice = req.body.price !== undefined ? req.body.price : product.price;
    const mergedSale = req.body.salePrice !== undefined ? req.body.salePrice : product.salePrice;
    const errMsg = checkSaleRule(mergedPrice, mergedSale);
    if (errMsg) return res.status(400).json({ message: errMsg });
    Object.assign(product, req.body);
    await product.save(); // triggers searchIndex + slug-uniqueness hooks
    // Removed files are deleted only AFTER the save succeeds.
    for (const url of removedImages) await deleteStored(url);
    return res.json(product);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    for (const url of product.images || []) await deleteStored(url);
    await product.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, newArrivals, getBySlugOrId, create, update, remove };
