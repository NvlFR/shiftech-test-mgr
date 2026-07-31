import type {
  IssuePriority,
  IssueStatus,
  IssueType,
  ProjectMemberRole,
  ProjectStatus,
  ProjectVisibility,
  TestSuiteVisibility,
  TestCasePriority,
  TestCaseStatus,
  TestPlanStatus,
  TestResultStatus,
  TestRunStatus,
  UserRole,
} from '../types/domain';

export type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  archived: 'Arsip',
};

export const PROJECT_STATUS_SEVERITY: Record<ProjectStatus, TagSeverity> = {
  active: 'success',
  inactive: 'warning',
  archived: 'secondary',
};

export const PROJECT_VISIBILITY_LABEL: Record<ProjectVisibility, string> = {
  private: 'Privat',
  unlisted: 'Tidak Terdaftar',
  public: 'Publik',
};

export const PROJECT_VISIBILITY_SEVERITY: Record<ProjectVisibility, TagSeverity> = {
  private: 'secondary',
  unlisted: 'warning',
  public: 'success',
};

export const TEST_SUITE_VISIBILITY_LABEL: Record<TestSuiteVisibility, string> = {
  private: 'Privat',
  unlisted: 'Tidak Terdaftar',
  public: 'Publik',
};

export const TEST_SUITE_VISIBILITY_SEVERITY: Record<TestSuiteVisibility, TagSeverity> = {
  private: 'secondary',
  unlisted: 'warning',
  public: 'success',
};

export const TEST_PLAN_STATUS_LABEL: Record<TestPlanStatus, string> = {
  draft: 'Draf',
  active: 'Aktif',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

export const TEST_PLAN_STATUS_SEVERITY: Record<TestPlanStatus, TagSeverity> = {
  draft: 'info',
  active: 'success',
  completed: 'secondary',
  archived: 'warning',
};

export const TEST_CASE_STATUS_LABEL: Record<TestCaseStatus, string> = {
  active: 'Aktif',
  archived: 'Diarsipkan',
};

export const TEST_CASE_STATUS_SEVERITY: Record<TestCaseStatus, TagSeverity> = {
  active: 'success',
  archived: 'secondary',
};

export const TEST_CASE_PRIORITY_LABEL: Record<TestCasePriority, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const TEST_CASE_PRIORITY_SEVERITY: Record<TestCasePriority, TagSeverity> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const TEST_RUN_STATUS_LABEL: Record<TestRunStatus, string> = {
  in_progress: 'Berjalan',
  completed: 'Selesai',
};

export const TEST_RUN_STATUS_SEVERITY: Record<TestRunStatus, TagSeverity> = {
  in_progress: 'info',
  completed: 'success',
};

export const TEST_RESULT_STATUS_LABEL: Record<TestResultStatus, string> = {
  pass: 'Lulus',
  fail: 'Gagal',
  skip: 'Dilewati',
  blocked: 'Terblokir',
  not_run: 'Belum Dites',
};

export const TEST_RESULT_STATUS_SEVERITY: Record<TestResultStatus, TagSeverity> = {
  pass: 'success',
  fail: 'danger',
  skip: 'secondary',
  blocked: 'warning',
  not_run: 'info',
};

export const ISSUE_PRIORITY_LABEL: Record<IssuePriority, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const ISSUE_PRIORITY_SEVERITY: Record<IssuePriority, TagSeverity> = {
  low: 'secondary',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  open: 'Terbuka',
  in_progress: 'Dikerjakan',
  resolved: 'Terselesaikan',
  verified: 'Terverifikasi',
  closed: 'Ditutup',
  rejected: 'Ditolak',
  duplicate: 'Duplikat',
};

export const ISSUE_STATUS_SEVERITY: Record<IssueStatus, TagSeverity> = {
  backlog: 'secondary',
  open: 'danger',
  in_progress: 'warning',
  resolved: 'info',
  verified: 'success',
  closed: 'secondary',
  rejected: 'secondary',
  duplicate: 'secondary',
};

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  bug: 'Bug',
  feature: 'Fitur',
  improvement: 'Peningkatan',
  task: 'Task',
};

export const ISSUE_TYPE_SEVERITY: Record<IssueType, TagSeverity> = {
  bug: 'danger',
  feature: 'info',
  improvement: 'success',
  task: 'secondary',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  pending: 'Menunggu',
  user: 'User',
  admin: 'Admin',
};

export const USER_ROLE_SEVERITY: Record<UserRole, TagSeverity> = {
  pending: 'warning',
  user: 'info',
  admin: 'success',
};

export const PROJECT_MEMBER_ROLE_LABEL: Record<ProjectMemberRole, string> = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  tester: 'Tester',
  member: 'Anggota',
};

export const PROJECT_MEMBER_ROLE_SEVERITY: Record<ProjectMemberRole, TagSeverity> = {
  manager: 'success',
  supervisor: 'warning',
  tester: 'info',
  member: 'secondary',
};
