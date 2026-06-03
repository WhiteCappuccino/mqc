import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import type { AccessLevel, CommentItem, MediaItem, ViolationSeverity } from "../types/domain";

const accessLevels: AccessLevel[] = ["VIEW", "COMMENT", "EDIT", "MODERATE", "MANAGE"];
const severityLevels: ViolationSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface MediaDetailsPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    loadError: "Load failed",
    analyzeError: "Analyze failed",
    addCommentError: "Failed to add comment",
    updateCommentError: "Failed to update comment",
    shareError: "Failed to share access",
    revokeError: "Failed to revoke access",
    replyError: "Failed to add reply",
    violationError: "Failed to add violation",
    violationCommentError: "Failed to add violation comment",
    versionPrompt: "Choose new file or provide URL for new version",
    versionError: "Failed to upload new version",
    notFound: "Item not found",
    author: "Author",
    version: "Version",
    runCheck: "Run auto-check",
    openObject: "Open object",
    uploadVersion: "Upload new version",
    selected: "Selected",
    chooseNextVersion: "Choose file for next version",
    fileUrl: "Or file URL (http/https)",
    checkHistory: "Check history",
    noChecks: "No checks yet",
    violationHistory: "Violation history",
    commentForViolation: "Comment for violation",
    comment: "Comment",
    noViolations: "No violations",
    addManualViolation: "Add manual violation",
    type: "Type",
    description: "Description",
    severity: "Severity",
    addViolation: "Add violation",
    accessManagement: "Access management",
    inviteByEmail: "Invite by email",
    level: "Level",
    share: "Share",
    revoke: "Revoke",
    versionHistory: "Version history",
    noPreviousVersions: "No previous versions",
    auditLog: "Audit log",
    system: "system",
    noAuditEntries: "No audit entries",
    comments: "Comments",
    markUnresolved: "Mark unresolved",
    markResolved: "Mark resolved",
    reply: "Reply",
    noComments: "No comments yet",
    addComment: "Add comment",
    post: "Post",
    falsePositive: "false positive",
    autoDetected: "Auto detected",
  },
  ru: {
    loadError: "Не удалось загрузить материал",
    analyzeError: "Не удалось запустить проверку",
    addCommentError: "Не удалось добавить комментарий",
    updateCommentError: "Не удалось обновить комментарий",
    shareError: "Не удалось выдать доступ",
    revokeError: "Не удалось отозвать доступ",
    replyError: "Не удалось добавить ответ",
    violationError: "Не удалось добавить нарушение",
    violationCommentError: "Не удалось добавить комментарий к нарушению",
    versionPrompt: "Выберите новый файл или укажите URL для новой версии",
    versionError: "Не удалось загрузить новую версию",
    notFound: "Материал не найден",
    author: "Автор",
    version: "Версия",
    runCheck: "Запустить автопроверку",
    openObject: "Открыть объект",
    uploadVersion: "Загрузить новую версию",
    selected: "Выбрано",
    chooseNextVersion: "Выбрать файл для новой версии",
    fileUrl: "Или URL файла (http/https)",
    checkHistory: "История проверок",
    noChecks: "Проверок пока нет",
    violationHistory: "История нарушений",
    commentForViolation: "Комментарий к нарушению",
    comment: "Комментарий",
    noViolations: "Нарушений пока нет",
    addManualViolation: "Добавить ручное нарушение",
    type: "Тип",
    description: "Описание",
    severity: "Критичность",
    addViolation: "Добавить нарушение",
    accessManagement: "Управление доступом",
    inviteByEmail: "Пригласить по email",
    level: "Уровень",
    share: "Поделиться",
    revoke: "Отозвать",
    versionHistory: "История версий",
    noPreviousVersions: "Предыдущих версий нет",
    auditLog: "Журнал действий",
    system: "система",
    noAuditEntries: "Записей аудита нет",
    comments: "Комментарии",
    markUnresolved: "Пометить как нерешенное",
    markResolved: "Пометить как решенное",
    reply: "Ответ",
    noComments: "Комментариев пока нет",
    addComment: "Добавить комментарий",
    post: "Отправить",
    falsePositive: "ложное срабатывание",
    autoDetected: "Автоопределение",
  },
} as const;

