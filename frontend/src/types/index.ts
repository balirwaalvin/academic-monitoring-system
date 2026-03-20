// ─── User & Auth ─────────────────────────────────────────────────────────────
export type Role = 'admin' | 'teacher' | 'parent' | 'student' | 'counselor';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  address?: string;
  is_active: number;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  profile: StudentProfile | ParentProfile | null;
}

// ─── Students ────────────────────────────────────────────────────────────────
export interface Student {
  id: number;
  user_id: number;
  student_number: string;
  class_id: number;
  parent_id: number;
  date_of_birth?: string;
  gender?: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  name: string;
  email: string;
  phone?: string;
  address?: string;
  class_name?: string;
  grade_level?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  class_teacher_name?: string;
  gradesSummary?: GradeSummary[];
  attSummary?: { status: string; count: number }[];
  warnings?: EarlyWarning[];
}

export interface StudentProfile {
  id: number;
  student_number: string;
  class_id: number;
  class_name: string;
  grade_level: string;
  parent_id: number;
  status: string;
}

export interface ParentProfile {
  children: { student_id: number; student_number: string; name: string; class_name: string }[];
}

// ─── Classes & Subjects ──────────────────────────────────────────────────────
export interface Class {
  id: number;
  name: string;
  grade_level: string;
  academic_year: string;
  class_teacher_id: number;
  room?: string;
  teacher_name?: string;
  student_count?: number;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  class_id: number;
  teacher_id: number;
  class_name?: string;
  teacher_name?: string;
}

// ─── Grades ──────────────────────────────────────────────────────────────────
export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  score: number;
  max_score: number;
  grade_letter: string;
  term: string;
  academic_year: string;
  assessment_type: string;
  recorded_by: number;
  notes?: string;
  recorded_at: string;
  subject_name?: string;
  subject_code?: string;
  student_name?: string;
  student_number?: string;
  class_name?: string;
  recorded_by_name?: string;
}

export interface GradeSummary {
  subject: string;
  code: string;
  term1_avg?: number;
  term2_avg?: number;
  term3_avg?: number;
  overall_avg: number;
  highest: number;
  lowest: number;
}

// ─── Attendance ──────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: number;
  student_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  recorded_by: number;
  recorded_at: string;
  student_name?: string;
  student_number?: string;
  class_name?: string;
  recorded_by_name?: string;
}

export interface AttendanceStats {
  overall: { total_days: number; present: number; absent: number; late: number; excused: number };
  recent: { status: string; count: number }[];
}

// ─── Fees ─────────────────────────────────────────────────────────────────────
export interface Fee {
  id: number;
  student_id: number;
  fee_type: string;
  amount: number;
  due_date: string;
  term: string;
  academic_year: string;
  description?: string;
  student_name?: string;
  student_number?: string;
  class_name?: string;
  amount_paid: number;
  balance: number;
  payment_status: 'paid' | 'partial' | 'overdue' | 'pending';
}

export interface FeePayment {
  id: number;
  fee_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  received_by_name?: string;
  notes?: string;
}

// ─── Wellbeing ────────────────────────────────────────────────────────────────
export interface WellbeingReport {
  id: number;
  student_id: number;
  counselor_id: number;
  session_date: string;
  mood_rating?: number;
  concern_type?: string;
  description?: string;
  interventions?: string;
  follow_up_date?: string;
  is_confidential: number;
  status: 'open' | 'in_progress' | 'resolved' | 'follow_up';
  student_name?: string;
  student_number?: string;
  class_name?: string;
  counselor_name?: string;
}

export interface BehaviorRecord {
  id: number;
  student_id: number;
  incident_date: string;
  incident_type: 'positive' | 'negative' | 'neutral';
  description: string;
  action_taken?: string;
  recorded_by: number;
  parent_notified: number;
  student_name?: string;
  student_number?: string;
  class_name?: string;
  recorded_by_name?: string;
}

// ─── Messages ────────────────────────────────────────────────────────────────
export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  subject?: string;
  content: string;
  is_read: number;
  created_at: string;
  sender_name?: string;
  sender_role?: string;
  receiver_name?: string;
  receiver_role?: string;
  recipient_name?: string;
}

// ─── Announcements ───────────────────────────────────────────────────────────
export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by: number;
  target_roles: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: number;
  expires_at?: string;
  created_at: string;
  created_by_name?: string;
  author_name?: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'warning' | 'success';
  is_read: number;
  related_type?: string;
  created_at: string;
}

// ─── Early Warnings ──────────────────────────────────────────────────────────
export interface EarlyWarning {
  id: number;
  student_id: number;
  warning_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggered_at: string;
  is_resolved: number;
  resolved?: boolean;
  resolved_by?: number;
  resolved_at?: string;
  notes?: string;
  resolution_notes?: string;
  created_at: string;
  student_name?: string;
  student_number?: string;
  class_name?: string;
  resolved_by_name?: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export interface OverviewAnalytics {
  totalStudents: number;
  total_students?: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  attendanceToday: { present: number; absent: number; total: number };
  attendance_rate?: number;
  avgPerformance: number;
  at_risk_students?: number;
  feeCollection: { total_billed: number; total_collected: number };
  activeWarnings: number;
  active_warnings?: number;
  openWellbeing: number;
  performanceByClass: { class_name: string; avg_score: number; student_count: number }[];
  class_performance?: { class_name: string; avg_score: number; student_count: number }[];
  attendanceTrend: { date: string; rate: number }[];
  attendance_trend?: { date: string; rate: number }[];
  subjectPerformance: { subject: string; avg_score: number }[];
  subject_performance?: { subject: string; avg_score: number }[];
}

// ─── Events ──────────────────────────────────────────────────────────────────
export interface Event {
  id: number;
  title: string;
  description?: string;
  event_date: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_type: string;
  target_roles: string;
  created_by: number;
}
