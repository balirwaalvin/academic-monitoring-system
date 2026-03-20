/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DATABASE_ID: string;
  readonly VITE_APPWRITE_COLLECTION_USERS?: string;
  readonly VITE_APPWRITE_COLLECTION_STUDENTS?: string;
  readonly VITE_APPWRITE_COLLECTION_CLASSES?: string;
  readonly VITE_APPWRITE_COLLECTION_SUBJECTS?: string;
  readonly VITE_APPWRITE_COLLECTION_GRADES?: string;
  readonly VITE_APPWRITE_COLLECTION_ATTENDANCE?: string;
  readonly VITE_APPWRITE_COLLECTION_FEES?: string;
  readonly VITE_APPWRITE_COLLECTION_FEE_PAYMENTS?: string;
  readonly VITE_APPWRITE_COLLECTION_WELLBEING?: string;
  readonly VITE_APPWRITE_COLLECTION_BEHAVIOR?: string;
  readonly VITE_APPWRITE_COLLECTION_MESSAGES?: string;
  readonly VITE_APPWRITE_COLLECTION_ANNOUNCEMENTS?: string;
  readonly VITE_APPWRITE_COLLECTION_NOTIFICATIONS?: string;
  readonly VITE_APPWRITE_COLLECTION_ALERTS?: string;
  readonly VITE_APPWRITE_COLLECTION_EVENTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
