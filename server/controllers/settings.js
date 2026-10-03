const StoreSettings = require('../models/StoreSettings');

async function getOrCreate() {
  let doc = await StoreSettings.findOne();
  if (!doc) doc = await StoreSettings.create({});
  return doc;
}

async function get(req, res, next) {
  try {
    const doc = await getOrCreate();
    return res.json(doc);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const doc = await getOrCreate();
    // Allow partial updates of nested bilingual + currency fields.
    const updatable = ['storeName', 'address', 'hours', 'phone', 'whatsappNumber', 'currency', 'digitStyle', 'social', 'mapEmbedUrl'];
    for (const key of updatable) {
      if (req.body[key] !== undefined) {
        if (typeof req.body[key] === 'object' && req.body[key] !== null && doc[key]) {
          Object.assign(doc[key], req.body[key]);
          if (doc[key] && typeof doc[key].markModified === 'function') doc.markModified(key);
        } else {
          doc[key] = req.body[key];
        }
      }
    }
    await doc.save();
    return res.json(doc);
  } catch (err) {
    return next(err);
  }
}

module.exports = { get, update };
