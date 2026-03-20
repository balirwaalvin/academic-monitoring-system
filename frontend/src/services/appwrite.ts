import { Account, Client, Databases, Functions, ID } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

if (!endpoint || !projectId || !databaseId) {
  console.warn('Appwrite is not fully configured. Set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and VITE_APPWRITE_DATABASE_ID.');
}

const client = new Client()
  .setEndpoint(endpoint || 'https://cloud.appwrite.io/v1')
  .setProject(projectId || '');

export const appwrite = {
  client,
  account: new Account(client),
  databases: new Databases(client),
  functions: new Functions(client),
  id: ID,
  databaseId: databaseId || '',
  collections: {
    users: import.meta.env.VITE_APPWRITE_COLLECTION_USERS || 'users',
    students: import.meta.env.VITE_APPWRITE_COLLECTION_STUDENTS || 'students',
    classes: import.meta.env.VITE_APPWRITE_COLLECTION_CLASSES || 'classes',
    subjects: import.meta.env.VITE_APPWRITE_COLLECTION_SUBJECTS || 'subjects',
    grades: import.meta.env.VITE_APPWRITE_COLLECTION_GRADES || 'grades',
    attendance: import.meta.env.VITE_APPWRITE_COLLECTION_ATTENDANCE || 'attendance',
    fees: import.meta.env.VITE_APPWRITE_COLLECTION_FEES || 'fees',
    feePayments: import.meta.env.VITE_APPWRITE_COLLECTION_FEE_PAYMENTS || 'fee_payments',
    wellbeing: import.meta.env.VITE_APPWRITE_COLLECTION_WELLBEING || 'wellbeing_reports',
    behavior: import.meta.env.VITE_APPWRITE_COLLECTION_BEHAVIOR || 'behavior_records',
    messages: import.meta.env.VITE_APPWRITE_COLLECTION_MESSAGES || 'messages',
    announcements: import.meta.env.VITE_APPWRITE_COLLECTION_ANNOUNCEMENTS || 'announcements',
    notifications: import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications',
    alerts: import.meta.env.VITE_APPWRITE_COLLECTION_ALERTS || 'alerts',
    events: import.meta.env.VITE_APPWRITE_COLLECTION_EVENTS || 'events',
  },
};
