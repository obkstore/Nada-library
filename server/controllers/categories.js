const Category = require('../models/Category');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

async function list(req, res, next) {
  try {
    const cats = await Category.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    return res.json(cats);
  } catch (err) {
    return next(err);
  }
}

// GET /api/categories/:slug — single category for public category pages (404 if unknown).
async function getBySlug(req, res, next) {
  try {
    const cat = await Category.findOne({ slug: req.params.slug }).lean();
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    return res.json(cat);
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, image, sortOrder } = req.body;
    let slug = slugify(name?.en || name?.ar);
    if (!slug) slug = `category-${Date.now().toString(36)}`;
    // Ensure unique slug
    let candidate = slug;
    let i = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await Category.findOne({ slug: candidate }).lean()) candidate = `${slug}-${i++}`;
    const cat = await Category.create({ name, slug: candidate, image: image || '', sortOrder: sortOrder ?? 0 });
    return res.status(201).json(cat);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const { name, image, sortOrder } = req.body;
    if (name) cat.name = name;
    if (image !== undefined) cat.image = image;
    if (sortOrder !== undefined) cat.sortOrder = sortOrder;
    await cat.save();
    return res.json(cat);
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const Product = require('../models/Product');
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const inUse = await Product.countDocuments({ category: cat._id });
    if (inUse > 0) return res.status(400).json({ message: `Cannot delete: ${inUse} product(s) use this category` });
    const { deleteStored } = require('../config/storage');
    if (cat.image) await deleteStored(cat.image);
    await cat.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, getBySlug, create, update, remove };
