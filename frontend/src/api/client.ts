import type {
  AccessLevel,
  AuthResponse,
  CollectionItem,
  CommentItem,
  MediaItem,
  MediaStatus,
  MediaType,
  NotificationItem,
  ViolationSeverity,
  Viewer,
} from "../types/domain";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

function toQueryString(
  query?: Record<string, string | number | boolean | undefined>,
): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export interface RegisterPayload {
  email: string;
  username: string;
  fullName: string;
  password: string;
}

export interface MediaListQuery {
  q?: string;
  type?: MediaType;
  status?: MediaStatus;
  authorId?: string;
  severity?: ViolationSeverity;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "quality" | "popularity" | "status";
}

export interface UploadMediaPayload {
  title: string;
  description?: string;
  type?: MediaType;
  category?: string;
  tags?: string[];
  file?: File;
  fileUrl?: string;
}

export interface UploadMediaVersionPayload {
  title?: string;
  description?: string;
  type?: MediaType;
  category?: string;
  tags?: string[];
  file?: File;
  fileUrl?: string;
}

export interface SendForCheckPayload {
  templateId?: string;
  criteriaCodes?: string[];
  profileRequirements?: {
    maxFileSizeMb?: string;
    allowedContainers?: string[];
    allowedVideoCodecs?: string[];
    allowedAudioCodecs?: string[];
    expectedFps?: string;
    expectedMinBitrateKbps?: string;
    expectedMaxBitrateKbps?: string;
    requireAudio?: boolean;
  };
  renderRules?: Array<{
    id: string;
    name: string;
    fileNamePattern: string;
    mediaType: MediaType;
    expectedContainer?: string;
    expectedVideoCodec?: string;
    expectedAudioCodec?: string;
    expectedWidth?: string;
    expectedHeight?: string;
    expectedFps?: string;
    expectedBitrateKbps?: string;
    expectedMinDurationSec?: string;
    expectedMaxDurationSec?: string;
  }>;
}

export interface CheckTemplatePayload {
  id: string;
  appliesTo: MediaType[];
  criteriaCodes: string[];
}

