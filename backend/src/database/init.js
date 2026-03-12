const { getDb } = require('./db');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  const db = await getDb();

  // ─── SCHEMA ────────────────────────────────────────────────────────────────
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher','parent','student','counselor')),
      phone TEXT,
      address TEXT,
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      academic_year TEXT NOT NULL DEFAULT '2025/2026',
      class_teacher_id INTEGER REFERENCES users(id),
      room TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      student_number TEXT UNIQUE NOT NULL,
      class_id INTEGER REFERENCES classes(id),
      parent_id INTEGER REFERENCES users(id),
      date_of_birth DATE,
      gender TEXT CHECK(gender IN ('male','female','other')),
      enrollment_date DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','graduated','suspended'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id),
      teacher_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      subject_id INTEGER REFERENCES subjects(id),
      score REAL NOT NULL,
      max_score REAL DEFAULT 100,
      grade_letter TEXT,
      term TEXT NOT NULL,
      academic_year TEXT NOT NULL DEFAULT '2025/2026',
      assessment_type TEXT DEFAULT 'exam',
      recorded_by INTEGER REFERENCES users(id),
      notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      date DATE NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
      notes TEXT,
      recorded_by INTEGER REFERENCES users(id),
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date DATE NOT NULL,
      term TEXT NOT NULL,
      academic_year TEXT NOT NULL DEFAULT '2025/2026',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_id INTEGER REFERENCES fees(id),
      amount_paid REAL NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'cash',
      reference_number TEXT,
      received_by INTEGER REFERENCES users(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wellbeing_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      counselor_id INTEGER REFERENCES users(id),
      session_date DATE NOT NULL,
      mood_rating INTEGER CHECK(mood_rating BETWEEN 1 AND 5),
      concern_type TEXT,
      description TEXT,
      interventions TEXT,
      follow_up_date DATE,
      is_confidential INTEGER DEFAULT 1,
      status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','follow_up')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS behavior_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      incident_date DATE NOT NULL,
      incident_type TEXT NOT NULL CHECK(incident_type IN ('positive','negative','neutral')),
      description TEXT NOT NULL,
      action_taken TEXT,
      recorded_by INTEGER REFERENCES users(id),
      parent_notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      subject TEXT,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id),
      target_roles TEXT DEFAULT 'all',
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      is_active INTEGER DEFAULT 1,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('alert','info','warning','success')),
      is_read INTEGER DEFAULT 0,
      related_type TEXT,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      end_date DATE,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      event_type TEXT DEFAULT 'general',
      target_roles TEXT DEFAULT 'all',
      created_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS early_warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      warning_type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
      description TEXT NOT NULL,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_resolved INTEGER DEFAULT 0,
      resolved_by INTEGER REFERENCES users(id),
      resolved_at DATETIME,
      notes TEXT
    );
  `);

  // ─── SEED DATA ─────────────────────────────────────────────────────────────
  const existing = await db.get('SELECT COUNT(*) as count FROM users');
  if (existing.count > 0) return;

  const hp = bcrypt.hashSync('password123', 10);

  const iu = async (name, email, role, phone, address) => {
    const r = await db.run('INSERT INTO users (name,email,password,role,phone,address) VALUES (?,?,?,?,?,?)', [name, email, hp, role, phone, address]);
    return r.lastID;
  };

  const adminId     = await iu('Dr. Ssekandi Robert',       'admin@school.edu',                 'admin',     '+256-41-100-0001', 'Plot 1, Nakasero Road, Kampala');
  const t1Id        = await iu('Mrs. Sarah Namaganda',      'sarah.namaganda@school.edu',        'teacher',   '+256-77-200-0002', 'Plot 12, Kololo Hill, Kampala');
  const t2Id        = await iu('Mr. Michael Okello',        'michael.okello@school.edu',         'teacher',   '+256-77-200-0003', 'Plot 34, Ntinda, Kampala');
  const t3Id        = await iu('Ms. Emily Nambooze',        'emily.nambooze@school.edu',         'teacher',   '+256-70-200-0004', 'Plot 56, Bukoto, Kampala');
  const counselorId = await iu('Dr. Patricia Namutebi',     'counselor@school.edu',              'counselor', '+256-78-200-0005', 'Plot 78, Muyenga, Kampala');
  const p1Id        = await iu('Mr. James Mugisha',         'james.mugisha@gmail.com',           'parent',    '+256-77-301-0001', 'Plot 10, Ntinda, Kampala');
  const p2Id        = await iu('Mrs. Mary Nakyeyune',       'mary.nakyeyune@gmail.com',          'parent',    '+256-70-301-0002', 'Plot 22, Bukoto, Kampala');
  const p3Id        = await iu('Mr. Robert Ssemakula',      'robert.ssemakula@gmail.com',        'parent',    '+256-75-301-0003', 'Plot 44, Nansana, Wakiso');
  const p4Id        = await iu('Mrs. Fortunate Nalubega',   'fortunate.nalubega@gmail.com',      'parent',    '+256-77-301-0004', 'Plot 66, Makindye, Kampala');
  const p5Id        = await iu('Mr. David Kiwanuka',        'david.kiwanuka@gmail.com',          'parent',    '+256-78-301-0005', 'Plot 88, Muyenga, Kampala');
  const p6Id        = await iu('Mrs. Susan Namugga',        'susan.namugga@gmail.com',           'parent',    '+256-70-301-0006', 'Plot 100, Entebbe Road, Kampala');
  const su1Id       = await iu('Namukasa Emma',             'emma.namukasa@student.edu',         'student',   null, 'Plot 10, Ntinda, Kampala');
  const su2Id       = await iu('Ssemwogerere Liam',         'liam.ssemwogerere@student.edu',     'student',   null, 'Plot 22, Bukoto, Kampala');
  const su3Id       = await iu('Nalwoga Sophia',            'sophia.nalwoga@student.edu',        'student',   null, 'Plot 44, Nansana, Wakiso');
  const su4Id       = await iu('Mugabi Noah',               'noah.mugabi@student.edu',           'student',   null, 'Plot 66, Makindye, Kampala');
  const su5Id       = await iu('Nabirye Olivia',            'olivia.nabirye@student.edu',        'student',   null, 'Plot 88, Muyenga, Kampala');
  const su6Id       = await iu('Wasswa William',            'william.wasswa@student.edu',        'student',   null, 'Plot 100, Entebbe Road, Kampala');
  const su7Id       = await iu('Nanteza Ava',               'ava.nanteza@student.edu',           'student',   null, 'Plot 12, Kololo Hill, Kampala');
  const su8Id       = await iu('Kiggundu James',            'james.kiggundu@student.edu',        'student',   null, 'Plot 34, Ntinda, Kampala');
  const su9Id       = await iu('Nakimera Charlotte',        'charlotte.nakimera@student.edu',    'student',   null, 'Plot 56, Bukoto, Kampala');

  const ic = async (name, grade, tid, room) => {
    const r = await db.run('INSERT INTO classes (name,grade_level,class_teacher_id,room) VALUES (?,?,?,?)', [name, grade, tid, room]);
    return r.lastID;
  };
  const c1Id = await ic('Grade 10A', 'Grade 10', t1Id, 'Room 101');
  const c2Id = await ic('Grade 11B', 'Grade 11', t2Id, 'Room 201');
  const c3Id = await ic('Grade 12C', 'Grade 12', t3Id, 'Room 301');

  const is = async (uid, num, cid, pid, dob, gender) => {
    const r = await db.run('INSERT INTO students (user_id,student_number,class_id,parent_id,date_of_birth,gender) VALUES (?,?,?,?,?,?)', [uid, num, cid, pid, dob, gender]);
    return r.lastID;
  };
  const st1Id = await is(su1Id,'STU-2026-001',c1Id,p1Id,'2010-04-15','female');
  const st2Id = await is(su2Id,'STU-2026-002',c1Id,p2Id,'2010-07-22','male');
  const st3Id = await is(su3Id,'STU-2026-003',c1Id,p3Id,'2010-11-08','female');
  const st4Id = await is(su4Id,'STU-2026-004',c2Id,p4Id,'2009-03-30','male');
  const st5Id = await is(su5Id,'STU-2026-005',c2Id,p5Id,'2009-09-14','female');
  const st6Id = await is(su6Id,'STU-2026-006',c2Id,p6Id,'2009-01-25','male');
  const st7Id = await is(su7Id,'STU-2026-007',c3Id,p1Id,'2008-06-12','female');
  const st8Id = await is(su8Id,'STU-2026-008',c3Id,p2Id,'2008-12-03','male');
  const st9Id = await is(su9Id,'STU-2026-009',c3Id,p3Id,'2008-08-19','female');
  const stIds = [st1Id,st2Id,st3Id,st4Id,st5Id,st6Id,st7Id,st8Id,st9Id];

  const isub = async (name, code, cid, tid) => {
    const r = await db.run('INSERT INTO subjects (name,code,class_id,teacher_id) VALUES (?,?,?,?)', [name, code, cid, tid]);
    return r.lastID;
  };
  const subs10 = [
    await isub('Mathematics','MATH10',c1Id,t1Id), await isub('English Language','ENG10',c1Id,t1Id),
    await isub('Integrated Science','SCI10',c1Id,t2Id), await isub('Social Studies','SOC10',c1Id,t2Id),
    await isub('Computer Studies','COMP10',c1Id,t3Id), await isub('Creative Arts','ART10',c1Id,t3Id),
  ];
  const subs11 = [
    await isub('Mathematics','MATH11',c2Id,t2Id), await isub('English Language','ENG11',c2Id,t2Id),
    await isub('Physics','PHY11',c2Id,t1Id), await isub('Chemistry','CHEM11',c2Id,t1Id),
    await isub('Computer Science','COMP11',c2Id,t3Id), await isub('Business Studies','BUS11',c2Id,t3Id),
  ];
  const subs12 = [
    await isub('Mathematics','MATH12',c3Id,t3Id), await isub('English Language','ENG12',c3Id,t3Id),
    await isub('Physics','PHY12',c3Id,t1Id), await isub('Chemistry','CHEM12',c3Id,t1Id),
    await isub('Computer Science','COMP12',c3Id,t2Id), await isub('Economics','ECO12',c3Id,t2Id),
  ];
  const classSubjects = [subs10, subs11, subs12];
  const teacherIds = [t1Id, t2Id, t3Id];

  const getGL = s => s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 50 ? 'D' : 'F';
  const profiles = [[85,8],[70,10],[52,12],[82,7],[92,5],[61,12],[78,9],[95,4],[45,14]];
  for (let si = 0; si < stIds.length; si++) {
    const stId = stIds[si], cIdx = Math.floor(si/3), [base,v] = profiles[si], tid = teacherIds[cIdx];
    for (const term of ['Term 1','Term 2']) {
      for (const aType of ['exam','test','assignment']) {
        for (const subId of classSubjects[cIdx]) {
          const score = Math.max(10, Math.min(100, Math.round(base + (Math.random()*v*2-v))));
          await db.run('INSERT INTO grades (student_id,subject_id,score,grade_letter,term,academic_year,assessment_type,recorded_by) VALUES (?,?,?,?,?,?,?,?)',
            [stId, subId, score, getGL(score), term, '2025/2026', aType, tid]);
        }
      }
    }
  }

  const absentProb = [0.04,0.10,0.28,0.05,0.01,0.18,0.07,0.02,0.35];
  for (let si = 0; si < stIds.length; si++) {
    const stId = stIds[si], cIdx = Math.floor(si/3), tid = teacherIds[cIdx], prob = absentProb[si];
    for (let day = 1; day <= 60; day++) {
      const d = new Date('2026-03-12'); d.setDate(d.getDate() - day);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const r = Math.random();
      const status = r < prob ? 'absent' : r < prob+0.05 ? 'late' : 'present';
      await db.run('INSERT INTO attendance (student_id,date,status,recorded_by) VALUES (?,?,?,?)',
        [stId, d.toISOString().split('T')[0], status, tid]);
    }
  }

  const payProbs = [1,0.9,0.5,1,1,0.7,1,1,0.3];
  for (let si = 0; si < stIds.length; si++) {
    const stId = stIds[si], pp = payProbs[si];
    for (let t = 0; t < 2; t++) {
      const term = t === 0 ? 'Term 1' : 'Term 2', due = t === 0 ? '2026-01-15' : '2026-04-01';
      const addFee = async (ft, amt) => {
        const r = await db.run("INSERT INTO fees (student_id,fee_type,amount,due_date,term,academic_year,description) VALUES (?,?,?,?,?,'2025/2026',?)",
          [stId, ft, amt, due, term, ft]);
        return r.lastID;
      };
      const fT = await addFee('Tuition Fee', 850000);
      const fTr = await addFee('Transport Fee', 200000);
      const fA = await addFee('Activity Fee', 85000);
      const pay = (fid, amt, ref) => db.run('INSERT INTO fee_payments (fee_id,amount_paid,payment_date,payment_method,reference_number,received_by) VALUES (?,?,?,?,?,?)',
        [fid, amt, '2026-01-10', 'cash', ref, adminId]);
      if (Math.random() < pp) await pay(fT, 500, `REF${1000+si*10+t}`);
      if (Math.random() < pp) await pay(fTr, 120, `REF${2000+si*10+t}`);
      if (Math.random() < pp) await pay(fA, 50, `REF${3000+si*10+t}`);
    }
  }

  const wbSessions = [
    [stIds[2], 2, 'Academic Anxiety', 'Student reports feeling overwhelmed with coursework.', 'Referred to study skills workshop. Parents notified.', 'in_progress'],
    [stIds[8], 1, 'Family Issues', 'Student appears withdrawn and has been frequently absent. Reports issues at home.', 'Initiated family counseling referral.', 'in_progress'],
    [stIds[5], 3, 'Peer Conflict', 'Student involved in ongoing conflict with classmates.', 'Mediation session held.', 'resolved'],
    [stIds[1], 3, 'Academic Performance', 'Student concerned about declining grades in Mathematics.', 'Extra tutoring arranged.', 'follow_up'],
    [stIds[4], 5, 'General Check-in', 'Routine check-in. Student is doing well.', 'No interventions needed.', 'resolved'],
  ];
  for (const [sid, mood, concern, desc, intv, status] of wbSessions) {
    await db.run('INSERT INTO wellbeing_reports (student_id,counselor_id,session_date,mood_rating,concern_type,description,interventions,status) VALUES (?,?,?,?,?,?,?,?)',
      [sid, counselorId, '2026-02-10', mood, concern, desc, intv, status]);
  }

  const behaviors = [
    [stIds[4],'2026-02-20','positive','Represented school in regional science olympiad and won first prize.','Certificate of achievement awarded.',t2Id,1],
    [stIds[7],'2026-03-01','positive','Consistently helps classmates during group work. Shows excellent leadership.','Nominated for student leadership award.',t3Id,0],
    [stIds[2],'2026-02-05','negative','Failed to submit three consecutive assignments without explanation.','Warning issued. Parent informed.',t1Id,1],
    [stIds[8],'2026-02-18','negative','Repeated tardiness and disruptive behaviour during class.','Detention assigned. Counselor notified.',t3Id,1],
    [stIds[5],'2026-01-28','negative','Involved in verbal altercation with another student.','Mediation conducted. Written apology submitted.',t2Id,1],
    [stIds[0],'2026-03-05','positive','Scored highest in class on midterm examination.','Academic recognition in newsletter.',t1Id,1],
  ];
  for (const [sid, date, itype, desc, action, recBy, pn] of behaviors) {
    await db.run('INSERT INTO behavior_records (student_id,incident_date,incident_type,description,action_taken,recorded_by,parent_notified) VALUES (?,?,?,?,?,?,?)',
      [sid, date, itype, desc, action, recBy, pn]);
  }

  const announcements = [
    ['Term 2 Examinations Schedule','The Term 2 examinations will commence on April 14, 2026. The timetable has been uploaded to the portal.','all','high','2026-04-20'],
    ['Parent-Teacher Conference','The Term 2 Parent-Teacher Conference is scheduled for Saturday, March 28, 2026 from 9:00 AM to 2:00 PM.','all','high','2026-03-29'],
    ['School Sports Day','Annual Sports Day will be held on March 27, 2026 at the school grounds.','all','normal','2026-03-28'],
    ['Fee Payment Reminder','Term 2 fees are due by April 1, 2026. Parents who have not yet paid are urged to do so.','parent','urgent','2026-04-05'],
    ['Staff Meeting Rescheduled','The weekly staff meeting has been moved to Thursday March 19, 2026 at 3:00 PM.','teacher','normal','2026-03-19'],
  ];
  for (const [title, content, target, priority, expires] of announcements) {
    await db.run('INSERT INTO announcements (title,content,created_by,target_roles,priority,expires_at) VALUES (?,?,?,?,?,?)',
      [title, content, adminId, target, priority, expires]);
  }

  const events = [
    ['Term 2 Exams Begin','Commencement of Term 2 examinations','2026-04-14','2026-04-24','08:00','14:00','School Examination Halls','academic','all'],
    ['Parent-Teacher Conference','Scheduled meetings between parents and teachers','2026-03-28','2026-03-28','09:00','14:00','School Hall','meeting','all'],
    ['Annual Sports Day','Inter-house sports competition','2026-03-27','2026-03-27','08:00','16:00','School Sports Ground','sports','all'],
    ['Science Fair','Showcase of student science projects','2026-03-20','2026-03-20','10:00','15:00','Science Block','academic','all'],
    ['Term 2 Fee Deadline','Last day for Term 2 fee payments','2026-04-01','2026-04-01',null,null,'Accounts Office','administrative','parent'],
    ['Counseling Awareness Week','School mental health and wellbeing awareness week','2026-03-16','2026-03-20',null,null,'School-wide','wellbeing','all'],
  ];
  for (const [title, desc, date, edate, st, et, loc, etype, target] of events) {
    await db.run('INSERT INTO events (title,description,event_date,end_date,start_time,end_time,location,event_type,target_roles,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [title, desc, date, edate, st, et, loc, etype, target, adminId]);
  }

  const msgs = [
    [p1Id, t1Id, "Namukasa Emma's progress", "Good morning Mrs. Namaganda, I wanted to enquire about Emma's performance in Mathematics this term."],
    [t1Id, p1Id, "Re: Namukasa Emma's progress", "Dear Mr. Mugisha, thank you for reaching out. Emma is finding the algebra section challenging but she is working hard."],
    [p2Id, t1Id, "Ssemwogerere Liam's attendance", "Dear Mrs. Namaganda, Liam was unwell last week. Can you share what he missed?"],
    [adminId, counselorId, 'At-risk students', 'Dr. Namutebi, please review the flagged students in the early warning system.'],
    [counselorId, adminId, 'Re: At-risk students', 'Noted. I have already scheduled sessions with Nalwoga Sophia and Nakimera Charlotte.'],
  ];
  for (const [from, to, subj, content] of msgs) {
    await db.run('INSERT INTO messages (sender_id,receiver_id,subject,content) VALUES (?,?,?,?)', [from, to, subj, content]);
  }

  const notifs = [
    [p1Id, 'Grade Update', 'Namukasa Emma has received new grades for Term 2 tests.', 'info', 'grade'],
    [p3Id, 'Attendance Alert', 'Nalwoga Sophia has been absent 3 times this week.', 'alert', 'attendance'],
    [p3Id, 'Fee Reminder', 'Outstanding fee balance for Nalwoga Sophia: UGX 850,000 due April 1, 2026.', 'warning', 'fee'],
    [p6Id, 'Attendance Alert', 'Nakimera Charlotte has missed 4 days this week.', 'alert', 'attendance'],
    [adminId, 'Early Warning Triggered', '2 students have been flagged by the early warning system.', 'alert', 'warning'],
    [t1Id, 'Grade Submission Reminder', 'Term 2 grades are due for submission by March 20, 2026.', 'warning', 'grade'],
  ];
  for (const [uid, title, msg, type, rtype] of notifs) {
    await db.run('INSERT INTO notifications (user_id,title,message,type,related_type) VALUES (?,?,?,?,?)', [uid, title, msg, type, rtype]);
  }

  const warnings = [
    [stIds[2],'High Absenteeism','high','Student has missed over 28% of school days in the last 30 days.'],
    [stIds[8],'Critical Absenteeism','critical','Student has missed over 35% of school days.'],
    [stIds[2],'Low Academic Performance','high','Student average score dropped to 52% — below the pass threshold of 60%.'],
    [stIds[8],'Low Academic Performance','critical','Student average score is 45% across all subjects.'],
    [stIds[5],'Declining Performance','medium','Student performance has declined by over 15% compared to Term 1.'],
    [stIds[1],'Fee Default','low','Term 2 fees partially unpaid. Parent has been contacted.'],
  ];
  for (const [sid, wtype, sev, desc] of warnings) {
    await db.run('INSERT INTO early_warnings (student_id,warning_type,severity,description) VALUES (?,?,?,?)', [sid, wtype, sev, desc]);
  }

  console.log('✅ Database initialized with seed data for Greenfield Academy');
  console.log('─────────────────────────────────────────────');
  console.log('Demo Credentials (password: password123)');
  console.log('  Admin:     admin@school.edu');
  console.log('  Teacher:   sarah.namaganda@school.edu');
  console.log('  Parent:    james.mugisha@gmail.com');
  console.log('  Student:   emma.namukasa@student.edu');
  console.log('  Counselor: counselor@school.edu');
  console.log('─────────────────────────────────────────────');
}

module.exports = { initializeDatabase };
