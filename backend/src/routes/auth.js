const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    const { password: _, ...userWithoutPassword } = user;
    let profile = null;
    if (user.role === 'student') {
      profile = await db.get('SELECT s.*, c.name as class_name, c.grade_level FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?', [user.id]);
    } else if (user.role === 'parent') {
      const children = await db.all('SELECT s.id as student_id, s.student_number, u.name, c.name as class_name FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id WHERE s.parent_id = ?', [user.id]);
      profile = { children };
    }
    res.json({ token, user: userWithoutPassword, profile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const db = await getDb();
    let profile = null;
    if (req.user.role === 'student') {
      profile = await db.get('SELECT s.*, c.name as class_name, c.grade_level FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?', [req.user.id]);
    } else if (req.user.role === 'parent') {
      const children = await db.all('SELECT s.id as student_id, s.student_number, u.name, c.name as class_name FROM students s JOIN users u ON s.user_id = u.id LEFT JOIN classes c ON s.class_id = c.id WHERE s.parent_id = ?', [req.user.id]);
      profile = { children };
    }
    res.json({ user: req.user, profile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
