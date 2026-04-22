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

export function MediaDetailsPage() {
  const { id } = useParams();
  const { token } = useAuth();
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
      setError(loadError instanceof Error ? loadError.message : "Load failed");
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
      setError(analysisError instanceof Error ? analysisError.message : "Analyze failed");
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
      setError(commentError instanceof Error ? commentError.message : "Failed to add comment");
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
      setError(resolveError instanceof Error ? resolveError.message : "Failed to update comment");
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
      setError(shareError instanceof Error ? shareError.message : "Failed to share access");
    }
  }

  async function revokeAccess(userId: string) {
    if (!token || !id) return;
    setError(null);
    try {
      await api.revokeMediaAccess(id, userId, token);
      await reload();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Failed to revoke access");
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
      setError(commentError instanceof Error ? commentError.message : "Failed to add reply");
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
      setError(violationError instanceof Error ? violationError.message : "Failed to add violation");
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
      setError(commentError instanceof Error ? commentError.message : "Failed to add violation comment");
    }
  }

  async function uploadVersion() {
    if (!token || !id) return;
    if (!versionFile && !versionFileUrl.trim()) {
      setError("Choose new file or provide URL for new version");
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
      setError(versionError instanceof Error ? versionError.message : "Failed to upload new version");
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (!item) return <Alert severity="error">Item not found</Alert>;

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {item.title}
          </Typography>
          <Typography color="text.secondary">{item.description}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Author: {item.owner?.fullName ?? item.owner?.username ?? item.ownerId}
          </Typography>
          <Typography color="text.secondary">Version: {item.version ?? 1}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip label={item.type} />
            <Chip label={item.status} color="primary" />
            <Chip label={`${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB`} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={analyze} disabled={busy}>
              Run auto-check
            </Button>
            {item.publicUrl && (
              <Button href={item.publicUrl} target="_blank">
                Open object
              </Button>
            )}
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Upload new version</Typography>
            <Button component="label" variant="outlined">
              {versionFile ? `Selected: ${versionFile.name}` : "Choose file for next version"}
              <input
                hidden
                type="file"
                onChange={(event) => setVersionFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <TextField
              size="small"
              label="Or file URL (http/https)"
              value={versionFileUrl}
              onChange={(event) => setVersionFileUrl(event.target.value)}
            />
            <Button variant="outlined" onClick={uploadVersion}>
              Upload new version
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Check history
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
              <Typography color="text.secondary">No checks yet</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Violation history
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
                    {violation.isFalsePositive ? " | false positive" : ""}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label="Comment for violation"
                      value={violationCommentText[violation.id] ?? ""}
                      onChange={(event) =>
                        setViolationCommentText((prev) => ({
                          ...prev,
                          [violation.id]: event.target.value,
                        }))
                      }
                      sx={{ flexGrow: 1 }}
                    />
                    <Button onClick={() => addViolationComment(violation.id)}>Comment</Button>
                  </Stack>
                </Stack>
              ))
            ) : (
              <Typography color="text.secondary">No violations</Typography>
            )}
          </Stack>
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Add manual violation</Typography>
            <TextField
              size="small"
              label="Type"
              value={manualViolationType}
              onChange={(event) => setManualViolationType(event.target.value)}
            />
            <TextField
              size="small"
              label="Description"
              value={manualViolationDescription}
              onChange={(event) => setManualViolationDescription(event.target.value)}
            />
            <TextField
              size="small"
              select
              label="Severity"
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
              Add violation
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Access management
          </Typography>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Invite by email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                select
                label="Level"
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
              <Button onClick={shareAccess}>Share</Button>
            </Stack>
            {(item.access ?? []).map((entry) => (
              <Stack key={entry.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {entry.user?.email ?? entry.userId} | {entry.level}
                </Typography>
                <Button size="small" color="error" onClick={() => revokeAccess(entry.userId)}>
                  Revoke
                </Button>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Version history
          </Typography>
          <Stack spacing={1}>
            {(item.revisions ?? []).map((revision) => (
              <Typography key={revision.id} variant="body2">
                Version {revision.version} | {revision.fileName} | {revision.status} |{" "}
                {new Date(revision.createdAt).toLocaleString()}
              </Typography>
            ))}
            {!(item.revisions ?? []).length && (
              <Typography color="text.secondary">No previous versions</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Audit log
          </Typography>
          <Stack spacing={1}>
            {auditLogs.map((log) => (
              <Typography key={log.id} variant="body2">
                {new Date(log.createdAt).toLocaleString()} | {log.action} |{" "}
                {log.actor?.fullName ?? log.actor?.username ?? "system"}
              </Typography>
            ))}
            {!auditLogs.length && <Typography color="text.secondary">No audit entries</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Comments
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
                    {comment.isResolved ? "Mark unresolved" : "Mark resolved"}
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
                        label="Reply"
                        value={replyText[comment.id] ?? ""}
                        onChange={(event) =>
                          setReplyText((prev) => ({ ...prev, [comment.id]: event.target.value }))
                        }
                        sx={{ flexGrow: 1 }}
                      />
                      <Button onClick={() => createReply(comment.id)}>Reply</Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {!comments.length && <Typography color="text.secondary">No comments yet</Typography>}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <TextField
              label="Add comment"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              fullWidth
            />
            <Button onClick={createComment}>Post</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
