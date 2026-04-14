import { Query } from 'appwrite';
import { appwrite } from './appwrite';

type ApiResult<T> = Promise<{ data: T }>;
type Loose = any;
type EntityId = string | number;

const ok = <T>(data: T): { data: T } => ({ data });

const ensureAppwriteConfigured = () => {
  if (!appwrite.databaseId) {
    throw new Error('Appwrite database is not configured. Set VITE_APPWRITE_DATABASE_ID.');
  }
};

const normalizeDoc = (doc: Loose): Loose => {
  const rawId = doc.id ?? doc.$id;
  const numericId = Number(rawId);
  return {
    ...doc,
    id: Number.isNaN(numericId) ? rawId : numericId,
    appwrite_id: doc.$id,
    created_at: doc.created_at ?? doc.$createdAt,
    updated_at: doc.updated_at ?? doc.$updatedAt,
  };
};

const sameValue = (a: unknown, b: unknown): boolean => String(a ?? '') === String(b ?? '');

const applyFilters = (items: Loose[], params?: Record<string, string>): Loose[] => {
  if (!params) return items;
  const active = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  if (!active.length) return items;

  return items.filter((item) => {
    return active.every(([key, value]) => {
      if (key === 'search') {
        const search = String(value).toLowerCase();
        const haystack = [item.name, item.email, item.student_name, item.student_number, item.class_name, item.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      }

      if (key === 'resolved') {
        const resolved = Boolean(item.resolved ?? item.is_resolved);
        return String(resolved) === String(value);
      }

      if (key === 'status') {
        return sameValue(item.status, value) || sameValue(item.payment_status, value);
      }

      return sameValue(item[key], value);
    });
  });
};

const listAllDocuments = async (collectionId: string, queries: string[] = []): Promise<Loose[]> => {
  ensureAppwriteConfigured();
  const documents: Loose[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await appwrite.databases.listDocuments(appwrite.databaseId, collectionId, [...queries, Query.limit(limit), Query.offset(offset)]);
    documents.push(...page.documents);
    if (page.documents.length < limit) break;
    offset += limit;
  }

  return documents;
};

const listCollection = async (collectionId: string, params?: Record<string, string>): Promise<Loose[]> => {
  const docs = await listAllDocuments(collectionId);
  const normalized = docs.map(normalizeDoc);
  return applyFilters(normalized, params);
};

const officialSubjects = [
  { name: 'English', code: 'ENG' },
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Science', code: 'SCI' },
  { name: 'Social Studies', code: 'SST' },
  { name: 'Christian Religious Education', code: 'CRE' },
  { name: 'Islamic Religious Education', code: 'IRE' },
  { name: 'Swahili', code: 'SWA' },
];

const seedOfficialSubjectsIfMissing = async (): Promise<void> => {
  ensureAppwriteConfigured();
  const existing = await listAllDocuments(appwrite.collections.subjects);
  const existingNames = new Set(existing.map((doc) => String(doc.name || '').trim().toLowerCase()));

  const missingSubjects = officialSubjects.filter((subject) => !existingNames.has(subject.name.toLowerCase()));
  if (!missingSubjects.length) return;

  await Promise.all(
    missingSubjects.map((subject) =>
      createIn(appwrite.collections.subjects, {
        name: subject.name,
        code: subject.code,
        created_at: new Date().toISOString(),
      })
    )
  );
};

const getById = async (collectionId: string, id: EntityId): Promise<Loose> => {
  ensureAppwriteConfigured();
  const doc = await appwrite.databases.getDocument(appwrite.databaseId, collectionId, String(id));
  return normalizeDoc(doc as Loose);
};

const createIn = async (collectionId: string, data: Loose): Promise<Loose> => {
  ensureAppwriteConfigured();
  try {
    const doc = await appwrite.databases.createDocument(appwrite.databaseId, collectionId, appwrite.id.unique(), data);
    return normalizeDoc(doc as Loose);
  } catch (error: any) {
    const message = String(error?.message || '');
    if (message.includes("No permissions provided for action 'create'")) {
      throw new Error(
        `Cannot create document in '${collectionId}'. Appwrite collection permissions are missing create access for this user role. Run backend provisioning again or add create permission in Appwrite Console.`
      );
    }
    throw error;
  }
};

const updateIn = async (collectionId: string, id: EntityId, data: Loose): Promise<Loose> => {
  ensureAppwriteConfigured();
  const doc = await appwrite.databases.updateDocument(appwrite.databaseId, collectionId, String(id), data);
  return normalizeDoc(doc as Loose);
};

const deleteIn = async (collectionId: string, id: EntityId): Promise<void> => {
  ensureAppwriteConfigured();
  await appwrite.databases.deleteDocument(appwrite.databaseId, collectionId, String(id));
};

const getCurrentProfile = async (): Promise<Loose | null> => {
  const account = await appwrite.account.get();
  let allUsers: Loose[] = [];

  try {
    allUsers = await listCollection(appwrite.collections.users);
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    throw new Error(`Cannot read Appwrite users collection (${appwrite.collections.users}): ${msg}`);
  }

  const accountEmail = String(account.email || '').trim().toLowerCase();
  return allUsers.find((u) => {
    const profileEmail = String(u.email || '').trim().toLowerCase();
    return String(u.appwrite_user_id || '') === account.$id || profileEmail === accountEmail;
  }) || null;
};

const buildRoleProfile = async (user: Loose | null): Promise<Loose | null> => {
  if (!user) return null;

  if (user.role === 'student') {
    try {
      const students = await listCollection(appwrite.collections.students, { user_id: String(user.id) });
      return students[0] || null;
    } catch {
      return null;
    }
  }

  if (user.role === 'parent') {
    try {
      let children = await listCollection(appwrite.collections.students, { parent_id: String(user.id) });

      // Some records may only have parent contact fields when parent_id couldn't be stored.
      if (!children.length) {
        const allStudents = await listCollection(appwrite.collections.students);
        const email = String(user.email || '').trim().toLowerCase();
        const name = String(user.name || '').trim().toLowerCase();

        children = allStudents.filter((student) => {
          const parentEmail = String(student.parent_email || '').trim().toLowerCase();
          const parentName = String(student.parent_name || '').trim().toLowerCase();
          return (email && parentEmail === email) || (name && parentName === name);
        });
      }

      return {
        children: children.map((child) => ({
          student_id: child.id,
          student_number: child.student_number,
          name: child.name,
          class_name: child.class_name,
        })),
      };
    } catch {
      // Keep sign-in successful even when parent cannot read students directly.
      return { children: [] };
    }
  }

  return null;
};

const normalizeScopeValue = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const getParentChildrenForScope = async (): Promise<Loose[] | null> => {
  let user: Loose | null = null;
  try {
    user = await getCurrentProfile();
  } catch {
    return null;
  }

  if (!user || user.role !== 'parent') {
    return null;
  }

  let parentProfile: Loose | null = null;
  try {
    parentProfile = await buildRoleProfile(user);
  } catch {
    return [];
  }

  return Array.isArray(parentProfile?.children) ? parentProfile.children : [];
};

const scopeToParentChildren = (
  rows: Loose[],
  children: Loose[] | null,
  fields: { idField: string; studentNumberField: string; studentNameField: string }
): Loose[] => {
  if (children === null) return rows;
  if (!children.length) return [];

  return rows.filter((row) => {
    const rowId = normalizeScopeValue(row[fields.idField]);
    const rowStudentNumber = normalizeScopeValue(row[fields.studentNumberField]);
    const rowStudentName = normalizeScopeValue(row[fields.studentNameField]);

    return children.some((child) => {
      const childId = normalizeScopeValue(child.student_id);
      const childStudentNumber = normalizeScopeValue(child.student_number);
      const childName = normalizeScopeValue(child.name);
      return (
        (childId && childId === rowId)
        || (childStudentNumber && childStudentNumber === rowStudentNumber)
        || (childName && childName === rowStudentName)
      );
    });
  });
};

const isRowInParentScope = (
  row: Loose,
  children: Loose[] | null,
  fields: { idField: string; studentNumberField: string; studentNameField: string }
): boolean => {
  return scopeToParentChildren([row], children, fields).length > 0;
};

const matchesChildIdentity = (row: Loose, child: Loose, fields: { idField: string; studentNumberField: string; studentNameField: string }): boolean => {
  const rowId = normalizeScopeValue(row[fields.idField]);
  const rowStudentNumber = normalizeScopeValue(row[fields.studentNumberField]);
  const rowStudentName = normalizeScopeValue(row[fields.studentNameField]);

  const childId = normalizeScopeValue(child.student_id);
  const childStudentNumber = normalizeScopeValue(child.student_number);
  const childName = normalizeScopeValue(child.name);

  return (
    (!!childId && childId === rowId)
    || (!!childStudentNumber && childStudentNumber === rowStudentNumber)
    || (!!childName && childName === rowStudentName)
  );
};

const filterRowsForStudent = (
  rows: Loose[],
  studentId: EntityId,
  children: Loose[] | null,
  fields: { idField: string; studentNumberField: string; studentNameField: string }
): Loose[] => {
  const normalizedStudentId = normalizeScopeValue(studentId);

  if (children !== null) {
    const child = children.find((c) => normalizeScopeValue(c.student_id) === normalizedStudentId);
    if (!child) return [];
    return rows.filter((row) => matchesChildIdentity(row, child, fields));
  }

  return rows.filter((row) => normalizeScopeValue(row[fields.idField]) === normalizedStudentId);
};

const currentUserId = async (): Promise<EntityId | null> => {
  const profile = await getCurrentProfile();
  return profile?.id ?? null;
};

export default {
  mode: 'appwrite',
};

export const authApi = {
  login: async (email: string, password: string): ApiResult<Loose> => {
    try {
      await appwrite.account.createEmailPasswordSession(email, password);
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('session is active') || message.includes('session is prohibited')) {
        await appwrite.account.deleteSession('current');
        await appwrite.account.createEmailPasswordSession(email, password);
      } else {
        throw error;
      }
    }

    const user = await getCurrentProfile();
    if (!user) {
      throw new Error('No user profile found for this auth account. Ensure the users collection has a document with matching email or appwrite_user_id, and collection read permissions allow signed-in users.');
    }
    const profile = await buildRoleProfile(user);
    return ok({ token: 'appwrite-session', user, profile });
  },

  me: async (): ApiResult<Loose> => {
    const user = await getCurrentProfile();
    if (!user) {
      throw new Error('Unauthorized');
    }
    const profile = await buildRoleProfile(user);
    return ok({ user, profile });
  },

  logout: async (): ApiResult<{ success: true }> => {
    try {
      await appwrite.account.deleteSession('current');
    } catch {
      // Session may already be missing; treat as logged out.
    }
    return ok({ success: true });
  },
};

