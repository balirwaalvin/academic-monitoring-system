const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/fees
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, term, status } = req.query;
    let query = `
      SELECT f.*,
             u.name as student_name, st.student_number,
             c.name as class_name,
             COALESCE(SUM(fp.amount_paid), 0) as amount_paid,
             (f.amount - COALESCE(SUM(fp.amount_paid), 0)) as balance,
             CASE
               WHEN COALESCE(SUM(fp.amount_paid), 0) >= f.amount THEN 'paid'
               WHEN COALESCE(SUM(fp.amount_paid), 0) > 0 THEN 'partial'
               WHEN date('now') > f.due_date THEN 'overdue'
               ELSE 'pending'
             END as payment_status
      FROM fees f
      JOIN students st ON f.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN fee_payments fp ON fp.fee_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'parent') {
      const children = await db.all('SELECT id FROM students WHERE parent_id = ?', [req.user.id]);
      if (children.length === 0) return res.json([]);
      query += ` AND f.student_id IN (${children.map(() => '?').join(',')})`;
      params.push(...children.map(c => c.id));
    } else if (req.user.role === 'student') {
      const stu = await db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!stu) return res.json([]);
      query += ' AND f.student_id = ?'; params.push(stu.id);
    }

    if (student_id) { query += ' AND f.student_id = ?'; params.push(student_id); }
    if (term) { query += ' AND f.term = ?'; params.push(term); }
    query += ' GROUP BY f.id ORDER BY f.due_date DESC';

    let fees = await db.all(query, params);
    if (status) fees = fees.filter(f => f.payment_status === status);
    res.json(fees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/fees/summary
router.get('/summary', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const summary = await db.get(`
      SELECT
        COUNT(DISTINCT f.id) as total_fees,
        SUM(f.amount) as total_billed,
        COALESCE(SUM(fp.amount_paid), 0) as total_collected,
        SUM(f.amount) - COALESCE(SUM(fp.amount_paid), 0) as total_outstanding
      FROM fees f LEFT JOIN fee_payments fp ON fp.fee_id = f.id
    `);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/fees/:id/payments
router.get('/:id/payments', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const payments = await db.all(`
      SELECT fp.*, u.name as received_by_name
      FROM fee_payments fp LEFT JOIN users u ON fp.received_by = u.id
      WHERE fp.fee_id = ? ORDER BY fp.payment_date DESC
    `, [req.params.id]);
    res.json(payments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/fees
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, fee_type, amount, due_date, term, academic_year, description } = req.body;
    if (!student_id || !fee_type || !amount || !due_date || !term) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await db.run(`
      INSERT INTO fees (student_id, fee_type, amount, due_date, term, academic_year, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [student_id, fee_type, amount, due_date, term, academic_year || '2025/2026', description || null]);
    res.status(201).json({ id: result.lastID, message: 'Fee created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/fees/:id/payment
router.post('/:id/payment', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { amount_paid, payment_date, payment_method, reference_number, notes } = req.body;
    if (!amount_paid || !payment_date) return res.status(400).json({ error: 'Amount and payment date required' });

    const fee = await db.get('SELECT * FROM fees WHERE id = ?', [req.params.id]);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    const result = await db.run(`
      INSERT INTO fee_payments (fee_id, amount_paid, payment_date, payment_method, reference_number, received_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.params.id, amount_paid, payment_date, payment_method || 'cash', reference_number || null, req.user.id, notes || null]);
    res.status(201).json({ id: result.lastID, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
