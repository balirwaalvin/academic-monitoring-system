const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sdk = require('node-appwrite');

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_USERS = 'users',
  APPWRITE_COLLECTION_STUDENTS = 'students',
  APPWRITE_COLLECTION_CLASSES = 'classes',
  APPWRITE_BOOTSTRAP_PASSWORD = 'password123',
} = process.env;

const required = [
  ['APPWRITE_ENDPOINT', APPWRITE_ENDPOINT],
  ['APPWRITE_PROJECT_ID', APPWRITE_PROJECT_ID],
  ['APPWRITE_API_KEY', APPWRITE_API_KEY],
  ['APPWRITE_DATABASE_ID', APPWRITE_DATABASE_ID],
];

const missing = required.filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const usersApi = new sdk.Users(client);
const db = new sdk.Databases(client);

const roleAccounts = [
  { name: 'Dr. Nakaddu Brevian', email: 'admin@brevian.ac.ug', role: 'admin' },
  { name: 'Mrs. Sarah Namaganda', email: 'sarah.namaganda@brevian.ac.ug', role: 'teacher' },
  { name: 'Dr. Patricia Namutebi', email: 'counselor@brevian.ac.ug', role: 'counselor' },
  { name: 'Mr. James Mugisha', email: 'james.mugisha@gmail.com', role: 'parent' },
];

const studentEmail = 'emma.namukasa@brevian.ac.ug';

async function findAuthUserByEmail(email) {
  const list = await usersApi.list([sdk.Query.equal('email', email), sdk.Query.limit(1)]);
  return list.users[0] || null;
}

async function listUserDocsByEmail(email) {
  const list = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, [
    sdk.Query.equal('email', email),
    sdk.Query.limit(10),
  ]);
  return list.documents;
}

async function upsertUserDoc(account) {
  const existingDocs = await listUserDocsByEmail(account.email);
  const payload = {
    name: account.name,
    email: account.email,
    role: account.role,
    is_active: 1,
    appwrite_user_id: account.$id,
  };

  if (existingDocs.length) {
    for (const doc of existingDocs) {
      await db.updateDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, doc.$id, payload);
    }
    return;
  }

  await db.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, sdk.ID.unique(), payload);
}

async function createOrUpdateRoleAccount(seed) {
  let account = await findAuthUserByEmail(seed.email);

  if (!account) {
    account = await usersApi.create(
      sdk.ID.unique(),
      seed.email,
      undefined,
      APPWRITE_BOOTSTRAP_PASSWORD,
      seed.name
    );
    console.log(`Created auth user: ${seed.email}`);
  } else {
    await usersApi.updateName(account.$id, seed.name);
    await usersApi.updatePassword(account.$id, APPWRITE_BOOTSTRAP_PASSWORD);
    console.log(`Updated auth user: ${seed.email}`);
  }

  await upsertUserDoc({ ...seed, $id: account.$id });
}

async function removeStudentAccount() {
  const studentAuth = await findAuthUserByEmail(studentEmail);
  if (studentAuth) {
    await usersApi.delete(studentAuth.$id);
    console.log(`Deleted auth student account: ${studentEmail}`);
  }

  const studentUserDocs = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, [
    sdk.Query.equal('role', 'student'),
    sdk.Query.limit(100),
  ]);

  for (const doc of studentUserDocs.documents) {
    await db.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, doc.$id);
  }

  const byEmailDocs = await listUserDocsByEmail(studentEmail);
  for (const doc of byEmailDocs) {
    await db.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, doc.$id);
  }

  // Optional cleanup if you also keep student profile collection.
  try {
    const studentProfiles = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_STUDENTS, [
      sdk.Query.equal('email', studentEmail),
      sdk.Query.limit(20),
    ]);
    for (const profile of studentProfiles.documents) {
      await db.deleteDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_STUDENTS, profile.$id);
    }
  } catch {
    // Ignore if collection or attribute mapping differs.
  }
}

async function ensureDefaultClasses() {
  const classes = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CLASSES, [sdk.Query.limit(10)]);
  if (classes.total > 0) {
    console.log(`Classes already exist (${classes.total}).`);
    return;
  }

  const teachers = await db.listDocuments(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_USERS, [
    sdk.Query.equal('role', 'teacher'),
    sdk.Query.limit(20),
  ]);

  const teacherIds = teachers.documents.map((doc) => doc.id).filter(Boolean);
  const defaults = [
    { name: 'Primary 1', grade_level: 'Primary 1', room: 'Block A - P1' },
    { name: 'Primary 2', grade_level: 'Primary 2', room: 'Block A - P2' },
    { name: 'Primary 3', grade_level: 'Primary 3', room: 'Block A - P3' },
    { name: 'Primary 4', grade_level: 'Primary 4', room: 'Block B - P4' },
    { name: 'Primary 5', grade_level: 'Primary 5', room: 'Block B - P5' },
    { name: 'Primary 6', grade_level: 'Primary 6', room: 'Block B - P6' },
    { name: 'Primary 7', grade_level: 'Primary 7', room: 'Block C - P7' },
  ];

  for (let i = 0; i < defaults.length; i += 1) {
    const item = defaults[i];
    await db.createDocument(APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_CLASSES, sdk.ID.unique(), {
      ...item,
      academic_year: '2025/2026',
      class_teacher_id: teacherIds.length ? teacherIds[i % teacherIds.length] : null,
      created_at: new Date().toISOString(),
    });
  }

  console.log(`Seeded ${defaults.length} default classes.`);
}

async function run() {
  console.log('Bootstrapping Appwrite role accounts...');
  for (const account of roleAccounts) {
    await createOrUpdateRoleAccount(account);
  }

  await removeStudentAccount();
  await ensureDefaultClasses();
  console.log('Done. Active accounts restored for admin, teacher, counselor, and parent.');
  console.log(`All restored accounts use password: ${APPWRITE_BOOTSTRAP_PASSWORD}`);
}

run().catch((error) => {
  console.error('Bootstrap failed:', error?.message || error);
  process.exit(1);
});
