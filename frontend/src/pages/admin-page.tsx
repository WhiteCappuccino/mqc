import {
  Alert,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import {
  formatMediaStatus,
  formatRole,
  formatSeverity,
  formatViolationCode,
  normalizeAppError,
} from "../i18n/ui-text";
import type { MediaStatus, UserRole, ViolationSeverity } from "../types/domain";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";
const roles: UserRole[] = ["USER", "MODERATOR", "ADMIN"];
const severities: ViolationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const mediaStatuses: MediaStatus[] = [
  "UPLOADED",
  "IN_PROCESS",
  "AUTO_CHECKED",
  "NEEDS_MANUAL_MODERATION",
  "ON_REVISION",
  "APPROVED",
  "REJECTED",
  "PUBLISHED",
  "ARCHIVED",
];

interface AdminPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    loading: "Loading...",
    title: "Admin Console",
    loadError: "Failed to load admin data",
    downloadError: "Download failed",
    deleteSuccess: "Media removed",
    deleteError: "Failed to delete media",
    roleUpdated: "User role updated",
    roleError: "Failed to update role",
    statusUpdated: "User status updated",
    statusError: "Failed to update status",
    criterionSaved: "Criterion upserted",
    criterionError: "Failed to save criterion",
    violationSaved: "Violation dictionary item upserted",
    violationError: "Failed to save violation",
    settingSaved: "Setting saved",
    settingError: "Failed to save setting",
    mediaStatusUpdated: "Media status updated",
    mediaStatusError: "Failed to update media status",
    reports: "Reports",
    dateFrom: "Date from",
    dateTo: "Date to",
    analytics: "Analytics Overview",
    checked: "Checked materials",
    rejected: "Rejected materials",
    avgModeration: "Avg moderation time (min)",
    falsePositiveRate: "False positive rate",
    noAnalytics: "No analytics data",
    deleteMedia: "Delete media",
    mediaId: "Media ID",
    delete: "Delete",
    users: "Users and Roles",
    role: "Role",
    block: "Block",
    activate: "Activate",
    qualityCriteria: "Quality Criteria",
    code: "Code",
    name: "Name",
    weight: "Weight",
    upsert: "Upsert",
    active: "active",
    inactive: "inactive",
    violationDictionary: "Violation Dictionary",
    severity: "Severity",
    systemSettings: "System Settings",
    key: "Key",
    value: "Value",
    save: "Save",
    publishMedia: "Update media status",
    status: "Status",
    reason: "Reason",
    apply: "Apply",
    auditLog: "Audit Log",
    noLogs: "No logs yet",
  },
  ru: {
    loading: "Загрузка...",
    title: "Админ-панель",
    loadError: "Не удалось загрузить админ-данные",
    downloadError: "Не удалось скачать отчет",
    deleteSuccess: "Медиа удалено",
    deleteError: "Не удалось удалить медиа",
    roleUpdated: "Роль пользователя обновлена",
    roleError: "Не удалось обновить роль",
    statusUpdated: "Статус пользователя обновлен",
    statusError: "Не удалось обновить статус",
    criterionSaved: "Критерий сохранен",
    criterionError: "Не удалось сохранить критерий",
    violationSaved: "Элемент словаря нарушений сохранен",
    violationError: "Не удалось сохранить нарушение",
    settingSaved: "Настройка сохранена",
    settingError: "Не удалось сохранить настройку",
    mediaStatusUpdated: "Статус медиа обновлен",
    mediaStatusError: "Не удалось обновить статус медиа",
    reports: "Отчеты",
    dateFrom: "Дата от",
    dateTo: "Дата до",
    analytics: "Обзор аналитики",
    checked: "Проверено материалов",
    rejected: "Отклонено материалов",
    avgModeration: "Среднее время модерации (мин)",
    falsePositiveRate: "Доля ложных срабатываний",
    noAnalytics: "Нет данных аналитики",
    deleteMedia: "Удалить медиа",
    mediaId: "ID медиа",
    delete: "Удалить",
    users: "Пользователи и роли",
    role: "Роль",
    block: "Заблокировать",
    activate: "Активировать",
    qualityCriteria: "Критерии качества",
    code: "Код",
    name: "Название",
    weight: "Вес",
    upsert: "Сохранить",
    active: "активен",
    inactive: "неактивен",
    violationDictionary: "Словарь нарушений",
    severity: "Критичность",
    systemSettings: "Системные настройки",
    key: "Ключ",
    value: "Значение",
    save: "Сохранить",
    publishMedia: "Обновить статус медиа",
    status: "Статус",
    reason: "Причина",
    apply: "Применить",
    auditLog: "Журнал действий",
    noLogs: "Записей пока нет",
  },
} as const;

