const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();

// GET /api/analytics/overview
router.get('/overview', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const [totalStudents, totalTeachers, totalParents, totalClasses,
           attendanceToday, avgPerformance, feeCollection, activeWarnings, openWellbeing,
           performanceByClass, attendanceTrend, subjectPerformance] = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM students WHERE status = 'active'"),
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND is_active = 1"),
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'parent' AND is_active = 1"),
      db.get('SELECT COUNT(*) as count FROM classes'),
      db.get(`SELECT SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
                     SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
                     COUNT(*) as total FROM attendance WHERE date = date('now')`),
      db.get("SELECT AVG(score) as avg FROM grades WHERE academic_year = '2025/2026'"),
      db.get(`SELECT SUM(f.amount) as total_billed, COALESCE(SUM(fp.amount_paid),0) as total_collected
              FROM fees f LEFT JOIN fee_payments fp ON fp.fee_id = f.id WHERE f.academic_year='2025/2026'`),
      db.get('SELECT COUNT(*) as count FROM early_warnings WHERE is_resolved = 0'),
      db.get("SELECT COUNT(*) as count FROM wellbeing_reports WHERE status IN ('open','in_progress')"),
      db.all(`SELECT c.name as class_name, AVG(g.score) as avg_score, COUNT(DISTINCT g.student_id) as student_count
              FROM grades g JOIN students s ON g.student_id=s.id JOIN classes c ON s.class_id=c.id
              WHERE g.academic_year='2025/2026' GROUP BY c.id ORDER BY c.name`),
      db.all(`SELECT date, ROUND(100.0*SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/COUNT(*),1) as rate
              FROM attendance WHERE date >= date('now','-14 days') GROUP BY date ORDER BY date ASC`),
      db.all(`SELECT s.name as subject, AVG(g.score) as avg_score
              FROM grades g JOIN subjects s ON g.subject_id=s.id
              WHERE g.academic_year='2025/2026' AND g.term='Term 2'
              GROUP BY g.subject_id ORDER BY avg_score DESC LIMIT 8`)
    ]);

    res.json({
      totalStudents: totalStudents.count,
      totalTeachers: totalTeachers.count,
      totalParents: totalParents.count,
      totalClasses: totalClasses.count,
      attendanceToday,
      avgPerformance: avgPerformance.avg ? Math.round(avgPerformance.avg * 10) / 10 : 0,
      feeCollection,
      activeWarnings: activeWarnings.count,
      openWellbeing: openWellbeing.count,
      performanceByClass,
      attendanceTrend,
      subjectPerformance,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/student/:studentId
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { studentId } = req.params;
    const [performanceTrend, subjectScores, attendanceByMonth, feeStatus] = await Promise.all([
      db.all(`SELECT term, AVG(score) as avg_score, MAX(score) as highest, MIN(score) as lowest
              FROM grades WHERE student_id=? AND academic_year='2025/2026' GROUP BY term ORDER BY term`, [studentId]),
      db.all(`SELECT s.name as subject, AVG(g.score) as avg_score
              FROM grades g JOIN subjects s ON g.subject_id=s.id
              WHERE g.student_id=? AND g.academic_year='2025/2026' GROUP BY g.subject_id ORDER BY s.name`, [studentId]),
      db.all(`SELECT strftime('%Y-%m',date) as month, COUNT(*) as total,
                     SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
                     ROUND(100.0*SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)/COUNT(*),1) as rate
              FROM attendance WHERE student_id=? GROUP BY month ORDER BY month DESC LIMIT 6`, [studentId]),
      db.all(`SELECT f.term, SUM(f.amount) as billed, COALESCE(SUM(fp.amount_paid),0) as paid
              FROM fees f LEFT JOIN fee_payments fp ON fp.fee_id=f.id
              WHERE f.student_id=? GROUP BY f.term`, [studentId])
    ]);
    res.json({ performanceTrend, subjectScores, attendanceByMonth, feeStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/at-risk
router.get('/at-risk', authenticate, authorize('admin', 'counselor', 'teacher'), async (req, res) => {
  try {
    const db = await getDb();
    const atRisk = await db.all(`
      SELECT u.name, st.student_number, c.name as class_name,
             AVG(g.score) as avg_score,
             (SELECT ROUND(100.0*SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END)/COUNT(*),1)
              FROM attendance a WHERE a.student_id=st.id AND a.date >= date('now','-30 days')) as absence_rate,
             (SELECT COUNT(*) FROM early_warnings ew WHERE ew.student_id=st.id AND ew.is_resolved=0) as active_warnings
      FROM students st
      JOIN users u ON st.user_id=u.id
      LEFT JOIN classes c ON st.class_id=c.id
      LEFT JOIN grades g ON g.student_id=st.id AND g.academic_year='2025/2026'
      WHERE st.status='active'
      GROUP BY st.id
      HAVING avg_score < 60 OR absence_rate > 20 OR active_warnings > 0
      ORDER BY avg_score ASC
    `);
    res.json(atRisk);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/events
router.get('/events', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const events = await db.all(`
      SELECT * FROM events
      WHERE (target_roles = 'all' OR target_roles LIKE ?) AND event_date >= date('now')
      ORDER BY event_date ASC LIMIT 10
    `, [`%${req.user.role}%`]);
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
