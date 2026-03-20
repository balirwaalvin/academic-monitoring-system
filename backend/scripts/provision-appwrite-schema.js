const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sdk = require('node-appwrite');

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_DATABASE_NAME = 'swam_mis',
  APPWRITE_COLLECTION_USERS = 'users',
  APPWRITE_COLLECTION_STUDENTS = 'students',
  APPWRITE_COLLECTION_CLASSES = 'classes',
  APPWRITE_COLLECTION_SUBJECTS = 'subjects',
  APPWRITE_COLLECTION_GRADES = 'grades',
  APPWRITE_COLLECTION_ATTENDANCE = 'attendance',
  APPWRITE_COLLECTION_FEES = 'fees',
  APPWRITE_COLLECTION_FEE_PAYMENTS = 'fee_payments',
  APPWRITE_COLLECTION_WELLBEING = 'wellbeing_reports',
  APPWRITE_COLLECTION_BEHAVIOR = 'behavior_records',
  APPWRITE_COLLECTION_MESSAGES = 'messages',
  APPWRITE_COLLECTION_ANNOUNCEMENTS = 'announcements',
  APPWRITE_COLLECTION_NOTIFICATIONS = 'notifications',
  APPWRITE_COLLECTION_ALERTS = 'alerts',
  APPWRITE_COLLECTION_EVENTS = 'events',
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

const db = new sdk.Databases(client);

const defaultCollectionPermissions = [
  sdk.Permission.create(sdk.Role.users()),
  sdk.Permission.read(sdk.Role.users()),
  sdk.Permission.update(sdk.Role.users()),
  sdk.Permission.delete(sdk.Role.users()),
];