export function AdminPage({ language }: AdminPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<
    { id: string; email: string; username: string; fullName: string; role: UserRole; isActive: boolean }[]
  >([]);
  const [criteria, setCriteria] = useState<
    { id: string; code: string; name: string; weight: number; isActive: boolean }[]
  >([]);
  const [violations, setViolations] = useState<
    { id: string; code: string; name: string; defaultSeverity: ViolationSeverity; isActive: boolean }[]
  >([]);
  const [settings, setSettings] = useState<
    { id: string; key: string; value: string; description?: string }[]
  >([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; entityType: string; entityId?: string; createdAt: string }[]
  >([]);

  const [newCriterion, setNewCriterion] = useState({
    code: "",
    name: "",
    description: "",
    weight: 1,
    isActive: true,
  });
  const [newViolation, setNewViolation] = useState({
    code: "",
    name: "",
    description: "",
    defaultSeverity: "MEDIUM" as ViolationSeverity,
    isActive: true,
  });
  const [newSetting, setNewSetting] = useState({
    key: "",
    value: "",
    description: "",
  });
  const [mediaStatusForm, setMediaStatusForm] = useState({
    mediaId: "",
    status: "PUBLISHED" as MediaStatus,
    reason: "",
  });
  const [deleteMediaId, setDeleteMediaId] = useState("");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [usersData, criteriaData, violationData, settingsData, analyticsData, logsData] =
        await Promise.all([
          api.adminUsers(token),
          api.adminCriteria(token),
          api.adminViolationDictionary(token),
          api.adminSettings(token),
          api.analyticsOverview(token),
          api.adminAuditLogs(token),
        ]);
      setUsers(usersData as typeof users);
      setCriteria(criteriaData as typeof criteria);
      setViolations(violationData as typeof violations);
      setSettings(settingsData as typeof settings);
      setAnalytics(analyticsData);
      setAuditLogs((logsData as typeof auditLogs).slice(0, 30));
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function download(format: "csv" | "xlsx" | "pdf") {
    if (!token) return;
    setError(null);
    try {
      const params = new URLSearchParams({ format });
      if (reportDateFrom) params.set("dateFrom", reportDateFrom);
      if (reportDateTo) params.set("dateTo", reportDateTo);
      const response = await fetch(`${API_BASE}/reports/media?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `media-report.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(normalizeAppError(downloadError, language, t.downloadError));
    }
  }

  async function deleteMedia() {
    if (!token || !deleteMediaId.trim()) return;
    setError(null);
    try {
      await api.adminDeleteMedia(deleteMediaId.trim(), token);
      setDeleteMediaId("");
      setSuccess(t.deleteSuccess);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.deleteError));
    }
  }

  async function updateUserRole(userId: string, role: UserRole) {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpdateUserRole(userId, role, token);
      setSuccess(t.roleUpdated);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.roleError));
    }
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpdateUserStatus(userId, isActive, token);
      setSuccess(t.statusUpdated);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.statusError));
    }
  }

  async function createCriterion() {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpsertCriterion(
        {
          code: newCriterion.code,
          name: newCriterion.name,
          description: newCriterion.description || undefined,
          weight: Number(newCriterion.weight),
          isActive: newCriterion.isActive,
        },
        token,
      );
      setNewCriterion({ code: "", name: "", description: "", weight: 1, isActive: true });
      setSuccess(t.criterionSaved);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.criterionError));
    }
  }

  async function createViolation() {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpsertViolationDictionary(
        {
          code: newViolation.code,
          name: newViolation.name,
          description: newViolation.description || undefined,
          defaultSeverity: newViolation.defaultSeverity,
          isActive: newViolation.isActive,
        },
        token,
      );
      setNewViolation({
        code: "",
        name: "",
        description: "",
        defaultSeverity: "MEDIUM",
        isActive: true,
      });
      setSuccess(t.violationSaved);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.violationError));
    }
  }

  async function createSetting() {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpsertSetting(
        {
          key: newSetting.key,
          value: newSetting.value,
          description: newSetting.description || undefined,
        },
        token,
      );
      setNewSetting({ key: "", value: "", description: "" });
      setSuccess(t.settingSaved);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.settingError));
    }
  }

  async function updateMediaStatus() {
    if (!token || !mediaStatusForm.mediaId.trim()) return;
    setError(null);
    try {
      await api.adminUpdateMediaStatus(
        mediaStatusForm.mediaId.trim(),
        {
          status: mediaStatusForm.status,
          reason: mediaStatusForm.reason || undefined,
        },
        token,
      );
      setMediaStatusForm((prev) => ({ ...prev, mediaId: "", reason: "" }));
      setSuccess(t.mediaStatusUpdated);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.mediaStatusError));
    }
  }

  if (loading) {
    return <Typography>{t.loading}</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2">
        {t.title}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.reports}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              type="date"
              label={t.dateFrom}
              value={reportDateFrom}
              onChange={(event) => setReportDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label={t.dateTo}
              value={reportDateTo}
              onChange={(event) => setReportDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => download("csv")}>
              CSV
            </Button>
            <Button variant="contained" onClick={() => download("xlsx")}>
              XLSX
            </Button>
            <Button variant="contained" onClick={() => download("pdf")}>
              PDF
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.analytics}
          </Typography>
          {analytics ? (
            <Stack spacing={0.5}>
              <Typography variant="body2">{t.checked}: {analytics.checkedCount}</Typography>
              <Typography variant="body2">{t.rejected}: {analytics.rejectedCount}</Typography>
              <Typography variant="body2">
                {t.avgModeration}: {analytics.avgModerationMinutes}
              </Typography>
              <Typography variant="body2">
                {t.falsePositiveRate}: {analytics.falsePositiveRate}
              </Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary">{t.noAnalytics}</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.deleteMedia}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t.mediaId}
              value={deleteMediaId}
              onChange={(event) => setDeleteMediaId(event.target.value)}
            />
            <Button variant="contained" color="error" onClick={() => void deleteMedia()}>
              {t.delete}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.users}
          </Typography>
          <Stack spacing={1}>
            {users.map((user) => (
              <Stack
                key={user.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ alignItems: { md: "center" } }}
              >
                <Typography sx={{ minWidth: 260 }}>
                  {user.fullName} ({user.email}) [{user.username}]
                </Typography>
                <TextField
                  select
                  size="small"
                  label={t.role}
                  value={user.role}
                  onChange={(event) =>
                    void updateUserRole(user.id, event.target.value as UserRole)
                  }
                  sx={{ minWidth: 170 }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {formatRole(role, language)}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  color={user.isActive ? "warning" : "success"}
                  onClick={() => void updateUserStatus(user.id, !user.isActive)}
                >
                  {user.isActive ? t.block : t.activate}
                </Button>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.qualityCriteria}
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {criteria.map((criterion) => (
              <Typography key={criterion.id} variant="body2">
                {criterion.code} | {criterion.name} | {t.weight.toLowerCase()}={criterion.weight} |{" "}
                {criterion.isActive ? t.active : t.inactive}
              </Typography>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t.code}
              value={newCriterion.code}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, code: event.target.value }))
              }
            />
            <TextField
              size="small"
              label={t.name}
              value={newCriterion.name}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              size="small"
              type="number"
              label={t.weight}
              value={newCriterion.weight}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, weight: Number(event.target.value || 1) }))
              }
            />
            <Button variant="contained" onClick={() => void createCriterion()}>
              {t.upsert}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.violationDictionary}
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {violations.map((violation) => (
              <Typography key={violation.id} variant="body2">
                {formatViolationCode(violation.code, language)} | {formatSeverity(violation.defaultSeverity, language)} |{" "}
                {violation.isActive ? t.active : t.inactive}
              </Typography>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t.code}
              value={newViolation.code}
              onChange={(event) =>
                setNewViolation((prev) => ({ ...prev, code: event.target.value }))
              }
            />
            <TextField
              size="small"
              label={t.name}
              value={newViolation.name}
              onChange={(event) =>
                setNewViolation((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              size="small"
              select
              label={t.severity}
              value={newViolation.defaultSeverity}
              onChange={(event) =>
                setNewViolation((prev) => ({
                  ...prev,
                  defaultSeverity: event.target.value as ViolationSeverity,
                }))
              }
            >
              {severities.map((severity) => (
                <MenuItem key={severity} value={severity}>
                  {formatSeverity(severity, language)}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={() => void createViolation()}>
              {t.upsert}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.systemSettings}
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {settings.map((setting) => (
              <Typography key={setting.id} variant="body2">
                {setting.key} = {setting.value}
              </Typography>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t.key}
              value={newSetting.key}
              onChange={(event) => setNewSetting((prev) => ({ ...prev, key: event.target.value }))}
            />
            <TextField
              size="small"
              label={t.value}
              value={newSetting.value}
              onChange={(event) =>
                setNewSetting((prev) => ({ ...prev, value: event.target.value }))
              }
            />
            <Button variant="contained" onClick={() => void createSetting()}>
              {t.save}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.publishMedia}
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label={t.mediaId}
              value={mediaStatusForm.mediaId}
              onChange={(event) =>
                setMediaStatusForm((prev) => ({ ...prev, mediaId: event.target.value }))
              }
            />
            <TextField
              size="small"
              select
              label={t.status}
              value={mediaStatusForm.status}
              onChange={(event) =>
                setMediaStatusForm((prev) => ({
                  ...prev,
                  status: event.target.value as MediaStatus,
                }))
              }
            >
              {mediaStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {formatMediaStatus(status, language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label={t.reason}
              value={mediaStatusForm.reason}
              onChange={(event) =>
                setMediaStatusForm((prev) => ({ ...prev, reason: event.target.value }))
              }
            />
            <Button variant="contained" onClick={() => void updateMediaStatus()}>
              {t.apply}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.auditLog}
          </Typography>
          <Stack spacing={1}>
            {auditLogs.map((entry) => (
              <Typography key={entry.id} variant="body2">
                {new Date(entry.createdAt).toLocaleString()} | {entry.action} |{" "}
                {entry.entityType} ({entry.entityId ?? "n/a"})
              </Typography>
            ))}
            {!auditLogs.length && <Typography color="text.secondary">{t.noLogs}</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
