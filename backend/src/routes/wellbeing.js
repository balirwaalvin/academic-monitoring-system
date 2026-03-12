const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/wellbeing
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, status } = req.query;
    let query = `
      SELECT w.*, u.name as student_name, st.student_number,
             c.name as class_name, cu.name as counselor_name
      FROM wellbeing_reports w
      JOIN students st ON w.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN users cu ON w.counselor_id = cu.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const children = await db.all('SELECT id FROM students WHERE parent_id = ?', [req.user.id]);
      if (children.length === 0) return res.json([]);
      query += ` AND w.student_id IN (${children.map(() => '?').join(',')}) AND w.is_confidential = 0`;
      params.push(...children.map(c => c.id));
    } else if (req.user.role === 'student') {
      const stu = await db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!stu) return res.json([]);
      query += ' AND w.student_id = ? AND w.is_confidential = 0'; params.push(stu.id);
    }

    if (student_id) { query += ' AND w.student_id = ?'; params.push(student_id); }
    if (status) { query += ' AND w.status = ?'; params.push(status); }
    query += ' ORDER BY w.session_date DESC';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/wellbeing
router.post('/', authenticate, authorize('admin', 'counselor'), async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, session_date, mood_rating, concern_type, description, interventions, follow_up_date, status, is_confidential } = req.body;
    if (!student_id || !session_date) return res.status(400).json({ error: 'student_id and session_date required' });
    const result = await db.run(`
      INSERT INTO wellbeing_reports (student_id, counselor_id, session_date, mood_rating, concern_type, description, interventions, follow_up_date, status, is_confidential)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, req.user.id, session_date, mood_rating || null, concern_type || null, description || null, interventions || null, follow_up_date || null, status || 'open', is_confidential !== false ? 1 : 0]);
    res.status(201).json({ id: result.lastID, message: 'Wellbeing report created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/wellbeing/:id
router.put('/:id', authenticate, authorize('admin', 'counselor'), async (req, res) => {
  try {
    const db = await getDb();
    const { mood_rating, concern_type, description, interventions, follow_up_date, status, is_confidential } = req.body;
    await db.run(`
      UPDATE wellbeing_reports SET
        mood_rating = COALESCE(?, mood_rating),
        concern_type = COALESCE(?, concern_type),
        description = COALESCE(?, description),
        interventions = COALESCE(?, interventions),
        follow_up_date = COALESCE(?, follow_up_date),
        status = COALESCE(?, status),
        is_confidential = COALESCE(?, is_confidential)
      WHERE id = ?
    `, [mood_rating, concern_type, description, interventions, follow_up_date, status, is_confidential, req.params.id]);
    res.json({ message: 'Wellbeing report updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/wellbeing/behavior
router.get('/behavior', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, class_id } = req.query;
    let query = `
      SELECT b.*, u.name as student_name, st.student_number,
             c.name as class_name, ru.name as recorded_by_name
      FROM behavior_records b
      JOIN students st ON b.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN users ru ON b.recorded_by = ru.id
      WHERE 1=1
    `;
    const params = [];
    if (student_id) { query += ' AND b.student_id = ?'; params.push(student_id); }
    if (class_id) { query += ' AND st.class_id = ?'; params.push(class_id); }
    query += ' ORDER BY b.incident_date DESC';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/wellbeing/behavior
router.post('/behavior', authenticate, authorize('admin', 'teacher', 'counselor'), async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, incident_date, incident_type, description, action_taken, parent_notified } = req.body;
    if (!student_id || !incident_date || !incident_type || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.run(`
      INSERT INTO behavior_records (student_id, incident_date, incident_type, description, action_taken, recorded_by, parent_notified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [student_id, incident_date, incident_type, description, action_taken || null, req.user.id, parent_notified ? 1 : 0]);
    res.status(201).json({ id: result.lastID, message: 'Behavior record created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
