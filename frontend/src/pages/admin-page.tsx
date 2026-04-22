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

export function AdminPage() {
  const { token } = useAuth();
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load admin data");
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
      setError(downloadError instanceof Error ? downloadError.message : "Download failed");
    }
  }

  async function deleteMedia() {
    if (!token || !deleteMediaId.trim()) return;
    setError(null);
    try {
      await api.adminDeleteMedia(deleteMediaId.trim(), token);
      setDeleteMediaId("");
      setSuccess("Media removed");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete media");
    }
  }

  async function updateUserRole(userId: string, role: UserRole) {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpdateUserRole(userId, role, token);
      setSuccess("User role updated");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update role");
    }
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    if (!token) return;
    setError(null);
    try {
      await api.adminUpdateUserStatus(userId, isActive, token);
      setSuccess("User status updated");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update status");
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
      setSuccess("Criterion upserted");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to save criterion");
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
      setSuccess("Violation dictionary item upserted");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to save violation");
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
      setSuccess("Setting saved");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to save setting");
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
      setSuccess("Media status updated");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update media status");
    }
  }

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Admin Console
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Reports
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              type="date"
              label="Date from"
              value={reportDateFrom}
              onChange={(event) => setReportDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label="Date to"
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
            Analytics Overview
          </Typography>
          {analytics ? (
            <Stack spacing={0.5}>
              <Typography variant="body2">Checked materials: {analytics.checkedCount}</Typography>
              <Typography variant="body2">Rejected materials: {analytics.rejectedCount}</Typography>
              <Typography variant="body2">
                Avg moderation time (min): {analytics.avgModerationMinutes}
              </Typography>
              <Typography variant="body2">
                False positive rate: {analytics.falsePositiveRate}
              </Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary">No analytics data</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Delete media
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Media ID"
              value={deleteMediaId}
              onChange={(event) => setDeleteMediaId(event.target.value)}
            />
            <Button variant="contained" color="error" onClick={() => void deleteMedia()}>
              Delete
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Users and Roles
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
                  label="Role"
                  value={user.role}
                  onChange={(event) =>
                    void updateUserRole(user.id, event.target.value as UserRole)
                  }
                  sx={{ minWidth: 170 }}
                >
                  {roles.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="outlined"
                  color={user.isActive ? "warning" : "success"}
                  onClick={() => void updateUserStatus(user.id, !user.isActive)}
                >
                  {user.isActive ? "Block" : "Activate"}
                </Button>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Quality Criteria
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {criteria.map((criterion) => (
              <Typography key={criterion.id} variant="body2">
                {criterion.code} | {criterion.name} | weight={criterion.weight} |{" "}
                {criterion.isActive ? "active" : "inactive"}
              </Typography>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Code"
              value={newCriterion.code}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, code: event.target.value }))
              }
            />
            <TextField
              size="small"
              label="Name"
              value={newCriterion.name}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              size="small"
              type="number"
              label="Weight"
              value={newCriterion.weight}
              onChange={(event) =>
                setNewCriterion((prev) => ({ ...prev, weight: Number(event.target.value || 1) }))
              }
            />
            <Button variant="contained" onClick={() => void createCriterion()}>
              Upsert
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Violation Dictionary
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {violations.map((violation) => (
              <Typography key={violation.id} variant="body2">
                {violation.code} | {violation.name} | {violation.defaultSeverity} |{" "}
                {violation.isActive ? "active" : "inactive"}
              </Typography>
            ))}
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Code"
              value={newViolation.code}
              onChange={(event) =>
                setNewViolation((prev) => ({ ...prev, code: event.target.value }))
              }
            />
            <TextField
              size="small"
              label="Name"
              value={newViolation.name}
              onChange={(event) =>
                setNewViolation((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              size="small"
              select
              label="Severity"
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
                  {severity}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="contained" onClick={() => void createViolation()}>
              Upsert
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            System Settings
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
              label="Key"
              value={newSetting.key}
              onChange={(event) => setNewSetting((prev) => ({ ...prev, key: event.target.value }))}
            />
            <TextField
              size="small"
              label="Value"
              value={newSetting.value}
              onChange={(event) =>
                setNewSetting((prev) => ({ ...prev, value: event.target.value }))
              }
            />
            <Button variant="contained" onClick={() => void createSetting()}>
              Save
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Moderate Published Content
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Media ID"
              value={mediaStatusForm.mediaId}
              onChange={(event) =>
                setMediaStatusForm((prev) => ({ ...prev, mediaId: event.target.value }))
              }
            />
            <TextField
              size="small"
              select
              label="Status"
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
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Reason"
              value={mediaStatusForm.reason}
              onChange={(event) =>
                setMediaStatusForm((prev) => ({ ...prev, reason: event.target.value }))
              }
            />
            <Button variant="contained" onClick={() => void updateMediaStatus()}>
              Update
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Audit Log (latest)
          </Typography>
          <Stack spacing={1}>
            {auditLogs.map((entry) => (
              <Typography key={entry.id} variant="body2">
                {new Date(entry.createdAt).toLocaleString()} | {entry.action} |{" "}
                {entry.entityType} ({entry.entityId ?? "n/a"})
              </Typography>
            ))}
            {!auditLogs.length && <Typography color="text.secondary">No logs yet</Typography>}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
