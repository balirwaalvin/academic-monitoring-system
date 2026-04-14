const express = require('express');
const PDFDocument = require('pdfkit');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/grades
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { class_id, student_id, subject_id, term, academic_year, assessment_type } = req.query;
    let query = `
      SELECT g.*, s.name as subject_name, s.code as subject_code,
             u.name as student_name, st.student_number,
             c.name as class_name, ru.name as recorded_by_name
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN students st ON g.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      LEFT JOIN users ru ON g.recorded_by = ru.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      const stu = await db.get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!stu) return res.json([]);
      query += ' AND g.student_id = ?'; params.push(stu.id);
    } else if (req.user.role === 'parent') {
      const children = await db.all('SELECT id FROM students WHERE parent_id = ?', [req.user.id]);
      if (children.length === 0) return res.json([]);
      query += ` AND g.student_id IN (${children.map(() => '?').join(',')})`;
      params.push(...children.map(c => c.id));
    }

    if (student_id) { query += ' AND g.student_id = ?'; params.push(student_id); }
    if (class_id) { query += ' AND st.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND g.subject_id = ?'; params.push(subject_id); }
    if (term) { query += ' AND g.term = ?'; params.push(term); }
    if (academic_year) { query += ' AND g.academic_year = ?'; params.push(academic_year); }
    if (assessment_type) { query += ' AND g.assessment_type = ?'; params.push(assessment_type); }

    query += ' ORDER BY g.recorded_at DESC';
    res.json(await db.all(query, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/grades/report/pdf
router.get('/report/pdf', async (req, res) => {
  try {
    const db = await getDb();
    const { class_id, student_id, subject_id, term, academic_year, assessment_type } = req.query;

    let query = `
      SELECT g.*, s.name as subject_name, s.code as subject_code,
             u.name as student_name, st.student_number,
             c.name as class_name
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      JOIN students st ON g.student_id = st.id
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) { query += ' AND g.student_id = ?'; params.push(student_id); }
    if (class_id) { query += ' AND st.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND g.subject_id = ?'; params.push(subject_id); }
    if (term) { query += ' AND g.term = ?'; params.push(term); }
    if (academic_year) { query += ' AND g.academic_year = ?'; params.push(academic_year); }
    if (assessment_type) { query += ' AND g.assessment_type = ?'; params.push(assessment_type); }

    query += ' ORDER BY u.name, g.term, s.name, g.recorded_at DESC';
    const grades = await db.all(query, params);

    const scoreSum = grades.reduce((sum, row) => sum + Number(row.score || 0), 0);
    const average = grades.length ? (scoreSum / grades.length) : 0;
    const groupedByTerm = grades.reduce((acc, row) => {
      acc[row.term] = acc[row.term] || [];
      acc[row.term].push(row);
      return acc;
    }, {});

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="grade-report-${new Date().toISOString().slice(0, 10)}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Academic Grade Report', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Term scope: ${term || 'All Terms'}`);
    doc.text(`Total records: ${grades.length}`);
    doc.text(`Average score: ${average.toFixed(1)}%`);
    doc.moveDown();

    doc.fontSize(12).text('Summary by Term');
    Object.entries(groupedByTerm).forEach(([termName, rows]) => {
      const termAvg = rows.length
        ? rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length
        : 0;
      doc.fontSize(10).text(`${termName}: ${rows.length} record(s), avg ${termAvg.toFixed(1)}%`);
    });

    doc.moveDown();
    doc.fontSize(12).text('Detailed Grades');
    doc.moveDown(0.5);

    grades.forEach((row, idx) => {
      const line = `${idx + 1}. ${row.student_name} | ${row.class_name || '-'} | ${row.subject_name} | ${row.term} | ${row.assessment_type} | ${row.score}% (${row.grade_letter || '-'})`;
      doc.fontSize(9).text(line);
      if (row.notes) {
        doc.fillColor('#555555').text(`   Notes: ${row.notes}`).fillColor('#000000');
      }
      if (doc.y > 760) doc.addPage();
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grades/summary/:studentId
router.get('/summary/:studentId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const summary = await db.all(`
      SELECT s.name as subject, s.code,
             AVG(CASE WHEN g.term = 'Term 1' THEN g.score END) as term1_avg,
             AVG(CASE WHEN g.term = 'Term 2' THEN g.score END) as term2_avg,
             AVG(CASE WHEN g.term = 'Term 3' THEN g.score END) as term3_avg,
             AVG(g.score) as overall_avg,
             MAX(g.score) as highest, MIN(g.score) as lowest
      FROM grades g JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = ? AND g.academic_year = '2025/2026'
      GROUP BY g.subject_id ORDER BY s.name
    `, [req.params.studentId]);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/grades
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const { student_id, subject_id, score, term, academic_year, assessment_type, notes } = req.body;
    if (!student_id || !subject_id || score === undefined || !term) {
      return res.status(400).json({ error: 'student_id, subject_id, score, and term are required' });
    }
    const getGradeLetter = (s) => s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 50 ? 'D' : 'F';
    const result = await db.run(`
      INSERT INTO grades (student_id, subject_id, score, grade_letter, term, academic_year, assessment_type, recorded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, subject_id, score, getGradeLetter(score), term, academic_year || '2025/2026', assessment_type || 'exam', req.user.id, notes || null]);
    res.status(201).json({ id: result.lastID, message: 'Grade recorded successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/grades/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const { score, notes } = req.body;
    const getGradeLetter = (s) => s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 50 ? 'D' : 'F';
    await db.run('UPDATE grades SET score = ?, grade_letter = ?, notes = ? WHERE id = ?',
      [score, getGradeLetter(score), notes, req.params.id]);
    res.json({ message: 'Grade updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/grades/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM grades WHERE id = ?', [req.params.id]);
    res.json({ message: 'Grade deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
