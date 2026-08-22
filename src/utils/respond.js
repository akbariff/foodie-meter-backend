function ok(res, data, message, status = 200) {
  res.status(status).json({ success: true, data, ...(message ? { message } : {}) });
}

function created(res, data, message) {
  ok(res, data, message, 201);
}

module.exports = { ok, created };