export const studentsApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const parentChildren = await getParentChildrenForScope();
    const [students, classes] = await Promise.all([
      listCollection(appwrite.collections.students, params),
      listCollection(appwrite.collections.classes),
    ]);

    const classMap = new Map<string, Loose>();
    classes.forEach((klass) => {
      classMap.set(String(klass.id), klass);
      if (klass.appwrite_id) classMap.set(String(klass.appwrite_id), klass);
    });

    const updates: Promise<Loose>[] = [];
    const withClass = students.map((student) => {
      const klass = classMap.get(String(student.class_id));
      const className = student.class_name || klass?.name || '';
      const gradeLevel = student.grade_level || klass?.grade_level || '';

      if (klass && (!student.class_name || !student.grade_level)) {
        updates.push(
          updateIn(appwrite.collections.students, student.id, {
            class_name: className,
            grade_level: gradeLevel,
          })
        );
      }

      return {
        ...student,
        class_name: className,
        grade_level: gradeLevel,
      };
    });

    if (updates.length && parentChildren === null) {
      await Promise.allSettled(updates);
    }

    return ok(
      scopeToParentChildren(withClass, parentChildren, {
        idField: 'id',
        studentNumberField: 'student_number',
        studentNameField: 'name',
      })
    );
  },

  get: async (id: EntityId): ApiResult<Loose> => {
    const parentChildren = await getParentChildrenForScope();
    const student = await getById(appwrite.collections.students, id);
    if (!isRowInParentScope(student, parentChildren, { idField: 'id', studentNumberField: 'student_number', studentNameField: 'name' })) {
      throw new Error('Unauthorized access to this student record.');
    }

    if (!student.class_name && student.class_id !== undefined && student.class_id !== null) {
      try {
        const klass = await getById(appwrite.collections.classes, student.class_id);
        return ok({
          ...student,
          class_name: klass?.name || '',
          grade_level: student.grade_level || klass?.grade_level || '',
        });
      } catch {
        return ok(student);
      }
    }
    return ok(student);
  },

  create: async (data: Loose): ApiResult<Loose> => {
    if (data.class_id === undefined || data.class_id === null || String(data.class_id).trim() === '') {
      throw new Error('Class is required when registering a student.');
    }

    const classes = await listCollection(appwrite.collections.classes);
    const classRef = String(data.class_id);
    const klass = classes.find((item) => String(item.id) === classRef || String(item.appwrite_id || '') === classRef);

    if (!klass) {
      throw new Error('Selected class was not found. Refresh classes and try again.');
    }

    const numericClassId = Number(klass.id);
    const hasNumericClassId = !Number.isNaN(numericClassId);

    const payload: Loose = {
      name: data.name,
      email: data.email,
      student_number: data.student_number,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      enrollment_date: data.enrollment_date || new Date().toISOString().slice(0, 10),
      status: data.status || 'active',
      class_name: klass.name || '',
      grade_level: klass.grade_level || '',
    };

    if (hasNumericClassId) {
      payload.class_id = numericClassId;
    }

    if (data.parent_id !== undefined && data.parent_id !== null && String(data.parent_id).trim() !== '') {
      payload.parent_id = Number(data.parent_id);
    }

    if (!payload.gender) delete payload.gender;
    if (!payload.date_of_birth) delete payload.date_of_birth;

    return ok(await createIn(appwrite.collections.students, payload));
  },
  update: async (id: EntityId, data: Loose): ApiResult<Loose> => {
    const payload: Loose = { ...data };

    if (payload.class_id !== undefined && payload.class_id !== null && String(payload.class_id).trim() !== '') {
      const classes = await listCollection(appwrite.collections.classes);
      const classRef = String(payload.class_id);
      const klass = classes.find((item) => String(item.id) === classRef || String(item.appwrite_id || '') === classRef);

      if (!klass) {
        throw new Error('Selected class was not found.');
      }

      const numericClassId = Number(klass.id);
      if (!Number.isNaN(numericClassId)) {
        payload.class_id = numericClassId;
      } else {
        delete payload.class_id;
      }
      payload.class_name = klass.name || '';
      payload.grade_level = klass.grade_level || '';
    }

    return ok(await updateIn(appwrite.collections.students, id, payload));
  },
};

