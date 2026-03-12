const express = require('express');
const { getDb } = require('../database/db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/messages
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { type } = req.query;
    const isInbox = type !== 'sent';
    const query = `
      SELECT m.*, su.name as sender_name, su.role as sender_role,
             ru.name as receiver_name, ru.role as receiver_role
      FROM messages m
      JOIN users su ON m.sender_id = su.id
      JOIN users ru ON m.receiver_id = ru.id
      WHERE ${isInbox ? 'm.receiver_id' : 'm.sender_id'} = ?
      ORDER BY m.created_at DESC
    `;
    res.json(await db.all(query, [req.user.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/messages
router.post('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { receiver_id, subject, content } = req.body;
    if (!receiver_id || !content) return res.status(400).json({ error: 'receiver_id and content required' });

    const receiver = await db.get('SELECT id FROM users WHERE id = ?', [receiver_id]);
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

    const result = await db.run(
      'INSERT INTO messages (sender_id, receiver_id, subject, content) VALUES (?, ?, ?, ?)',
      [req.user.id, receiver_id, subject || null, content]
    );

    await db.run(
      'INSERT INTO notifications (user_id, title, message, type, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?)',
      [receiver_id, `New message from ${req.user.name}`, subject || content.substring(0, 60), 'info', 'message', result.lastID]
    );
    res.status(201).json({ id: result.lastID, message: 'Message sent' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/messages/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('UPDATE messages SET is_read = 1 WHERE id = ? AND receiver_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/messages/contacts
router.get('/contacts', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let roles = [];
    if (req.user.role === 'parent') roles = ['teacher', 'admin', 'counselor'];
    else if (req.user.role === 'teacher') roles = ['admin', 'parent', 'counselor', 'teacher'];
    else if (req.user.role === 'admin') roles = ['teacher', 'parent', 'counselor', 'student', 'admin'];
    else if (req.user.role === 'counselor') roles = ['admin', 'teacher', 'parent'];
    else if (req.user.role === 'student') roles = ['teacher', 'counselor'];

    if (roles.length === 0) return res.json([]);
    const placeholders = roles.map(() => '?').join(',');
    const contacts = await db.all(
      `SELECT id, name, email, role FROM users WHERE role IN (${placeholders}) AND id != ? AND is_active = 1 ORDER BY name`,
      [...roles, req.user.id]
    );
    res.json(contacts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
