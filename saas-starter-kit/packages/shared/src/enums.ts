// Shared enums used across backend entities, DTOs, and frontend guards.

export enum PlanType {
  FREE = "free",
  TRIAL = "trial",
  MONTHLY = "monthly",
  ANNUAL = "annual",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  TRIALING = "trialing",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
  INCOMPLETE = "incomplete",
  UNPAID = "unpaid",
}

export enum UserStatus {
  PENDING = "pending", // email not verified
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
  DELETED = "deleted",
}

export enum AuthProvider {
  EMAIL = "email",
  GOOGLE = "google",
}

export enum TwoFactorMethod {
  NONE = "none",
  TOTP = "totp",
  WEBAUTHN = "webauthn",
}

export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  REALTIME = "realtime",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}

export enum FileVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum RoleName {
  SUPER_ADMIN = "super_admin",
  ORG_OWNER = "org_owner",
  ADMIN = "admin",
  MANAGER = "manager",
  MEMBER = "member",
  VIEWER = "viewer",
}

export enum MembershipStatus {
  INVITED = "invited",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

// Permission groups => individual permissions. Use the string form
// `${resource}.${action}` consistently (e.g. "project.create").
export enum Permission {
  // Platform (super admin)
  PLATFORM_READ = "platform.read",
  PLATFORM_MANAGE = "platform.manage",
  PLATFORM_USERS_MANAGE = "platform.users.manage",
  PLATFORM_ORGS_MANAGE = "platform.orgs.manage",
  PLATFORM_BILLING_MANAGE = "platform.billing.manage",
  PLATFORM_FEATURE_FLAGS = "platform.feature_flags",

  // Organization
  ORG_READ = "org.read",
  ORG_UPDATE = "org.update",
  ORG_DELETE = "org.delete",
  ORG_MEMBERS_INVITE = "org.members.invite",
  ORG_MEMBERS_REMOVE = "org.members.remove",
  ORG_MEMBERS_ROLE = "org.members.role",
  ORG_BILLING_READ = "org.billing.read",
  ORG_BILLING_MANAGE = "org.billing.manage",
  ORG_SETTINGS_MANAGE = "org.settings.manage",

  // Users
  USER_READ = "user.read",
  USER_UPDATE = "user.update",
  USER_DELETE = "user.delete",

  // Projects
  PROJECT_READ = "project.read",
  PROJECT_CREATE = "project.create",
  PROJECT_UPDATE = "project.update",
  PROJECT_DELETE = "project.delete",
  PROJECT_TASK_READ = "project.task.read",
  PROJECT_TASK_CREATE = "project.task.create",
  PROJECT_TASK_UPDATE = "project.task.update",
  PROJECT_TASK_DELETE = "project.task.delete",

  // AI
  AI_CHAT = "ai.chat",
  AI_ASSISTANT = "ai.assistant",
  AI_PROMPT_MANAGE = "ai.prompt.manage",
  AI_USAGE_READ = "ai.usage.read",

  // Files
  FILE_READ = "file.read",
  FILE_UPLOAD = "file.upload",
  FILE_DELETE = "file.delete",

  // Audit
  AUDIT_READ = "audit.read",

  // Notifications
  NOTIFICATION_READ = "notification.read",
  NOTIFICATION_MANAGE = "notification.manage",

  // Dashboard / Analytics
  DASHBOARD_READ = "dashboard.read",
  ANALYTICS_REVENUE_READ = "analytics.revenue.read",
  ANALYTICS_USER_READ = "analytics.user.read",
}

// Default permission sets per role. RoleName.SUPER_ADMIN is handled specially
// (bypasses all guards); everything else resolves through this map.
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SUPER_ADMIN]: Object.values(Permission),

  [RoleName.ORG_OWNER]: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_DELETE,
    Permission.ORG_MEMBERS_INVITE,
    Permission.ORG_MEMBERS_REMOVE,
    Permission.ORG_MEMBERS_ROLE,
    Permission.ORG_BILLING_READ,
    Permission.ORG_BILLING_MANAGE,
    Permission.ORG_SETTINGS_MANAGE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_TASK_READ,
    Permission.PROJECT_TASK_CREATE,
    Permission.PROJECT_TASK_UPDATE,
    Permission.PROJECT_TASK_DELETE,
    Permission.AI_CHAT,
    Permission.AI_ASSISTANT,
    Permission.AI_PROMPT_MANAGE,
    Permission.AI_USAGE_READ,
    Permission.FILE_READ,
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.AUDIT_READ,
    Permission.NOTIFICATION_READ,
    Permission.NOTIFICATION_MANAGE,
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_REVENUE_READ,
    Permission.ANALYTICS_USER_READ,
  ],

  [RoleName.ADMIN]: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MEMBERS_INVITE,
    Permission.ORG_MEMBERS_REMOVE,
    Permission.ORG_MEMBERS_ROLE,
    Permission.ORG_BILLING_READ,
    Permission.ORG_SETTINGS_MANAGE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_TASK_READ,
    Permission.PROJECT_TASK_CREATE,
    Permission.PROJECT_TASK_UPDATE,
    Permission.PROJECT_TASK_DELETE,
    Permission.AI_CHAT,
    Permission.AI_ASSISTANT,
    Permission.AI_PROMPT_MANAGE,
    Permission.FILE_READ,
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.AUDIT_READ,
    Permission.NOTIFICATION_READ,
    Permission.NOTIFICATION_MANAGE,
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_USER_READ,
  ],

  [RoleName.MANAGER]: [
    Permission.ORG_READ,
    Permission.ORG_MEMBERS_INVITE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_TASK_READ,
    Permission.PROJECT_TASK_CREATE,
    Permission.PROJECT_TASK_UPDATE,
    Permission.PROJECT_TASK_DELETE,
    Permission.AI_CHAT,
    Permission.AI_ASSISTANT,
    Permission.FILE_READ,
    Permission.FILE_UPLOAD,
    Permission.NOTIFICATION_READ,
    Permission.DASHBOARD_READ,
  ],

  [RoleName.MEMBER]: [
    Permission.ORG_READ,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_TASK_READ,
    Permission.PROJECT_TASK_CREATE,
    Permission.PROJECT_TASK_UPDATE,
    Permission.AI_CHAT,
    Permission.FILE_READ,
    Permission.FILE_UPLOAD,
    Permission.NOTIFICATION_READ,
    Permission.DASHBOARD_READ,
  ],

  [RoleName.VIEWER]: [
    Permission.ORG_READ,
    Permission.USER_READ,
    Permission.PROJECT_READ,
    Permission.PROJECT_TASK_READ,
    Permission.AI_CHAT,
    Permission.FILE_READ,
    Permission.NOTIFICATION_READ,
    Permission.DASHBOARD_READ,
  ],
};

export const ALL_ROLES = Object.values(RoleName);