export const classesApi = {
  list: async (): ApiResult<Loose[]> => ok(await listCollection(appwrite.collections.classes)),
  getSubjects: async (id: EntityId): ApiResult<Loose[]> => ok(await listCollection(appwrite.collections.subjects, { class_id: String(id) })),
  getStudents: async (id: EntityId): ApiResult<Loose[]> => ok(await listCollection(appwrite.collections.students, { class_id: String(id) })),
  allSubjects: async (): ApiResult<Loose[]> => {
    try {
      await seedOfficialSubjectsIfMissing();
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (!message.includes('permission') && !message.includes('create')) {
        throw error;
      }
      // If the current session cannot seed, still fall back to the existing list.
    }

    return ok(await listCollection(appwrite.collections.subjects));
  },
  create: async (data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.classes, data)),
  createSubject: async (classId: EntityId, data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.subjects, { ...data, class_id: classId })),
};

export const gradesApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const grades = await listCollection(appwrite.collections.grades, params);
    const parentChildren = await getParentChildrenForScope();
    return ok(
      scopeToParentChildren(grades, parentChildren, {
        idField: 'student_id',
        studentNumberField: 'student_number',
        studentNameField: 'student_name',
      })
    );
  },

  summary: async (studentId: EntityId): ApiResult<Loose[]> => {
    const parentChildren = await getParentChildrenForScope();
    const scopedGrades = (await gradesApi.list()).data;
    const grades = filterRowsForStudent(scopedGrades, studentId, parentChildren, {
      idField: 'student_id',
      studentNumberField: 'student_number',
      studentNameField: 'student_name',
    });

    const bySubject = new Map<string, Loose[]>();

    grades.forEach((grade) => {
      const key = String(grade.subject_id ?? grade.subject_name ?? 'unknown');
      const bag = bySubject.get(key) || [];
      bag.push(grade);
      bySubject.set(key, bag);
    });

    const summary = [...bySubject.values()].map((subjectGrades) => {
      const scores = subjectGrades.map((g) => {
        const max = Number(g.max_score || 100) || 100;
        return (Number(g.score || 0) / max) * 100;
      });

      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        subject: subjectGrades[0]?.subject_name || subjectGrades[0]?.subject || 'Subject',
        code: subjectGrades[0]?.subject_code || '',
        overall_avg: Number(avg.toFixed(1)),
        highest: Number((Math.max(...scores, 0)).toFixed(1)),
        lowest: Number((scores.length ? Math.min(...scores) : 0).toFixed(1)),
      };
    });

    return ok(summary);
  },

  create: async (data: Loose): ApiResult<Loose> => {
    const userId = await currentUserId();
    const score = Number(data.score);
    if (Number.isNaN(score)) {
      throw new Error('Score must be a valid number.');
    }

    const hasStudentId = data.student_id !== undefined && data.student_id !== null && String(data.student_id).trim() !== '';
    const hasSubjectId = data.subject_id !== undefined && data.subject_id !== null && String(data.subject_id).trim() !== '';

    const studentId = hasStudentId ? Number(data.student_id) : undefined;
    const subjectId = hasSubjectId ? Number(data.subject_id) : undefined;

    if (!hasStudentId && !data.student_name) {
      throw new Error('Student is required. Select one or enter a name manually.');
    }
    if (!hasSubjectId && !data.subject_name) {
      throw new Error('Subject is required. Select one or enter a name manually.');
    }

    const maxScore = Number(data.max_score || 100) || 100;
    const scorePercent = (score / maxScore) * 100;
    const computedGradeLetter = scorePercent >= 80 ? 'A' : scorePercent >= 70 ? 'B' : scorePercent >= 60 ? 'C' : scorePercent >= 50 ? 'D' : 'F';

    // Keep only attributes that exist in the Appwrite grades schema.
    const payload: Loose = {
      score,
      max_score: maxScore,
      grade_letter: data.grade_letter || computedGradeLetter,
      term: String(data.term || 'Term 1'),
      academic_year: String(data.academic_year || '2025/2026'),
      assessment_type: String(data.assessment_type || 'exam'),
      notes: String(data.notes || ''),
      recorded_at: new Date().toISOString(),
      subject_name: data.subject_name ? String(data.subject_name) : undefined,
      subject_code: data.subject_code ? String(data.subject_code) : undefined,
      student_name: data.student_name ? String(data.student_name) : undefined,
      student_number: data.student_number ? String(data.student_number) : undefined,
      class_name: data.class_name ? String(data.class_name) : undefined,
      recorded_by_name: data.recorded_by_name ? String(data.recorded_by_name) : undefined,
    };

    if (typeof userId === 'number' && !Number.isNaN(userId)) {
      payload.recorded_by = userId;
    }

    if (studentId !== undefined && !Number.isNaN(studentId)) {
      payload.student_id = studentId;
    }

    if (subjectId !== undefined && !Number.isNaN(subjectId)) {
      payload.subject_id = subjectId;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    return ok(await createIn(appwrite.collections.grades, payload));
  },

  update: async (id: EntityId, data: Loose): ApiResult<Loose> => ok(await updateIn(appwrite.collections.grades, id, data)),
  delete: async (id: EntityId): ApiResult<{ success: true }> => {
    await deleteIn(appwrite.collections.grades, id);
    return ok({ success: true });
  },
};

