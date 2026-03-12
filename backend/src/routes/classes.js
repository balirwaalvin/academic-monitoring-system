const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/classes
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const classes = await db.all(`
      SELECT c.*, u.name as teacher_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id=c.id AND s.status='active') as student_count
      FROM classes c LEFT JOIN users u ON c.class_teacher_id=u.id
      ORDER BY c.grade_level, c.name
    `);
    res.json(classes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/classes/subjects/all
router.get('/subjects/all', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const subjects = await db.all(`
      SELECT s.*, c.name as class_name, u.name as teacher_name
      FROM subjects s LEFT JOIN classes c ON s.class_id=c.id LEFT JOIN users u ON s.teacher_id=u.id
      ORDER BY c.name, s.name
    `);
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/classes/:id/subjects
router.get('/:id/subjects', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const subjects = await db.all(`
      SELECT s.*, u.name as teacher_name FROM subjects s
      LEFT JOIN users u ON s.teacher_id=u.id WHERE s.class_id=?
    `, [req.params.id]);
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/classes/:id/students
router.get('/:id/students', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all(`
      SELECT st.*, u.name, u.email
      FROM students st JOIN users u ON st.user_id=u.id
      WHERE st.class_id=? AND st.status='active' ORDER BY u.name
    `, [req.params.id]);
    res.json(students);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/classes
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { name, grade_level, class_teacher_id, room, academic_year } = req.body;
    if (!name || !grade_level) return res.status(400).json({ error: 'Name and grade level required' });
    const result = await db.run(
      'INSERT INTO classes (name, grade_level, class_teacher_id, room, academic_year) VALUES (?, ?, ?, ?, ?)',
      [name, grade_level, class_teacher_id || null, room || null, academic_year || '2025/2026']
    );
    res.status(201).json({ id: result.lastID, message: 'Class created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/classes/:id/subjects
router.post('/:id/subjects', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { name, code, teacher_id } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Subject name and code required' });
    const result = await db.run(
      'INSERT INTO subjects (name, code, class_id, teacher_id) VALUES (?, ?, ?, ?)',
      [name, code, req.params.id, teacher_id || null]
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
