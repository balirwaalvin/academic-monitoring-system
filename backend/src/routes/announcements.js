const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/announcements
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const announcements = await db.all(`
      SELECT a.*, u.name as created_by_name
      FROM announcements a JOIN users u ON a.created_by = u.id
      WHERE a.is_active = 1
        AND (a.target_roles = 'all' OR a.target_roles LIKE ?)
        AND (a.expires_at IS NULL OR a.expires_at > date('now'))
      ORDER BY a.created_at DESC
    `, [`%${req.user.role}%`]);
    res.json(announcements);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/announcements/all (admin)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const announcements = await db.all(`
      SELECT a.*, u.name as created_by_name FROM announcements a
      JOIN users u ON a.created_by = u.id ORDER BY a.created_at DESC
    `);
    res.json(announcements);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/announcements
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const { title, content, target_roles, priority, expires_at } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const result = await db.run(`
      INSERT INTO announcements (title, content, created_by, target_roles, priority, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, content, req.user.id, target_roles || 'all', priority || 'normal', expires_at || null]);
    res.status(201).json({ id: result.lastID, message: 'Announcement created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/announcements/:id
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { title, content, target_roles, priority, is_active, expires_at } = req.body;
    await db.run(`
      UPDATE announcements SET title = COALESCE(?, title), content = COALESCE(?, content),
      target_roles = COALESCE(?, target_roles), priority = COALESCE(?, priority),
      is_active = COALESCE(?, is_active), expires_at = COALESCE(?, expires_at)
      WHERE id = ?
    `, [title, content, target_roles, priority, is_active, expires_at, req.params.id]);
    res.json({ message: 'Announcement updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE announcements SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Announcement removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