export const attendanceApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const rows = await listCollection(appwrite.collections.attendance, params);
    const parentChildren = await getParentChildrenForScope();
    return ok(
      scopeToParentChildren(rows, parentChildren, {
        idField: 'student_id',
        studentNumberField: 'student_number',
        studentNameField: 'student_name',
      })
    );
  },

  stats: async (studentId: EntityId): ApiResult<Loose> => {
    const parentChildren = await getParentChildrenForScope();
    const scopedAttendance = (await attendanceApi.list()).data;
    const records = filterRowsForStudent(scopedAttendance, studentId, parentChildren, {
      idField: 'student_id',
      studentNumberField: 'student_number',
      studentNameField: 'student_name',
    });

    const overall = { total_days: records.length, present: 0, absent: 0, late: 0, excused: 0 };
    const recentMap = new Map<string, number>();

    records.forEach((record) => {
      const status = String(record.status || 'present');
      if (status in overall) {
        (overall as Loose)[status] += 1;
      }
      recentMap.set(status, (recentMap.get(status) || 0) + 1);
    });

    return ok({
      overall,
      recent: [...recentMap.entries()].map(([status, count]) => ({ status, count })),
    });
  },

  record: async (data: unknown): ApiResult<Loose> => {
    const userId = await currentUserId();
    const payload = Array.isArray(data) ? data : [data];
    const created = [];

    for (const row of payload as Loose[]) {
      const rawStudentId = row.student_id;
      const numericStudentId = Number(rawStudentId);
      const hasNumericStudentId = rawStudentId !== undefined && rawStudentId !== null && !Number.isNaN(numericStudentId);

      const numericRecordedBy = Number(userId);
      const hasNumericRecordedBy = userId !== undefined && userId !== null && !Number.isNaN(numericRecordedBy);

      // Keep attendance writes compatible with Appwrite schema (integer IDs + declared fields only).
      const safeRow: Loose = {
        date: String(row.date || new Date().toISOString().slice(0, 10)),
        status: String(row.status || 'present'),
        notes: row.notes !== undefined && row.notes !== null ? String(row.notes) : undefined,
        student_name: row.student_name ? String(row.student_name) : undefined,
        student_number: row.student_number ? String(row.student_number) : undefined,
        class_name: row.class_name ? String(row.class_name) : undefined,
        recorded_by_name: row.recorded_by_name ? String(row.recorded_by_name) : undefined,
        recorded_at: new Date().toISOString(),
      };

      if (hasNumericStudentId) {
        safeRow.student_id = numericStudentId;
      }

      if (hasNumericRecordedBy) {
        safeRow.recorded_by = numericRecordedBy;
      }

      Object.keys(safeRow).forEach((key) => {
        if (safeRow[key] === undefined || safeRow[key] === null || safeRow[key] === '') {
          delete safeRow[key];
        }
      });

      const doc = await createIn(appwrite.collections.attendance, safeRow);
      created.push(doc);
    }

    return ok({ count: created.length, records: created });
  },

  update: async (id: EntityId, data: Loose): ApiResult<Loose> => ok(await updateIn(appwrite.collections.attendance, id, data)),
};