const collections = [
  {
    id: APPWRITE_COLLECTION_USERS,
    name: 'Users',
    attributes: [
      { type: 'string', key: 'name', size: 120, required: true },
      { type: 'email', key: 'email', required: true },
      { type: 'enum', key: 'role', elements: ['admin', 'teacher', 'parent', 'student', 'counselor'], required: true },
      { type: 'string', key: 'phone', size: 50 },
      { type: 'string', key: 'address', size: 255 },
      { type: 'string', key: 'avatar', size: 255 },
      { type: 'integer', key: 'is_active', required: false, min: 0, max: 1, xdefault: 1 },
      { type: 'string', key: 'created_at', size: 40 },
      { type: 'string', key: 'appwrite_user_id', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_CLASSES,
    name: 'Classes',
    attributes: [
      { type: 'string', key: 'name', size: 120, required: true },
      { type: 'string', key: 'grade_level', size: 60, required: true },
      { type: 'string', key: 'academic_year', size: 20 },
      { type: 'integer', key: 'class_teacher_id' },
      { type: 'string', key: 'room', size: 100 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_STUDENTS,
    name: 'Students',
    attributes: [
      { type: 'integer', key: 'user_id' },
      { type: 'string', key: 'student_number', size: 50, required: true },
      { type: 'integer', key: 'class_id' },
      { type: 'integer', key: 'parent_id' },
      { type: 'string', key: 'date_of_birth', size: 20 },
      { type: 'enum', key: 'gender', elements: ['male', 'female', 'other'], required: false },
      { type: 'string', key: 'enrollment_date', size: 20 },
      { type: 'enum', key: 'status', elements: ['active', 'inactive', 'graduated', 'suspended'], required: false },
      { type: 'string', key: 'name', size: 120 },
      { type: 'email', key: 'email', required: false },
      { type: 'string', key: 'phone', size: 50 },
      { type: 'string', key: 'address', size: 255 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'grade_level', size: 60 },
      { type: 'string', key: 'parent_name', size: 120 },
      { type: 'string', key: 'parent_phone', size: 50 },
      { type: 'email', key: 'parent_email', required: false },
      { type: 'string', key: 'class_teacher_name', size: 120 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_SUBJECTS,
    name: 'Subjects',
    attributes: [
      { type: 'string', key: 'name', size: 120, required: true },
      { type: 'string', key: 'code', size: 40, required: true },
      { type: 'integer', key: 'class_id' },
      { type: 'integer', key: 'teacher_id' },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'teacher_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_GRADES,
    name: 'Grades',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'integer', key: 'subject_id' },
      { type: 'float', key: 'score', required: true },
      { type: 'float', key: 'max_score', required: false, min: 0, max: 1000, xdefault: 100 },
      { type: 'string', key: 'grade_letter', size: 8 },
      { type: 'string', key: 'term', size: 20, required: true },
      { type: 'string', key: 'academic_year', size: 20 },
      { type: 'string', key: 'assessment_type', size: 40 },
      { type: 'integer', key: 'recorded_by' },
      { type: 'string', key: 'notes', size: 1500 },
      { type: 'string', key: 'recorded_at', size: 40 },
      { type: 'string', key: 'subject_name', size: 120 },
      { type: 'string', key: 'subject_code', size: 40 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'recorded_by_name', size: 120 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_ATTENDANCE,
    name: 'Attendance',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'string', key: 'date', size: 20, required: true },
      { type: 'enum', key: 'status', elements: ['present', 'absent', 'late', 'excused'], required: true },
      { type: 'string', key: 'notes', size: 5000 },
      { type: 'integer', key: 'recorded_by' },
      { type: 'string', key: 'recorded_at', size: 40 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'recorded_by_name', size: 120 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_FEES,
    name: 'Fees',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'string', key: 'fee_type', size: 80, required: true },
      { type: 'float', key: 'amount', required: true },
      { type: 'string', key: 'due_date', size: 20, required: true },
      { type: 'string', key: 'term', size: 20, required: true },
      { type: 'string', key: 'academic_year', size: 20 },
      { type: 'string', key: 'description', size: 1000 },
      { type: 'float', key: 'amount_paid', required: false, min: 0, max: 1000000000, xdefault: 0 },
      { type: 'float', key: 'balance', required: false, min: 0, max: 1000000000, xdefault: 0 },
      { type: 'string', key: 'payment_status', size: 20 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_FEE_PAYMENTS,
    name: 'Fee Payments',
    attributes: [
      { type: 'integer', key: 'fee_id' },
      { type: 'float', key: 'amount_paid', required: true },
      { type: 'string', key: 'payment_date', size: 40, required: true },
      { type: 'string', key: 'payment_method', size: 40 },
      { type: 'string', key: 'reference_number', size: 120 },
      { type: 'integer', key: 'received_by' },
      { type: 'string', key: 'received_by_name', size: 120 },
      { type: 'string', key: 'notes', size: 1500 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_WELLBEING,
    name: 'Wellbeing Reports',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'integer', key: 'counselor_id' },
      { type: 'string', key: 'session_date', size: 20, required: true },
      { type: 'integer', key: 'mood_rating' },
      { type: 'string', key: 'concern_type', size: 120 },
      { type: 'string', key: 'description', size: 1500 },
      { type: 'string', key: 'interventions', size: 1500 },
      { type: 'string', key: 'follow_up_date', size: 20 },
      { type: 'integer', key: 'is_confidential', required: false, min: 0, max: 1, xdefault: 1 },
      { type: 'string', key: 'status', size: 20 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'counselor_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_BEHAVIOR,
    name: 'Behavior Records',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'string', key: 'incident_date', size: 20, required: true },
      { type: 'enum', key: 'incident_type', elements: ['positive', 'negative', 'neutral'], required: true },
      { type: 'string', key: 'description', size: 1500, required: true },
      { type: 'string', key: 'action_taken', size: 1000 },
      { type: 'integer', key: 'recorded_by' },
      { type: 'integer', key: 'parent_notified', required: false, min: 0, max: 1, xdefault: 0 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'recorded_by_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_MESSAGES,
    name: 'Messages',
    attributes: [
      { type: 'integer', key: 'sender_id' },
      { type: 'integer', key: 'receiver_id' },
      { type: 'string', key: 'subject', size: 255 },
      { type: 'string', key: 'content', size: 4000, required: true },
      { type: 'integer', key: 'is_read', required: false, min: 0, max: 1, xdefault: 0 },
      { type: 'string', key: 'sender_name', size: 120 },
      { type: 'string', key: 'receiver_name', size: 120 },
      { type: 'string', key: 'recipient_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_ANNOUNCEMENTS,
    name: 'Announcements',
    attributes: [
      { type: 'string', key: 'title', size: 255, required: true },
      { type: 'string', key: 'content', size: 4000, required: true },
      { type: 'integer', key: 'created_by' },
      { type: 'string', key: 'target_roles', size: 255 },
      { type: 'enum', key: 'priority', elements: ['low', 'normal', 'medium', 'high', 'urgent'], required: false },
      { type: 'integer', key: 'is_active', required: false, min: 0, max: 1, xdefault: 1 },
      { type: 'string', key: 'expires_at', size: 40 },
      { type: 'string', key: 'created_by_name', size: 120 },
      { type: 'string', key: 'author_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_NOTIFICATIONS,
    name: 'Notifications',
    attributes: [
      { type: 'integer', key: 'user_id' },
      { type: 'string', key: 'title', size: 255, required: true },
      { type: 'string', key: 'message', size: 1200, required: true },
      { type: 'enum', key: 'type', elements: ['alert', 'info', 'warning', 'success'], required: false },
      { type: 'integer', key: 'is_read', required: false, min: 0, max: 1, xdefault: 0 },
      { type: 'string', key: 'related_type', size: 80 },
      { type: 'integer', key: 'related_id' },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_EVENTS,
    name: 'Events',
    attributes: [
      { type: 'string', key: 'title', size: 255, required: true },
      { type: 'string', key: 'description', size: 1500 },
      { type: 'string', key: 'event_date', size: 20, required: true },
      { type: 'string', key: 'start_date', size: 20 },
      { type: 'string', key: 'end_date', size: 20 },
      { type: 'string', key: 'start_time', size: 20 },
      { type: 'string', key: 'end_time', size: 20 },
      { type: 'string', key: 'location', size: 255 },
      { type: 'string', key: 'event_type', size: 80 },
      { type: 'string', key: 'target_roles', size: 255 },
      { type: 'integer', key: 'created_by' },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
  {
    id: APPWRITE_COLLECTION_ALERTS,
    name: 'Alerts',
    attributes: [
      { type: 'integer', key: 'student_id' },
      { type: 'string', key: 'warning_type', size: 120, required: true },
      { type: 'enum', key: 'severity', elements: ['low', 'medium', 'high', 'critical'], required: false },
      { type: 'string', key: 'description', size: 1500, required: true },
      { type: 'string', key: 'triggered_at', size: 40 },
      { type: 'integer', key: 'is_resolved', required: false, min: 0, max: 1, xdefault: 0 },
      { type: 'boolean', key: 'resolved', required: false, xdefault: false },
      { type: 'integer', key: 'resolved_by' },
      { type: 'string', key: 'resolved_at', size: 40 },
      { type: 'string', key: 'notes', size: 1200 },
      { type: 'string', key: 'resolution_notes', size: 1200 },
      { type: 'string', key: 'student_name', size: 120 },
      { type: 'string', key: 'student_number', size: 50 },
      { type: 'string', key: 'class_name', size: 120 },
      { type: 'string', key: 'created_at', size: 40 },
    ],
  },
];

function isAlreadyExists(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = Number(error?.code || 0);
  return code === 409 || msg.includes('already exists') || msg.includes('duplicate');
}

function isAttributeLimitError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('maximum number or size of attributes');
}

async function ensureDatabase() {
  try {
    await db.get(APPWRITE_DATABASE_ID);
    console.log(`Database exists: ${APPWRITE_DATABASE_ID}`);
  } catch (error) {
    if (Number(error?.code || 0) === 404) {
      await db.create(APPWRITE_DATABASE_ID, APPWRITE_DATABASE_NAME, true);
      console.log(`Created database: ${APPWRITE_DATABASE_ID}`);
      return;
    }
    throw error;
  }
}

async function ensureCollection(collection) {
  try {
    await db.getCollection(APPWRITE_DATABASE_ID, collection.id);
    await db.updateCollection(
      APPWRITE_DATABASE_ID,
      collection.id,
      collection.name,
      defaultCollectionPermissions,
      false,
      true
    );
    console.log(`Collection exists: ${collection.id}`);
    console.log(`  Synced permissions for: ${collection.id}`);
  } catch (error) {
    if (Number(error?.code || 0) === 404) {
      await db.createCollection(
        APPWRITE_DATABASE_ID,
        collection.id,
        collection.name,
        defaultCollectionPermissions,
        false,
        true
      );
      console.log(`Created collection: ${collection.id}`);
      return;
    }
    throw error;
  }
}

async function existingAttributeKeys(collectionId) {
  const list = await db.listAttributes(APPWRITE_DATABASE_ID, collectionId, [sdk.Query.limit(200)]);
  return new Set(list.attributes.map((a) => a.key));
}

async function createAttribute(collectionId, attr) {
  const key = attr.key;
  const required = Boolean(attr.required);

  if (attr.type === 'string') {
    return db.createStringAttribute(APPWRITE_DATABASE_ID, collectionId, key, attr.size || 255, required, attr.xdefault, false, false);
  }
  if (attr.type === 'email') {
    return db.createEmailAttribute(APPWRITE_DATABASE_ID, collectionId, key, required, attr.xdefault, false);
  }
  if (attr.type === 'integer') {
    return db.createIntegerAttribute(APPWRITE_DATABASE_ID, collectionId, key, required, attr.min, attr.max, attr.xdefault, false);
  }
  if (attr.type === 'float') {
    return db.createFloatAttribute(APPWRITE_DATABASE_ID, collectionId, key, required, attr.min, attr.max, attr.xdefault, false);
  }
  if (attr.type === 'boolean') {
    return db.createBooleanAttribute(APPWRITE_DATABASE_ID, collectionId, key, required, attr.xdefault, false);
  }
  if (attr.type === 'datetime') {
    return db.createDatetimeAttribute(APPWRITE_DATABASE_ID, collectionId, key, required, attr.xdefault, false);
  }
  if (attr.type === 'enum') {
    return db.createEnumAttribute(APPWRITE_DATABASE_ID, collectionId, key, attr.elements || [], required, attr.xdefault, false);
  }

  throw new Error(`Unsupported attribute type: ${attr.type}`);
}

async function ensureAttributes(collection) {
  const existing = await existingAttributeKeys(collection.id);
  for (const attr of collection.attributes) {
    if (existing.has(attr.key)) {
      continue;
    }

    try {
      await createAttribute(collection.id, attr);
      console.log(`  Added attribute ${collection.id}.${attr.key}`);
    } catch (error) {
      if (isAlreadyExists(error)) {
        continue;
      }
      if (isAttributeLimitError(error)) {
        console.warn(`  Skipped remaining attributes for ${collection.id}: ${error.message}`);
        break;
      }
      throw error;
    }
  }
}

async function run() {
  console.log('Provisioning Appwrite schema...');
  await ensureDatabase();

  for (const collection of collections) {
    await ensureCollection(collection);
    await ensureAttributes(collection);
  }

  console.log('Done. Appwrite database and collections are provisioned.');
}

run().catch((error) => {
  console.error('Provision failed:', error?.message || error);
  process.exit(1);
});
