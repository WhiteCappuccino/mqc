export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "MIXED";
export type AccessLevel = "VIEW" | "COMMENT" | "EDIT" | "MODERATE" | "MANAGE";
export type ViolationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type MediaStatus =
  | "UPLOADED"
  | "IN_PROCESS"
  | "AUTO_CHECKED"
  | "NEEDS_MANUAL_MODERATION"
  | "ON_REVISION"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export interface AuthResponse {
  accessToken: string;
  userId: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  verificationToken?: string;
}

export interface Viewer {
  id?: string;
  sub?: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  emailVerified: boolean;
  notificationEmail?: boolean;
  notificationInApp?: boolean;
}

export interface UserSummary {
  id: string;
  email?: string;
  username?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface Violation {
  id: string;
  type: string;
  description: string;
  severity: ViolationSeverity;
  marker?: string | null;
  coordinates?: string | null;
  source: "SYSTEM" | "MODERATOR";
  createdAt: string;
}

export interface QualityCheck {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "NEEDS_MANUAL_REVIEW";
  autoScore: number;
  finalScore: number;
  falsePositive: number;
  createdAt: string;
  finishedAt?: string | null;
  violations?: Violation[];
}

export interface ModerationDecisionEntry {
  id: string;
  status: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
  qualityLevel?: number | null;
  comment?: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  type: MediaType;
  status: MediaStatus;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  tags?: { tag: { id: string; name: string } }[];
  ownerId?: string;
  owner?: UserSummary;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
  qualityChecks?: QualityCheck[];
  violations?: Violation[];
  decisions?: ModerationDecisionEntry[];
  comments?: CommentItem[];
  access?: { id: string; userId: string; level: AccessLevel; user?: UserSummary }[];
  _count?: { favorites: number };
  publicUrl?: string;
}

export interface CommentItem {
  id: string;
  text: string;
  isResolved: boolean;
  createdAt: string;
  authorId: string;
  author?: UserSummary;
  replies?: CommentItem[];
}

export interface NotificationItem {
  id: string;
  type: string;
  channel: "IN_APP" | "EMAIL";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  owner?: UserSummary;
  collaborators?: {
    id: string;
    userId: string;
    level: AccessLevel;
    user?: UserSummary;
  }[];
  items?: {
    mediaItemId: string;
    mediaItem: MediaItem;
  }[];
}