export const feesApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const rows = await listCollection(appwrite.collections.fees, params);
    const parentChildren = await getParentChildrenForScope();
    return ok(
      scopeToParentChildren(rows, parentChildren, {
        idField: 'student_id',
        studentNumberField: 'student_number',
        studentNameField: 'student_name',
      })
    );
  },

  summary: async (): ApiResult<Loose> => {
    const fees = (await feesApi.list()).data;
    const totals = fees.reduce(
      (acc, fee) => {
        acc.total_billed += Number(fee.amount || 0);
        acc.total_collected += Number(fee.amount_paid || 0);
        return acc;
      },
      { total_billed: 0, total_collected: 0 }
    );
    return ok(totals);
  },

  payments: async (feeId: EntityId): ApiResult<Loose[]> => ok(await listCollection(appwrite.collections.feePayments, { fee_id: String(feeId) })),
  create: async (data: Loose): ApiResult<Loose> => {
    if (data.student_id === undefined || data.student_id === null || String(data.student_id).trim() === '') {
      throw new Error('Student is required when creating a fee record.');
    }
    if (!String(data.fee_type || '').trim()) {
      throw new Error('Fee type is required.');
    }
    if (!String(data.term || '').trim()) {
      throw new Error('Term is required.');
    }
    if (!String(data.due_date || '').trim()) {
      throw new Error('Due date is required.');
    }

    const amount = Number(data.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a valid number greater than 0.');
    }

    const students = await listCollection(appwrite.collections.students);
    const studentRef = String(data.student_id);
    const student = students.find((item) => String(item.id) === studentRef || String(item.appwrite_id || '') === studentRef);

    if (!student) {
      throw new Error('Selected student was not found. Refresh and try again.');
    }

    const numericStudentId = Number(student.id);

    const payload: Loose = {
      fee_type: String(data.fee_type),
      amount,
      due_date: String(data.due_date),
      term: String(data.term),
      academic_year: String(data.academic_year || '2025/2026'),
      description: data.description ? String(data.description) : undefined,
      amount_paid: 0,
      balance: amount,
      payment_status: 'pending',
      student_name: student.name ? String(student.name) : undefined,
      student_number: student.student_number ? String(student.student_number) : undefined,
      class_name: student.class_name ? String(student.class_name) : undefined,
      created_at: new Date().toISOString(),
    };

    if (!Number.isNaN(numericStudentId)) {
      payload.student_id = numericStudentId;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
        delete payload[key];
      }
    });

    return ok(await createIn(appwrite.collections.fees, payload));
  },

  recordPayment: async (feeId: EntityId, data: Loose): ApiResult<Loose> => {
    const payment = await createIn(appwrite.collections.feePayments, { ...data, fee_id: feeId, payment_date: data.payment_date || new Date().toISOString() });
    const fee = await getById(appwrite.collections.fees, feeId);
    const amountPaid = Number(fee.amount_paid || 0) + Number(data.amount_paid || 0);
    const amount = Number(fee.amount || 0);
    const balance = Math.max(0, amount - amountPaid);
    const paymentStatus = balance === 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
    await updateIn(appwrite.collections.fees, feeId, { amount_paid: amountPaid, balance, payment_status: paymentStatus });
    return ok(payment);
  },
};

