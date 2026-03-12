const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/attendance
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, date, from, to, class_id } = req.query;
    let query = `
      SELECT a.*, u.name as student_name, st.student_number, c.name as class_name,
             ru.name as recorded_by_name
      FROM attendance a
      JOIN students st ON a.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN users ru ON a.recorded_by = ru.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      const stu = await db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!stu) return res.json([]);
      query += ' AND a.student_id = ?'; params.push(stu.id);
    } else if (req.user.role === 'parent') {
      const children = await db.all('SELECT id FROM students WHERE parent_id = ?', [req.user.id]);
      if (children.length === 0) return res.json([]);
      query += ` AND a.student_id IN (${children.map(() => '?').join(',')})`;
      params.push(...children.map(c => c.id));
    }

    if (student_id) { query += ' AND a.student_id = ?'; params.push(student_id); }
    if (date) { query += ' AND a.date = ?'; params.push(date); }
    if (from) { query += ' AND a.date >= ?'; params.push(from); }
    if (to) { query += ' AND a.date <= ?'; params.push(to); }
    if (class_id) { query += ' AND st.class_id = ?'; params.push(class_id); }

    query += ' ORDER BY a.date DESC';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/attendance/stats/:studentId
router.get('/stats/:studentId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance WHERE student_id = ?
    `, [req.params.studentId]);

    const recent = await db.all(`
      SELECT status, COUNT(*) as count FROM attendance
      WHERE student_id = ? AND date >= date('now', '-30 days')
      GROUP BY status
    `, [req.params.studentId]);

    res.json({ overall: stats, recent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/attendance - single or bulk
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const records = Array.isArray(req.body) ? req.body : [req.body];
    for (const r of records) {
      if (!r.student_id || !r.date || !r.status) continue;
      await db.run(
        'INSERT OR REPLACE INTO attendance (student_id, date, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?)',
        [r.student_id, r.date, r.status, r.notes || null, req.user.id]
      );
    }
    res.status(201).json({ message: 'Attendance recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/attendance/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const { status, notes } = req.body;
    await db.run('UPDATE attendance SET status = ?, notes = ? WHERE id = ?', [status, notes || null, req.params.id]);
    res.json({ message: 'Attendance updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