export function MediaDetailsPage({ language }: MediaDetailsPageProps) {
  const { id } = useParams();
  const { token } = useAuth();
  const t = copy[language];
  const [item, setItem] = useState<MediaItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; createdAt: string; actor?: { username?: string; fullName?: string } | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [shareEmail, setShareEmail] = useState("");
  const [shareLevel, setShareLevel] = useState<AccessLevel>("VIEW");
  const [manualViolationType, setManualViolationType] = useState("");
  const [manualViolationDescription, setManualViolationDescription] = useState("");
  const [manualViolationSeverity, setManualViolationSeverity] = useState<ViolationSeverity>("MEDIUM");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionFileUrl, setVersionFileUrl] = useState("");
  const [violationCommentText, setViolationCommentText] = useState<Record<string, string>>({});

  async function reload() {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [media, mediaComments, logs] = await Promise.all([
        api.getMedia(id, token),
        api.listCommentsByMedia(id, token),
        api.getMediaAudit(id, token),
      ]);
      setItem(media);
      setComments(mediaComments);
      setAuditLogs(logs as typeof auditLogs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [id, token]);

  async function analyze() {
    if (!token || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendForCheck(id, token);
      await reload();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : t.analyzeError);
    } finally {
      setBusy(false);
    }
  }

  async function createComment() {
    if (!token || !id || !newComment.trim()) return;
    setError(null);
    try {
      await api.createComment({ text: newComment.trim(), mediaItemId: id }, token);
      setNewComment("");
      await reload();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : t.addCommentError);
    }
  }

  async function resolveComment(commentId: string, isResolved: boolean) {
    if (!token) return;
    setError(null);
    try {
      await api.resolveComment(commentId, isResolved, token);
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? { ...comment, isResolved } : comment)),
      );
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : t.updateCommentError);
    }
  }

  async function shareAccess() {
    if (!token || !id || !shareEmail.trim()) return;
    setError(null);
    try {
      await api.grantMediaAccess(id, { email: shareEmail.trim(), level: shareLevel }, token);
      setShareEmail("");
      await reload();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : t.shareError);
    }
  }

  async function revokeAccess(userId: string) {
    if (!token || !id) return;
    setError(null);
    try {
      await api.revokeMediaAccess(id, userId, token);
      await reload();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : t.revokeError);
    }
  }

  async function createReply(parentId: string) {
    if (!token || !id || !replyText[parentId]?.trim()) return;
    setError(null);
    try {
      await api.createComment(
        { text: replyText[parentId].trim(), mediaItemId: id, parentId },
        token,
      );
      setReplyText((prev) => ({ ...prev, [parentId]: "" }));
      await reload();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : t.replyError);
    }
  }

  async function addManualViolation() {
    if (!token || !id || !manualViolationType.trim() || !manualViolationDescription.trim()) return;
    setError(null);
    try {
      await api.addManualViolation(
        id,
        {
          type: manualViolationType.trim(),
          description: manualViolationDescription.trim(),
          severity: manualViolationSeverity,
        },
        token,
      );
      setManualViolationType("");
      setManualViolationDescription("");
      await reload();
    } catch (violationError) {
      setError(violationError instanceof Error ? violationError.message : t.violationError);
    }
  }

  async function addViolationComment(violationId: string) {
    if (!token || !violationCommentText[violationId]?.trim()) return;
    setError(null);
    try {
      await api.createComment(
        {
          text: violationCommentText[violationId].trim(),
          violationId,
        },
        token,
      );
      setViolationCommentText((prev) => ({ ...prev, [violationId]: "" }));
      await reload();
    } catch (commentError) {
      setError(commentError instanceof Error ? commentError.message : t.violationCommentError);
    }
  }

  async function uploadVersion() {
    if (!token || !id) return;
    if (!versionFile && !versionFileUrl.trim()) {
      setError(t.versionPrompt);
      return;
    }
    setError(null);
    try {
      await api.uploadMediaVersion(
        id,
        {
          file: versionFile ?? undefined,
          fileUrl: versionFileUrl.trim() || undefined,
        },
        token,
      );
      setVersionFile(null);
      setVersionFileUrl("");
      await reload();
    } catch (versionError) {
      setError(versionError instanceof Error ? versionError.message : t.versionError);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!item) return <Alert severity="error">{t.notFound}</Alert>;

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Card>
        <CardContent>
          <Typography variant="h2">
            {item.title}
          </Typography>
          <Typography color="text.secondary">{item.description}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t.author}: {item.owner?.fullName ?? item.owner?.username ?? item.ownerId}
          </Typography>
          <Typography color="text.secondary">{t.version}: {item.version ?? 1}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip label={item.type} />
            <Chip label={item.status} color="primary" />
            <Chip label={`${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB`} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={analyze} disabled={busy}>
              {t.runCheck}
            </Button>
            {item.publicUrl && (
              <Button href={item.publicUrl} target="_blank">
                {t.openObject}
              </Button>
            )}
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t.uploadVersion}</Typography>
            <Button component="label" variant="outlined">
              {versionFile ? `${t.selected}: ${versionFile.name}` : t.chooseNextVersion}
              <input
                hidden
                type="file"
                onChange={(event) => setVersionFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <TextField
              size="small"
              label={t.fileUrl}
              value={versionFileUrl}
              onChange={(event) => setVersionFileUrl(event.target.value)}
            />
            <Button variant="outlined" onClick={uploadVersion}>
              {t.uploadVersion}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.checkHistory}
          </Typography>
          <Stack spacing={1}>
            {item.qualityChecks?.length ? (
              item.qualityChecks.map((analysis) => (
                <Typography key={analysis.id} variant="body2">
                  v{analysis.mediaVersion ?? item.version ?? 1} | {new Date(analysis.createdAt).toLocaleString()} |
                  status={analysis.status} | finalScore={analysis.finalScore}
                </Typography>
              ))
            ) : (
              <Typography color="text.secondary">{t.noChecks}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.violationHistory}
          </Typography>
          <Stack spacing={1}>
            {item.violations?.length ? (
              item.violations.map((violation) => (
                <Stack
                  key={violation.id}
                  spacing={1}
                  sx={{ border: "1px solid #e5e7eb", p: 1, borderRadius: 1 }}
                >
                  <Typography variant="body2">
                    v{violation.mediaVersion ?? item.version ?? 1} | {violation.severity} |{" "}
                    {violation.type} | {violation.description}
                    {violation.isFalsePositive ? ` | ${t.falsePositive}` : ""}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label={t.commentForViolation}
                      value={violationCommentText[violation.id] ?? ""}
                      onChange={(event) =>
                        setViolationCommentText((prev) => ({
                          ...prev,
                          [violation.id]: event.target.value,
                        }))
                      }
                      sx={{ flexGrow: 1 }}
                    />
                    <Button onClick={() => addViolationComment(violation.id)}>{t.comment}</Button>
                  </Stack>
                </Stack>
              ))
            ) : (
              <Typography color="text.secondary">{t.noViolations}</Typography>
            )}
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">{t.addManualViolation}</Typography>
            <TextField
              size="small"
              label={t.type}
              value={manualViolationType}
              onChange={(event) => setManualViolationType(event.target.value)}
            />
            <TextField
              size="small"
              label={t.description}
              value={manualViolationDescription}
              onChange={(event) => setManualViolationDescription(event.target.value)}
            />
            <TextField
              size="small"
              select
              label={t.severity}
              value={manualViolationSeverity}
              onChange={(event) => setManualViolationSeverity(event.target.value as ViolationSeverity)}
            >
              {severityLevels.map((level) => (
                <MenuItem key={level} value={level}>
                  {level}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={addManualViolation}>
              {t.addViolation}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.accessManagement}
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label={t.inviteByEmail}
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                select
                label={t.level}
                value={shareLevel}
                onChange={(event) => setShareLevel(event.target.value as AccessLevel)}
                sx={{ minWidth: 180 }}
              >
                {accessLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
              <Button onClick={shareAccess}>{t.share}</Button>
            </Stack>
            {(item.access ?? []).map((entry) => (
              <Stack key={entry.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {entry.user?.email ?? entry.userId} | {entry.level}
                </Typography>
                <Button size="small" color="error" onClick={() => revokeAccess(entry.userId)}>
                  {t.revoke}
                </Button>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.versionHistory}
          </Typography>
          <Stack spacing={1}>
            {(item.revisions ?? []).map((revision) => (
              <Typography key={revision.id} variant="body2">
                {t.version} {revision.version} | {revision.fileName} | {revision.status} |{" "}
                {new Date(revision.createdAt).toLocaleString()}
              </Typography>
            ))}
            {!(item.revisions ?? []).length && (
              <Typography color="text.secondary">{t.noPreviousVersions}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.auditLog}
          </Typography>
          <Stack spacing={1}>
            {auditLogs.map((log) => (
              <Typography key={log.id} variant="body2">
                {new Date(log.createdAt).toLocaleString()} | {log.action} |{" "}
                {log.actor?.fullName ?? log.actor?.username ?? t.system}
              </Typography>
            ))}
            {!auditLogs.length && <Typography color="text.secondary">{t.noAuditEntries}</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.comments}
          </Typography>
          <Stack spacing={1}>
            {(comments ?? []).map((comment) => (
              <Card variant="outlined" key={comment.id}>
                <CardContent>
                  <Typography variant="body2">{comment.text}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {comment.author?.fullName ?? comment.author?.username ?? comment.authorId} |{" "}
                    {new Date(comment.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button onClick={() => resolveComment(comment.id, !comment.isResolved)}>
                    {comment.isResolved ? t.markUnresolved : t.markResolved}
                  </Button>
                </CardActions>
                <CardContent>
                  <Stack spacing={1}>
                    {(comment.replies ?? []).map((reply) => (
                      <Typography key={reply.id} variant="body2" color="text.secondary">
                        {"->"} {reply.text} ({reply.author?.username ?? reply.authorId})
                      </Typography>
                    ))}
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        label={t.reply}
                        value={replyText[comment.id] ?? ""}
                        onChange={(event) =>
                          setReplyText((prev) => ({ ...prev, [comment.id]: event.target.value }))
                        }
                        sx={{ flexGrow: 1 }}
                      />
                      <Button onClick={() => createReply(comment.id)}>{t.reply}</Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {!comments.length && <Typography color="text.secondary">{t.noComments}</Typography>}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <TextField
              label={t.addComment}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              fullWidth
            />
            <Button onClick={createComment}>{t.post}</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
