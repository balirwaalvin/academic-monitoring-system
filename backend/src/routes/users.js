const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/users - admin only
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { role, search } = req.query;
    let query = 'SELECT id, name, email, role, phone, address, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY role, name';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, password, role, phone, address } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'Name, email, and role required' });
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already exists' });
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email.toLowerCase().trim(), hashedPassword, role, phone || null, address || null]
    );
    res.status(201).json({ id: result.lastID, message: 'User created. Default password: password123' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: "Cannot update another user's profile" });
    }
    const db = await getDb();
    const { name, phone, address } = req.body;
    await db.run(
      'UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), address=COALESCE(?,address) WHERE id=?',
      [name, phone, address, req.params.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id/password
router.put('/:id/password', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: "Cannot change another user's password" });
    }
    const db = await getDb();
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.params.id]);
    if (req.user.role !== 'admin') {
      if (!current_password || !bcrypt.compareSync(current_password, user.password)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }
    await db.run('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(new_password, 10), req.params.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id/toggle-active
router.put('/:id/toggle-active', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT is_active FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await db.run('UPDATE users SET is_active=? WHERE id=?', [user.is_active ? 0 : 1, req.params.id]);
    res.json({ message: `User ${user.is_active ? 'deactivated' : 'activated'}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
