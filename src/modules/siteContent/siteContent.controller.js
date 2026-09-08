const prisma = require('../../config/db');
const { ok } = require('../../utils/respond');

async function getAll(req, res) {
  const rows = await prisma.siteContent.findMany({ orderBy: { key: 'asc' } });
  const content = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  ok(res, content);
}

async function upsert(req, res) {
  const { key } = req.params;
  const { value } = req.body;
  const row = await prisma.siteContent.upsert({
    where: { key },
    update: { value, updatedByUserId: req.user.id },
    create: { key, value, updatedByUserId: req.user.id },
  });
  ok(res, row);
}

module.exports = { getAll, upsert };
