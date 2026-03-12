const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/alerts
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { resolved, severity } = req.query;
    let query = `
      SELECT ew.*, u.name as student_name, st.student_number, c.name as class_name,
             ru.name as resolved_by_name
      FROM early_warnings ew
      JOIN students st ON ew.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN users ru ON ew.resolved_by = ru.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const children = await db.all('SELECT id FROM students WHERE parent_id = ?', [req.user.id]);
      if (children.length === 0) return res.json([]);
      query += ` AND ew.student_id IN (${children.map(() => '?').join(',')})`;
      params.push(...children.map(c => c.id));
    }

    if (resolved === 'true') { query += ' AND ew.is_resolved = 1'; }
    else if (resolved === 'false') { query += ' AND ew.is_resolved = 0'; }
    if (severity) { query += ' AND ew.severity = ?'; params.push(severity); }
    query += ' ORDER BY ew.triggered_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alerts/generate
router.post('/generate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const students = await db.all("SELECT id FROM students WHERE status = 'active'");
    let generated = 0;

    for (const stu of students) {
      const att = await db.get(`
        SELECT COUNT(*) as total, SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absences
        FROM attendance WHERE student_id=? AND date >= date('now','-30 days')
      `, [stu.id]);

      if (att.total > 0) {
        const rate = att.absences / att.total;
        if (rate > 0.3) {
          const exists = await db.get(
            "SELECT id FROM early_warnings WHERE student_id=? AND warning_type='High Absenteeism' AND is_resolved=0",
            [stu.id]
          );
          if (!exists) {
            await db.run(
              "INSERT INTO early_warnings (student_id, warning_type, severity, description) VALUES (?, ?, ?, ?)",
              [stu.id, 'High Absenteeism', rate > 0.4 ? 'critical' : 'high',
               `Student has missed ${Math.round(rate * 100)}% of school days in the last 30 days.`]
            );
            generated++;
          }
        }
      }

      const grades = await db.get(
        "SELECT AVG(score) as avg FROM grades WHERE student_id=? AND academic_year='2025/2026' AND term='Term 2'",
        [stu.id]
      );
      if (grades.avg !== null && grades.avg < 50) {
        const exists = await db.get(
          "SELECT id FROM early_warnings WHERE student_id=? AND warning_type='Low Academic Performance' AND is_resolved=0",
          [stu.id]
        );
        if (!exists) {
          await db.run(
            "INSERT INTO early_warnings (student_id, warning_type, severity, description) VALUES (?, ?, ?, ?)",
            [stu.id, 'Low Academic Performance', grades.avg < 40 ? 'critical' : 'high',
             `Student average score is ${Math.round(grades.avg)}% - below the 50% threshold.`]
          );
          generated++;
        }
      }

      const fees = await db.all(`
        SELECT f.id FROM fees f
        WHERE f.student_id=? AND date('now') > f.due_date
          AND (SELECT COALESCE(SUM(fp.amount_paid),0) FROM fee_payments fp WHERE fp.fee_id=f.id) < f.amount
      `, [stu.id]);

      if (fees.length > 0) {
        const exists = await db.get(
          "SELECT id FROM early_warnings WHERE student_id=? AND warning_type='Fee Default' AND is_resolved=0",
          [stu.id]
        );
        if (!exists) {
          await db.run(
            "INSERT INTO early_warnings (student_id, warning_type, severity, description) VALUES (?, ?, ?, ?)",
            [stu.id, 'Fee Default', 'medium', `Student has ${fees.length} overdue fee(s). Parental contact recommended.`]
          );
          generated++;
        }
      }
    }

    res.json({ message: `Early warning scan complete. ${generated} new warnings generated.`, generated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', authenticate, authorize('admin', 'teacher', 'counselor'), async (req, res) => {
  try {
    const db = await getDb();
    await db.run(
      'UPDATE early_warnings SET is_resolved=1, resolved_by=?, resolved_at=CURRENT_TIMESTAMP, notes=? WHERE id=?',
      [req.user.id, req.body.notes || null, req.params.id]
    );
    res.json({ message: 'Warning resolved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/alerts - manual alert
router.post('/', authenticate, authorize('admin', 'teacher', 'counselor'), async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, warning_type, severity, description } = req.body;
    if (!student_id || !warning_type || !description) return res.status(400).json({ error: 'Missing required fields' });
    const result = await db.run(
      'INSERT INTO early_warnings (student_id, warning_type, severity, description) VALUES (?, ?, ?, ?)',
      [student_id, warning_type, severity || 'medium', description]
    );
    res.status(201).json({ id: result.lastID, message: 'Alert created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
