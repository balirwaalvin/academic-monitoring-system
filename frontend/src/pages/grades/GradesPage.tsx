import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import { GradeBadge } from '../../components/common/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { classesApi, gradesApi, studentsApi } from '../../services/api';
import type { Class, Grade, ParentProfile, Student, Subject } from '../../types';

export default function GradesPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    class_id: '',
    student_id: '',
    subject_id: '',
    score: '',
    term: 'Term 1',
    assessment_type: 'exam',
    remarks: '',
  });

  const isAdminOrTeacher = ['admin', 'teacher'].includes(user?.role || '');
  const isParent = user?.role === 'parent';
  const normalizeId = (value: unknown): string => String(value ?? '').trim();
  const normalizeName = (value: unknown): string => String(value ?? '').trim().toLowerCase();

  const parentChildren = useMemo(() => {
    if (!isParent) return [];
    const parentProfile = (profile as ParentProfile | null) || null;
    return parentProfile?.children || [];
  }, [isParent, profile]);

  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: ['grades', filterTerm, filterType],
    queryFn: () => gradesApi.list({ term: filterTerm, assessment_type: filterType }).then((r) => r.data),
  });

  const classesQuery = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => classesApi.list().then((r) => r.data),
  });
  const classes = classesQuery.data || [];

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({}).then((r) => r.data),
    enabled: isAdminOrTeacher,
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects-all'],
    queryFn: () => classesApi.allSubjects().then((r) => r.data),
  });

  useEffect(() => {
    if (classesQuery.isError) {
      toast.error('Failed to load classes. Check classes data and permissions.');
    }
  }, [classesQuery.isError]);

  const gradeBelongsToParentChild = (
    grade: Grade,
    child: { student_id: number; student_number: string; name: string; class_name: string }
  ) => {
    const childId = normalizeId(child.student_id);
    const childStudentNumber = normalizeId(child.student_number);
    const childName = normalizeName(child.name);

    const gradeId = normalizeId(grade.student_id);
    const gradeStudentNumber = normalizeId(grade.student_number);
    const gradeName = normalizeName(grade.student_name);

    return (
      (childId && gradeId === childId)
      || (childStudentNumber && gradeStudentNumber === childStudentNumber)
      || (childName && gradeName === childName)
    );
  };

  const roleScopedGrades = useMemo(() => {
    if (!isParent) return grades;
    if (!parentChildren.length) return [];
    return grades.filter((grade) => parentChildren.some((child) => gradeBelongsToParentChild(grade, child)));
  }, [grades, isParent, parentChildren]);

  const classOptions = useMemo(() => {
    if (isParent) {
      const options = new Map<string, { value: string; name: string }>();

      roleScopedGrades.forEach((grade) => {
        const className = String(grade.class_name || '').trim();
        if (!className) return;
        options.set(className, { value: className, name: className });
      });

      parentChildren.forEach((child) => {
        const className = String(child.class_name || '').trim();
        if (!className) return;
        options.set(className, { value: className, name: className });
      });

      return [...options.values()];
    }

    if (classes.length > 0) {
      return classes.map((klass) => ({ value: normalizeId(klass.id), name: klass.name || `Class ${klass.id}` }));
    }

    const fallback = new Map<string, { value: string; name: string }>();
    students.forEach((student) => {
      const classId = normalizeId(student.class_id);
      if (!classId) return;
      const className = student.class_name || `Class ${classId}`;
      if (!fallback.has(classId)) fallback.set(classId, { value: classId, name: className });
    });
    return [...fallback.values()];
  }, [classes, students, isParent, roleScopedGrades, parentChildren]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classOptions.forEach((option) => map.set(option.value, option.name));
    classes.forEach((klass) => map.set(normalizeId(klass.id), klass.name));
    return map;
  }, [classOptions, classes]);

  const availableStudentsForModal = useMemo(() => {
    if (!form.class_id) return students;
    const selectedClassName = classNameById.get(form.class_id) || '';
    const byClass = students.filter((s) => {
      const idMatch = normalizeId(s.class_id) === form.class_id;
      const nameMatch = !!selectedClassName && String(s.class_name || '').trim() === selectedClassName;
      return idMatch || nameMatch;
    });
    return byClass.length ? byClass : students;
  }, [students, form.class_id, classNameById]);

  const availableSubjectsForModal = useMemo(() => {
    if (!form.class_id) return subjects;
    const selectedClassName = classNameById.get(form.class_id) || '';
    const byClass = subjects.filter((s) => {
      const idMatch = normalizeId(s.class_id) === form.class_id;
      const nameMatch = !!selectedClassName && String(s.class_name || '').trim() === selectedClassName;
      return idMatch || nameMatch;
    });
    return byClass.length ? byClass : subjects;
  }, [subjects, form.class_id, classNameById]);

  const gradeBelongsToStudent = (grade: Grade, student: Student) => {
    const studentIdCandidates = [
      (student as Student & { appwrite_id?: unknown }).appwrite_id,
      student.id,
      student.student_number,
      (student as Student & { user_id?: unknown }).user_id,
    ].map(normalizeId).filter(Boolean);

    const gradeIdCandidates = [
      grade.student_id,
      (grade as Grade & { appwrite_id?: unknown }).appwrite_id,
      grade.student_number,
    ].map(normalizeId).filter(Boolean);

    if (studentIdCandidates.some((id) => gradeIdCandidates.includes(id))) {
      return true;
    }

    const studentName = String(student.name || '').trim().toLowerCase();
    const gradeName = String(grade.student_name || '').trim().toLowerCase();
    return !!studentName && studentName === gradeName;
  };

  const selectedParentChildForFilter = parentChildren.find((child) => normalizeId(child.student_id) === filterStudent);
  const selectedStudentForFilter = students.find((s) => normalizeId(s.id) === filterStudent);

  const filteredGrades = roleScopedGrades.filter((g) => {
    const classMatch = !filterClass || normalizeName(g.class_name) === normalizeName(classNameById.get(filterClass));
    const studentMatch = !filterStudent
      || (isParent
        ? (selectedParentChildForFilter ? gradeBelongsToParentChild(g, selectedParentChildForFilter) : normalizeId(g.student_id) === filterStudent)
        : (selectedStudentForFilter ? gradeBelongsToStudent(g, selectedStudentForFilter) : normalizeId(g.student_id) === filterStudent));
    const termMatch = !filterTerm || g.term === filterTerm;
    const typeMatch = !filterType || g.assessment_type === filterType;
    return classMatch && studentMatch && termMatch && typeMatch;
  });

  const availableStudentsForFilter = useMemo(() => {
    if (isParent) {
      if (!filterClass) return parentChildren;
      return parentChildren.filter((child) => normalizeName(child.class_name) === normalizeName(filterClass));
    }

    if (!filterClass) return students;
    const selectedClassName = classNameById.get(filterClass) || '';
    const byClass = students.filter((s) => {
      const idMatch = normalizeId(s.class_id) === filterClass;
      const nameMatch = !!selectedClassName && String(s.class_name || '').trim() === selectedClassName;
      return idMatch || nameMatch;
    });
    return byClass.length ? byClass : students;
  }, [students, filterClass, classNameById, isParent, parentChildren]);

  const mutation = useMutation({
    mutationFn: (d: {
      student_id?: number;
      subject_id?: number;
      score: number;
      term: string;
      assessment_type: string;
      notes: string;
      academic_year: string;
      class_name?: string;
      student_name?: string;
      subject_name?: string;
      subject_code?: string;
      student_number?: string;
    }) => gradesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grades'] });
      toast.success('Grade recorded successfully');
      setShowModal(false);
      setForm({
        class_id: '',
        student_id: '',
        subject_id: '',
        score: '',
        term: 'Term 1',
        assessment_type: 'exam',
        remarks: '',
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to record grade';
      toast.error(message);
    },
  });

  const buildReportPdf = async (rows: Grade[], reportTitle: string, filename: string) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    const generatedAt = new Date();
    const average = rows.reduce((sum, g) => sum + Number(g.score || 0), 0) / rows.length;

    doc.setFontSize(16);
    doc.text(reportTitle, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${generatedAt.toLocaleString()}`, 14, 24);
    doc.text(`Total records: ${rows.length}`, 14, 30);
    doc.text(`Average score: ${average.toFixed(1)}%`, 14, 36);

    autoTable(doc, {
      startY: 42,
      head: [['Student', 'Class', 'Subject', 'Term', 'Type', 'Score', 'Grade', 'Remarks']],
      body: rows.map((g) => [
        g.student_name || String(g.student_id),
        g.class_name || '-',
        g.subject_name || String(g.subject_id),
        g.term,
        g.assessment_type,
        `${g.score}%`,
        g.grade_letter || '',
        g.notes || '',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(filename);
  };

  const exportReportPdf = async () => {
    if (!filteredGrades.length) {
      toast.error('No grades available for this report');
      return;
    }

    const datePart = new Date().toISOString().slice(0, 10);
    await buildReportPdf(filteredGrades, 'Academic Grade Report', `grade-report-${datePart}.pdf`);
  };

  const exportSingleStudentReportPdf = async () => {
    if (!filterStudent) {
      toast.error('Please select one student first');
      return;
    }

    const rows = isParent
      ? (selectedParentChildForFilter
        ? filteredGrades.filter((g) => gradeBelongsToParentChild(g, selectedParentChildForFilter))
        : filteredGrades.filter((g) => normalizeId(g.student_id) === filterStudent))
      : (selectedStudentForFilter
        ? filteredGrades.filter((g) => gradeBelongsToStudent(g, selectedStudentForFilter))
        : filteredGrades.filter((g) => normalizeId(g.student_id) === filterStudent));

    if (!rows.length) {
      toast.error('No grades found for the selected student');
      return;
    }

    const datePart = new Date().toISOString().slice(0, 10);
    const studentLabel = selectedParentChildForFilter?.name || selectedStudentForFilter?.name || rows[0]?.student_name || 'Student';
    const slug = studentLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await buildReportPdf(
      rows,
      `Student Report - ${studentLabel}`,
      `student-report-${slug}-${datePart}.pdf`
    );
  };

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const types = ['exam', 'quiz', 'assignment', 'project', 'midterm'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Grades</h1>
          <p className="text-sm text-slate-500">{filteredGrades.length} records</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={exportReportPdf} disabled={filteredGrades.length === 0}>
            <FileDown className="w-4 h-4" /> Download Report
          </button>
          {(isAdminOrTeacher || isParent) && (
            <button className="btn btn-secondary" onClick={exportSingleStudentReportPdf} disabled={!filterStudent}>
              <FileDown className="w-4 h-4" /> Download Student Report
            </button>
          )}
          {isAdminOrTeacher && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <PlusCircle className="w-4 h-4" /> Add Grade
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="select" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterStudent(''); }}>
          <option value="">All Classes</option>
          {classOptions.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
        </select>
        {(isAdminOrTeacher || isParent) && (
          <select className="select" value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
            <option value="">All Students</option>
            {availableStudentsForFilter.map((s) => (
              <option key={normalizeId((s as Student).id ?? (s as ParentProfile['children'][number]).student_id)} value={normalizeId((s as Student).id ?? (s as ParentProfile['children'][number]).student_id)}>
                {(s as Student).name ?? (s as ParentProfile['children'][number]).name}
              </option>
            ))}
          </select>
        )}
        <select className="select" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
          <option value="">All Terms</option>
          {terms.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        {(filterClass || filterStudent || filterTerm || filterType) && (
          <button className="btn btn-secondary" onClick={() => { setFilterClass(''); setFilterStudent(''); setFilterTerm(''); setFilterType(''); }}>Clear</button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">Subject</th>
              <th className="table-th">Term</th>
              <th className="table-th">Type</th>
              <th className="table-th">Score</th>
              <th className="table-th">Grade</th>
              <th className="table-th">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-td text-center text-slate-400">Loading...</td></tr>
            ) : filteredGrades.length === 0 ? (
              <tr><td colSpan={7} className="table-td text-center text-slate-400 py-8">No grade records found</td></tr>
            ) : filteredGrades.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{g.student_name}</td>
                <td className="table-td">{g.subject_name}</td>
                <td className="table-td">{g.term}</td>
                <td className="table-td capitalize">{g.assessment_type}</td>
                <td className="table-td font-semibold">{g.score}%</td>
                <td className="table-td"><GradeBadge grade={g.grade_letter || ''} score={g.score} /></td>
                <td className="table-td text-slate-500 text-sm">{g.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Grade" size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const selectedClass = classOptions.find((c) => c.value === form.class_id);
            const selectedStudent = students.find((s) => normalizeId(s.id) === form.student_id);
            const selectedSubject = subjects.find((s) => normalizeId(s.id) === form.subject_id);
            const scoreNum = Number(form.score);

            if (!selectedClass) {
              toast.error('Class is required. Please select a class.');
              return;
            }
            if (!selectedStudent) {
              toast.error('Student is required. Please select a student.');
              return;
            }
            if (!selectedSubject) {
              toast.error('Subject is required. Please select a subject.');
              return;
            }
            if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
              toast.error('Score must be between 0 and 100');
              return;
            }

            mutation.mutate({
              student_id: selectedStudent ? selectedStudent.id : undefined,
              subject_id: selectedSubject ? selectedSubject.id : undefined,
              score: scoreNum,
              term: form.term,
              assessment_type: form.assessment_type,
              notes: form.remarks,
              academic_year: '2025/2026',
              class_name: selectedClass.name,
              student_name: selectedStudent.name,
              subject_name: selectedSubject.name,
              subject_code: selectedSubject.code,
              student_number: selectedStudent.student_number,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select className="select w-full" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value, student_id: '', subject_id: '' }))}>
              <option value="">Select class...</option>
              {classOptions.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
            {classOptions.length === 0 && <p className="text-xs text-amber-600 mt-1">No classes found.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select className="select w-full" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student...</option>
              {availableStudentsForModal.map((s) => <option key={s.id} value={normalizeId(s.id)}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select className="select w-full" value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Select subject...</option>
              {availableSubjectsForModal.map((s) => <option key={s.id} value={normalizeId(s.id)}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Term</label>
              <select className="select w-full" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}>
                {terms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="select w-full" value={form.assessment_type} onChange={(e) => setForm((f) => ({ ...f, assessment_type: e.target.value }))}>
                {types.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Score (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="input w-full" required value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <input type="text" className="input w-full" placeholder="Optional comments" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Grade'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