export const wellbeingApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const rows = await listCollection(appwrite.collections.wellbeing, params);
    const parentChildren = await getParentChildrenForScope();
    return ok(
      scopeToParentChildren(rows, parentChildren, {
        idField: 'student_id',
        studentNumberField: 'student_number',
        studentNameField: 'student_name',
      })
    );
  },
  create: async (data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.wellbeing, data)),
  update: async (id: EntityId, data: Loose): ApiResult<Loose> => ok(await updateIn(appwrite.collections.wellbeing, id, data)),
  behaviorList: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const rows = await listCollection(appwrite.collections.behavior, params);
    const parentChildren = await getParentChildrenForScope();
    return ok(
      scopeToParentChildren(rows, parentChildren, {
        idField: 'student_id',
        studentNumberField: 'student_number',
        studentNameField: 'student_name',
      })
    );
  },
  createBehavior: async (data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.behavior, data)),
};

export const messagesApi = {
  list: async (type: 'inbox' | 'sent'): ApiResult<Loose[]> => {
    const me = await currentUserId();
    const users = await listCollection(appwrite.collections.users);
    const userMap = new Map(users.map((u) => [String(u.id), u]));
    const params: Record<string, string> = type === 'inbox'
      ? { receiver_id: String(me) }
      : { sender_id: String(me) };
    const list = await listCollection(appwrite.collections.messages, params);
    const withNames = list.map((message) => ({
      ...message,
      sender_name: message.sender_name || userMap.get(String(message.sender_id))?.name,
      recipient_name: message.recipient_name || userMap.get(String(message.receiver_id))?.name,
      receiver_name: message.receiver_name || userMap.get(String(message.receiver_id))?.name,
    }));
    return ok(withNames.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  },

  inbox: async (): ApiResult<Loose[]> => messagesApi.list('inbox'),
  sent: async (): ApiResult<Loose[]> => messagesApi.list('sent'),

  contacts: async (): ApiResult<Loose[]> => {
    const users = await listCollection(appwrite.collections.users);
    return ok(users.filter((u) => u.is_active !== 0).map((u) => ({ id: u.id, name: u.name, role: u.role, email: u.email })));
  },

  send: async (data: Loose): ApiResult<Loose> => {
    const senderId = await currentUserId();
    return ok(await createIn(appwrite.collections.messages, { ...data, sender_id: senderId, is_read: 0, created_at: new Date().toISOString() }));
  },

  markRead: async (id: EntityId): ApiResult<Loose> => ok(await updateIn(appwrite.collections.messages, id, { is_read: 1 })),
};

export const announcementsApi = {
  list: async (): ApiResult<Loose[]> => {
    const me = await getCurrentProfile();
    const role = me?.role || '';
    const list = await listCollection(appwrite.collections.announcements, {});
    const filtered = list.filter((a) => {
      const target = String(a.target_roles || 'all');
      const isActive = a.is_active === undefined ? true : Boolean(a.is_active);
      const notExpired = !a.expires_at || new Date(a.expires_at).getTime() > Date.now();
      return isActive && notExpired && (target === 'all' || target.split(',').map((s: string) => s.trim()).includes(role));
    });
    return ok(filtered.map((item) => ({ ...item, author_name: item.author_name || item.created_by_name || 'System' })));
  },

  all: async (): ApiResult<Loose[]> => {
    const list = await listCollection(appwrite.collections.announcements);
    return ok(list.map((item) => ({ ...item, author_name: item.author_name || item.created_by_name || 'System' })));
  },
  listAll: async (): ApiResult<Loose[]> => announcementsApi.all(),

  create: async (data: Loose): ApiResult<Loose> => {
    const me = await currentUserId();
    return ok(await createIn(appwrite.collections.announcements, { ...data, created_by: me, is_active: 1, created_at: new Date().toISOString() }));
  },

  update: async (id: EntityId, data: Loose): ApiResult<Loose> => ok(await updateIn(appwrite.collections.announcements, id, data)),
  delete: async (id: EntityId): ApiResult<{ success: true }> => {
    await deleteIn(appwrite.collections.announcements, id);
    return ok({ success: true });
  },
};

export const notificationsApi = {
  list: async (): ApiResult<Loose[]> => {
    const userId = await currentUserId();
    return ok(await listCollection(appwrite.collections.notifications, { user_id: String(userId) }));
  },

  unreadCount: async (): ApiResult<{ count: number }> => {
    const list = (await notificationsApi.list()).data;
    const count = list.filter((n) => !Boolean(n.is_read)).length;
    return ok({ count });
  },

  markRead: async (id: EntityId): ApiResult<Loose> => ok(await updateIn(appwrite.collections.notifications, id, { is_read: 1 })),

  markAllRead: async (): ApiResult<{ success: true }> => {
    const list = (await notificationsApi.list()).data;
    for (const row of list.filter((n) => !Boolean(n.is_read))) {
      await updateIn(appwrite.collections.notifications, row.id, { is_read: 1 });
    }
    return ok({ success: true });
  },
};

export const analyticsApi = {
  overview: async (): ApiResult<Loose> => {
    const [users, students, classes, grades, attendance, fees, alerts, wellbeing] = await Promise.all([
      listCollection(appwrite.collections.users),
      listCollection(appwrite.collections.students),
      listCollection(appwrite.collections.classes),
      listCollection(appwrite.collections.grades),
      listCollection(appwrite.collections.attendance),
      listCollection(appwrite.collections.fees),
      listCollection(appwrite.collections.alerts),
      listCollection(appwrite.collections.wellbeing),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const attendanceToday = attendance.filter((a) => String(a.date || '').slice(0, 10) === today);
    const present = attendanceToday.filter((a) => a.status === 'present').length;
    const absent = attendanceToday.filter((a) => a.status === 'absent').length;

    const gradePercents = grades.map((g) => {
      const max = Number(g.max_score || 100) || 100;
      return (Number(g.score || 0) / max) * 100;
    });
    const avgPerformance = gradePercents.length ? gradePercents.reduce((a, b) => a + b, 0) / gradePercents.length : 0;

    const feeCollection = fees.reduce(
      (acc, fee) => {
        acc.total_billed += Number(fee.amount || 0);
        acc.total_collected += Number(fee.amount_paid || 0);
        return acc;
      },
      { total_billed: 0, total_collected: 0 }
    );

    const performanceByClass = classes.map((klass) => {
      const classStudents = students.filter((s) => sameValue(s.class_id, klass.id));
      const classStudentIds = new Set(classStudents.map((s) => String(s.id)));
      const classGrades = grades.filter((g) => classStudentIds.has(String(g.student_id)));
      const values = classGrades.map((g) => (Number(g.score || 0) / (Number(g.max_score || 100) || 100)) * 100);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      return {
        class_name: klass.name,
        avg_score: Number(avg.toFixed(1)),
        student_count: classStudents.length,
      };
    });

    const last14Days = [...Array(14)].map((_, idx) => {
      const d = new Date(Date.now() - (13 - idx) * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    });

    const attendanceTrend = last14Days.map((day) => {
      const rows = attendance.filter((a) => String(a.date || '').slice(0, 10) === day);
      const dayPresent = rows.filter((a) => a.status === 'present').length;
      const rate = rows.length ? (dayPresent / rows.length) * 100 : 0;
      return { date: day, rate: Number(rate.toFixed(1)) };
    });

    const bySubject = new Map<string, number[]>();
    grades.forEach((g) => {
      const key = String(g.subject_name || g.subject || g.subject_id || 'Subject');
      const values = bySubject.get(key) || [];
      const max = Number(g.max_score || 100) || 100;
      values.push((Number(g.score || 0) / max) * 100);
      bySubject.set(key, values);
    });

    const subjectPerformance = [...bySubject.entries()].map(([subject, values]) => ({
      subject,
      avg_score: Number((values.reduce((a, b) => a + b, 0) / (values.length || 1)).toFixed(1)),
    }));

    const atRiskStudents = alerts.filter((a) => !Boolean(a.resolved ?? a.is_resolved)).length;
    const attendanceRate = students.length ? (present / students.length) * 100 : 0;

    return ok({
      totalStudents: students.length,
      total_students: students.length,
      totalTeachers: users.filter((u) => u.role === 'teacher').length,
      totalParents: users.filter((u) => u.role === 'parent').length,
      totalClasses: classes.length,
      attendanceToday: { present, absent, total: attendanceToday.length },
      attendance_rate: Number(attendanceRate.toFixed(1)),
      avgPerformance: Number(avgPerformance.toFixed(1)),
      feeCollection,
      activeWarnings: atRiskStudents,
      active_warnings: atRiskStudents,
      at_risk_students: atRiskStudents,
      openWellbeing: wellbeing.filter((w) => ['open', 'in_progress', 'follow_up'].includes(String(w.status))).length,
      performanceByClass,
      class_performance: performanceByClass,
      attendanceTrend,
      attendance_trend: attendanceTrend,
      subjectPerformance,
      subject_performance: subjectPerformance,
    });
  },

  student: async (studentId: EntityId): ApiResult<Loose> => {
    const [gradeSummary, attendanceStats, warnings] = await Promise.all([
      gradesApi.summary(studentId),
      attendanceApi.stats(studentId),
      alertsApi.list({ student_id: String(studentId), resolved: 'false' }),
    ]);

    return ok({
      grades: gradeSummary.data,
      attendance: attendanceStats.data,
      warnings: warnings.data,
    });
  },

  atRisk: async (): ApiResult<Loose[]> => {
    const alerts = await listCollection(appwrite.collections.alerts, { resolved: 'false' });
    const high = alerts.filter((a) => ['high', 'critical'].includes(String(a.severity)));
    return ok(high.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  },

  events: async (): ApiResult<Loose[]> => {
    const events = await listCollection(appwrite.collections.events);
    const normalized = events.map((event) => ({
      ...event,
      start_date: event.start_date || event.event_date,
    }));
    return ok(normalized.sort((a, b) => new Date(a.start_date || a.event_date || a.date).getTime() - new Date(b.start_date || b.event_date || b.date).getTime()));
  },
};

export const alertsApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => {
    const rows = await listCollection(appwrite.collections.alerts, params);
    const parentChildren = await getParentChildrenForScope();
    const scoped = scopeToParentChildren(rows, parentChildren, {
      idField: 'student_id',
      studentNumberField: 'student_number',
      studentNameField: 'student_name',
    });

    return ok(
      scoped.map((r) => ({
        ...r,
        resolved: Boolean(r.resolved ?? r.is_resolved),
        resolution_notes: r.resolution_notes ?? r.notes,
      }))
    );
  },

  generate: async (): ApiResult<{ message: string; generated: number }> => {
    const [students, grades, attendance] = await Promise.all([
      listCollection(appwrite.collections.students),
      listCollection(appwrite.collections.grades),
      listCollection(appwrite.collections.attendance),
    ]);

    let generated = 0;
    for (const student of students) {
      const studentGrades = grades.filter((g) => sameValue(g.student_id, student.id));
      const studentAttendance = attendance.filter((a) => sameValue(a.student_id, student.id));

      const avgScore = studentGrades.length
        ? studentGrades.reduce((sum, g) => {
            const max = Number(g.max_score || 100) || 100;
            return sum + (Number(g.score || 0) / max) * 100;
          }, 0) / studentGrades.length
        : 100;

      const absenceRate = studentAttendance.length
        ? (studentAttendance.filter((a) => a.status === 'absent').length / studentAttendance.length) * 100
        : 0;

      if (avgScore >= 50 && absenceRate < 25) continue;

      const warningType = avgScore < 50 ? 'low_performance' : 'attendance_risk';
      const severity = avgScore < 40 || absenceRate > 40 ? 'high' : 'medium';
      const description = avgScore < 50
        ? `Average score is ${avgScore.toFixed(1)}%, below target.`
        : `Absence rate is ${absenceRate.toFixed(1)}%, above threshold.`;

      await createIn(appwrite.collections.alerts, {
        student_id: student.id,
        student_name: student.name,
        class_name: student.class_name,
        warning_type: warningType,
        severity,
        description,
        is_resolved: 0,
        created_at: new Date().toISOString(),
      });
      generated += 1;
    }

    return ok({ message: generated ? `Generated ${generated} new warnings.` : 'No new issues detected.', generated });
  },

  resolve: async (id: EntityId, payload?: Loose): ApiResult<Loose> => {
    const data = {
      is_resolved: 1,
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_notes: payload?.resolution_notes ?? payload?.notes ?? '',
    };
    return ok(await updateIn(appwrite.collections.alerts, id, data));
  },

  create: async (data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.alerts, data)),
};

export const usersApi = {
  list: async (params?: Record<string, string>): ApiResult<Loose[]> => ok(await listCollection(appwrite.collections.users, params)),
  create: async (data: Loose): ApiResult<Loose> => ok(await createIn(appwrite.collections.users, data)),
  update: async (id: EntityId, data: Loose): ApiResult<Loose> => ok(await updateIn(appwrite.collections.users, id, data)),

  createParentForStudent: async (
    studentId: EntityId,
    data: { name: string; email: string; phone?: string; address?: string; password: string }
  ): ApiResult<Loose> => {
    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.name || '').trim();
    if (!email || !name || !data.password) {
      throw new Error('Parent name, email and password are required.');
    }

    let parentAuthId: string | null = null;
    try {
      const account = await appwrite.account.create(appwrite.id.unique(), email, data.password, name);
      parentAuthId = account.$id;
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (!message.includes('already exists') && !message.includes('duplicate') && !message.includes('conflict')) {
        throw error;
      }
    }

    const allParents = await listCollection(appwrite.collections.users, { role: 'parent' });
    const existingParent = allParents.find((u) => String(u.email || '').trim().toLowerCase() === email);

    let parentProfile: Loose;
    const parentPayload = {
      name,
      email,
      role: 'parent',
      phone: data.phone || '',
      address: data.address || '',
      is_active: 1,
      ...(parentAuthId ? { appwrite_user_id: parentAuthId } : {}),
    };

    if (existingParent) {
      parentProfile = await updateIn(appwrite.collections.users, existingParent.id, parentPayload);
      parentAuthId = parentAuthId || existingParent.appwrite_user_id || null;
    } else {
      if (!parentAuthId) {
        throw new Error('Parent auth account exists but parent profile is missing. Create a users document for this email or use a different email.');
      }
      parentProfile = await createIn(appwrite.collections.users, parentPayload);
    }

    const linkPayload = {
      parent_id: parentProfile.id,
      parent_name: parentPayload.name,
      parent_phone: parentPayload.phone,
      parent_email: parentPayload.email,
    };

    try {
      await updateIn(appwrite.collections.students, studentId, linkPayload);
    } catch {
      const fallback = {
        parent_name: parentPayload.name,
        parent_phone: parentPayload.phone,
        parent_email: parentPayload.email,
      };
      await updateIn(appwrite.collections.students, studentId, fallback);
    }

    return ok({ parent: parentProfile, linked_student_id: studentId });
  },

  changePassword: async (_id: EntityId, data: Loose): ApiResult<{ success: true }> => {
    if (!data.newPassword || typeof data.newPassword !== 'string') {
      throw new Error('newPassword is required.');
    }
    await appwrite.account.updatePassword(data.newPassword, String(data.oldPassword || ''));
    return ok({ success: true });
  },

  toggleActive: async (id: EntityId): ApiResult<Loose> => {
    const user = await getById(appwrite.collections.users, id);
    const next = Number(user.is_active) === 1 ? 0 : 1;
    return ok(await updateIn(appwrite.collections.users, id, { is_active: next }));
  },
};
