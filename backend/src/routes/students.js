const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/students - list all students
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { class_id, search } = req.query;
    let query = `
      SELECT s.*, u.name, u.email, u.phone, u.is_active,
             c.name as class_name, c.grade_level,
             pu.name as parent_name, pu.phone as parent_phone, pu.email as parent_email
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users pu ON s.parent_id = pu.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      query += ' AND s.parent_id = ?';
      params.push(req.user.id);
    }
    if (req.user.role === 'teacher') {
      query += ' AND c.class_teacher_id = ?';
      params.push(req.user.id);
    }
    if (class_id) { query += ' AND s.class_id = ?'; params.push(class_id); }
    if (search) { query += ' AND (u.name LIKE ? OR s.student_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY u.name ASC';

    const students = await db.all(query, params);
    res.json(students);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/students/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const student = await db.get(`
      SELECT s.*, u.name, u.email, u.phone, u.address,
             c.name as class_name, c.grade_level,
             pu.name as parent_name, pu.phone as parent_phone, pu.email as parent_email,
             tu.name as class_teacher_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN users pu ON s.parent_id = pu.id
      LEFT JOIN users tu ON c.class_teacher_id = tu.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const gradesSummary = await db.all(`
      SELECT sub.name as subject, AVG(g.score) as avg_score, MAX(g.recorded_at) as last_recorded
      FROM grades g JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = ? GROUP BY g.subject_id ORDER BY sub.name
    `, [req.params.id]);

    const attSummary = await db.all(`
      SELECT status, COUNT(*) as count FROM attendance
      WHERE student_id = ? AND date >= date('now', '-30 days')
      GROUP BY status
    `, [req.params.id]);

    const warnings = await db.all(`
      SELECT * FROM early_warnings WHERE student_id = ? AND is_resolved = 0
      ORDER BY triggered_at DESC
    `, [req.params.id]);

    res.json({ ...student, gradesSummary, attSummary, warnings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/students
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const db = await getDb();
    const { name, email, student_number, class_id, parent_id, date_of_birth, gender } = req.body;
    if (!name || !email || !student_number) return res.status(400).json({ error: 'Name, email, and student number are required' });

    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const tempPassword = bcrypt.hashSync('password123', 10);
    const userResult = await db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, tempPassword, 'student']);

    const studentResult = await db.run(`
      INSERT INTO students (user_id, student_number, class_id, parent_id, date_of_birth, gender)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userResult.lastID, student_number, class_id || null, parent_id || null, date_of_birth || null, gender || null]);

    res.status(201).json({ id: studentResult.lastID, user_id: userResult.lastID, message: 'Student created successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/students/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const { class_id, parent_id, date_of_birth, gender, status } = req.body;
    await db.run(`
      UPDATE students SET class_id = COALESCE(?, class_id), parent_id = COALESCE(?, parent_id),
      date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender),
      status = COALESCE(?, status) WHERE id = ?
    `, [class_id, parent_id, date_of_birth, gender, status, req.params.id]);

    if (req.body.name || req.body.phone || req.body.address) {
      const student = await db.get('SELECT user_id FROM students WHERE id = ?', [req.params.id]);
      if (student) {
        await db.run('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?',
          [req.body.name, req.body.phone, req.body.address, student.user_id]);
      }
    }
    res.json({ message: 'Student updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