export const api = {
  register(payload: RegisterPayload) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  forgotPassword(email: string) {
    return request<{ ok: true }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string) {
    return request<{ ok: true }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },

  verifyEmail(token: string) {
    return request<{ ok: true }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  logout(token: string) {
    return request<{ ok: true }>("/auth/logout", { method: "POST" }, token);
  },

  me(token: string) {
    return request<Viewer>("/users/me", { method: "GET" }, token);
  },

  getProfile(token: string) {
    return request<Viewer>("/profile", { method: "GET" }, token);
  },

  updateProfile(
    body: {
      fullName?: string;
      username?: string;
      notificationEmail?: boolean;
      notificationInApp?: boolean;
    },
    token: string,
  ) {
    return request<Viewer>("/profile", { method: "PATCH", body: JSON.stringify(body) }, token);
  },

  changePassword(
    body: {
      currentPassword: string;
      newPassword: string;
    },
    token: string,
  ) {
    return request<{ ok: true }>(
      "/profile/password",
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    );
  },

  profileHistory(token: string) {
    return request<MediaItem[]>("/profile/history", { method: "GET" }, token);
  },

  listMedia(token: string, query?: MediaListQuery) {
    return request<MediaItem[]>(
      `/media${toQueryString(query as Record<string, string | undefined>)}`,
      { method: "GET" },
      token,
    );
  },

  getMedia(id: string, token: string) {
    return request<MediaItem>(`/media/${id}`, { method: "GET" }, token);
  },

  getMediaAudit(id: string, token: string) {
    return request<
      {
        id: string;
        action: string;
        entityType: string;
        entityId?: string;
        createdAt: string;
        actor?: {
          id: string;
          email?: string;
          username?: string;
          fullName?: string;
        } | null;
      }[]
    >(`/media/${id}/audit`, { method: "GET" }, token);
  },

  uploadMedia(payload: UploadMediaPayload, token: string) {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.type) formData.append("type", payload.type);
    if (payload.category) formData.append("category", payload.category);
    if (payload.tags?.length) {
      payload.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }
    if (payload.fileUrl) formData.append("fileUrl", payload.fileUrl);
    if (payload.file) formData.append("file", payload.file);

    return request<MediaItem>("/media", { method: "POST", body: formData }, token);
  },

  uploadMediaVersion(mediaId: string, payload: UploadMediaVersionPayload, token: string) {
    const formData = new FormData();
    if (payload.title) formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.type) formData.append("type", payload.type);
    if (payload.category) formData.append("category", payload.category);
    if (payload.tags?.length) {
      payload.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }
    if (payload.fileUrl) formData.append("fileUrl", payload.fileUrl);
    if (payload.file) formData.append("file", payload.file);
    return request<MediaItem>(`/media/${mediaId}/version`, { method: "POST", body: formData }, token);
  },

  listCheckTemplates(token: string) {
    return request<CheckTemplatePayload[]>("/media/check-templates", { method: "GET" }, token);
  },

  sendForCheck(id: string, token: string, payload?: SendForCheckPayload) {
    return request(
      `/media/${id}/send-for-check`,
      { method: "POST", body: JSON.stringify(payload ?? {}) },
      token,
    );
  },

  grantMediaAccess(id: string, body: { email: string; level: AccessLevel }, token: string) {
    return request(`/media/${id}/access`, { method: "POST", body: JSON.stringify(body) }, token);
  },

  revokeMediaAccess(id: string, userId: string, token: string) {
    return request(`/media/${id}/access/${userId}`, { method: "DELETE" }, token);
  },

  moderationQueue(token: string) {
    return request<MediaItem[]>("/moderation/queue", { method: "GET" }, token);
  },

  moderationViolations(token: string) {
    return request("/moderation/violations", { method: "GET" }, token);
  },

  markViolationFalsePositive(violationId: string, isFalsePositive: boolean, token: string) {
    return request(`/moderation/violations/${violationId}/false-positive`, {
      method: "PATCH",
      body: JSON.stringify({ isFalsePositive }),
    }, token);
  },

  addManualViolation(
    mediaId: string,
    body: {
      type: string;
      description: string;
      severity: ViolationSeverity;
      marker?: string;
      coordinates?: string;
    },
    token: string,
  ) {
    return request(`/moderation/${mediaId}/violations`, {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  submitDecision(
    mediaId: string,
    body: {
      status: "APPROVED" | "REJECTED" | "NEEDS_REVISION";
      comment?: string;
      qualityLevel?: number;
    },
    token: string,
  ) {
    return request(`/moderation/${mediaId}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  listFavorites(token: string) {
    return request<{ mediaItem: MediaItem; createdAt: string }[]>(
      "/favorites",
      { method: "GET" },
      token,
    );
  },

  addFavorite(mediaId: string, token: string) {
    return request(`/favorites/${mediaId}`, { method: "POST" }, token);
  },

  removeFavorite(mediaId: string, token: string) {
    return request(`/favorites/${mediaId}`, { method: "DELETE" }, token);
  },

  listCollections(token: string) {
    return request<CollectionItem[]>("/collections", { method: "GET" }, token);
  },

  getCollection(id: string, token: string) {
    return request<CollectionItem>(`/collections/${id}`, { method: "GET" }, token);
  },

  createCollection(
    body: { name: string; description?: string; isPrivate?: boolean },
    token: string,
  ) {
    return request<CollectionItem>("/collections", { method: "POST", body: JSON.stringify(body) }, token);
  },

  updateCollection(
    id: string,
    body: { name?: string; description?: string; isPrivate?: boolean },
    token: string,
  ) {
    return request<CollectionItem>(`/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, token);
  },

  deleteCollection(id: string, token: string) {
    return request(`/collections/${id}`, { method: "DELETE" }, token);
  },

  addCollectionItem(id: string, mediaItemId: string, token: string) {
    return request(`/collections/${id}/items`, {
      method: "POST",
      body: JSON.stringify({ mediaItemId }),
    }, token);
  },

  removeCollectionItem(id: string, mediaItemId: string, token: string) {
    return request(`/collections/${id}/items/${mediaItemId}`, { method: "DELETE" }, token);
  },

  shareCollection(
    id: string,
    body: { email: string; level: AccessLevel },
    token: string,
  ) {
    return request(`/collections/${id}/collaborators`, {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  removeCollectionCollaborator(id: string, userId: string, token: string) {
    return request(`/collections/${id}/collaborators/${userId}`, { method: "DELETE" }, token);
  },

  listCommentsByMedia(mediaId: string, token: string) {
    return request<CommentItem[]>(`/comments/media/${mediaId}`, { method: "GET" }, token);
  },

  createComment(
    body: {
      text: string;
      mediaItemId?: string;
      qualityCheckId?: string;
      violationId?: string;
      parentId?: string;
    },
    token: string,
  ) {
    return request<CommentItem>("/comments", { method: "POST", body: JSON.stringify(body) }, token);
  },

  resolveComment(id: string, isResolved: boolean, token: string) {
    return request<CommentItem>(
      `/comments/${id}/resolve`,
      { method: "PATCH", body: JSON.stringify({ isResolved }) },
      token,
    );
  },

  listNotifications(token: string) {
    return request<NotificationItem[]>("/notifications", { method: "GET" }, token);
  },

  markNotificationRead(id: string, token: string) {
    return request(`/notifications/${id}/read`, { method: "PATCH" }, token);
  },

  analyticsOverview(
    token: string,
    query?: {
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return request(`/analytics/overview${toQueryString(query)}`, { method: "GET" }, token);
  },

  adminUsers(token: string) {
    return request("/admin/users", { method: "GET" }, token);
  },

  adminUpdateUserRole(userId: string, role: "USER" | "MODERATOR" | "ADMIN", token: string) {
    return request(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }, token);
  },

  adminUpdateUserStatus(userId: string, isActive: boolean, token: string) {
    return request(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }, token);
  },

  adminCriteria(token: string) {
    return request("/admin/criteria", { method: "GET" }, token);
  },

  adminUpsertCriterion(
    body: {
      code: string;
      name: string;
      description?: string;
      isActive?: boolean;
    },
    token: string,
  ) {
    return request("/admin/criteria", { method: "POST", body: JSON.stringify(body) }, token);
  },

  adminViolationDictionary(token: string) {
    return request("/admin/violations/dictionary", { method: "GET" }, token);
  },

  adminUpsertViolationDictionary(
    body: {
      code: string;
      name: string;
      description?: string;
      defaultSeverity: ViolationSeverity;
      isActive?: boolean;
    },
    token: string,
  ) {
    return request("/admin/violations/dictionary", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  adminSettings(token: string) {
    return request("/admin/settings", { method: "GET" }, token);
  },

  adminUpsertSetting(
    body: {
      key: string;
      value: string;
      description?: string;
    },
    token: string,
  ) {
    return request("/admin/settings", {
      method: "POST",
      body: JSON.stringify(body),
    }, token);
  },

  adminAuditLogs(
    token: string,
    query?: {
      actorId?: string;
      action?: string;
      entityType?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return request(`/admin/audit-logs${toQueryString(query)}`, { method: "GET" }, token);
  },

  adminUpdateMediaStatus(
    mediaId: string,
    body: { status: MediaStatus; reason?: string },
    token: string,
  ) {
    return request(`/admin/media/${mediaId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }, token);
  },

  adminDeleteMedia(mediaId: string, token: string) {
    return request(`/admin/media/${mediaId}`, { method: "DELETE" }, token);
  },
};
