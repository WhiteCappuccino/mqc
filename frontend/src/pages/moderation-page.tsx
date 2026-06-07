import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import {
  formatMediaStatus,
  formatMediaType,
  formatSeverity,
  formatViolationCode,
  normalizeAppError,
} from "../i18n/ui-text";
import type { MediaItem } from "../types/domain";

interface ModerationPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Moderation queue",
    loadError: "Failed to load",
    decisionError: "Decision failed",
    falsePositiveError: "Failed to update false-positive flag",
    status: "status",
    type: "type",
    comment: "Comment",
    qualityLevel: "Quality level (0-100)",
    approve: "Approve",
    requestFix: "Request fix",
    reject: "Reject",
    queueEmpty: "Queue is empty",
    violationHistory: "Violation history",
    falsePositive: "false positive",
    markFp: "Mark FP",
    unmarkFp: "Unmark FP",
    noViolations: "No violations recorded",
    unknown: "n/a",
  },
  ru: {
    title: "Очередь модерации",
    loadError: "Не удалось загрузить данные",
    decisionError: "Не удалось отправить решение",
    falsePositiveError: "Не удалось обновить флаг ложного срабатывания",
    status: "статус",
    type: "тип",
    comment: "Комментарий",
    qualityLevel: "Оценка качества (0-100)",
    approve: "Одобрить",
    requestFix: "На доработку",
    reject: "Отклонить",
    queueEmpty: "Очередь пуста",
    violationHistory: "История нарушений",
    falsePositive: "ложное срабатывание",
    markFp: "Пометить как ЛС",
    unmarkFp: "Снять метку ЛС",
    noViolations: "Нарушений пока нет",
    unknown: "н/д",
  },
} as const;

export function ModerationPage({ language }: ModerationPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [violationHistory, setViolationHistory] = useState<
    {
      id: string;
      type: string;
      severity: string;
      isFalsePositive?: boolean;
      createdAt: string;
      mediaItem?: { id: string; title: string };
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [qualityLevel, setQualityLevel] = useState<Record<string, number>>({});

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [queueData, historyData] = await Promise.all([
        api.moderationQueue(token),
        api.moderationViolations(token),
      ]);
      setQueue(queueData);
      setViolationHistory(
        historyData as {
          id: string;
          type: string;
          severity: string;
          isFalsePositive?: boolean;
          createdAt: string;
          mediaItem?: { id: string; title: string };
        }[],
      );
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function decide(
    mediaId: string,
    status: "APPROVED" | "REJECTED" | "NEEDS_REVISION",
  ) {
    if (!token) return;
    setError(null);
    try {
      await api.submitDecision(
        mediaId,
        {
          status,
          comment: comment[mediaId] || undefined,
          qualityLevel: qualityLevel[mediaId] ?? undefined,
        },
        token,
      );
      await load();
    } catch (decisionError) {
      setError(normalizeAppError(decisionError, language, t.decisionError));
    }
  }

  async function toggleFalsePositive(violationId: string, currentValue: boolean | undefined) {
    if (!token) return;
    setError(null);
    try {
      await api.markViolationFalsePositive(violationId, !currentValue, token);
      await load();
    } catch (flagError) {
      setError(normalizeAppError(flagError, language, t.falsePositiveError));
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", mt: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2">
        {t.title}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {queue.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Typography variant="h6">{item.title}</Typography>
            <Typography color="text.secondary">
              {t.status}={formatMediaStatus(item.status, language)} | {t.type}={formatMediaType(item.type, language)}
            </Typography>
            <TextField
              label={t.comment}
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              value={comment[item.id] ?? ""}
              onChange={(event) =>
                setComment((prev) => ({ ...prev, [item.id]: event.target.value }))
              }
            />
            <TextField
              label={t.qualityLevel}
              type="number"
              size="small"
              sx={{ mt: 1, width: 220 }}
              value={qualityLevel[item.id] ?? ""}
              onChange={(event) =>
                setQualityLevel((prev) => ({
                  ...prev,
                  [item.id]: Number(event.target.value || 0),
                }))
              }
            />
          </CardContent>
          <CardActions>
            <Button color="success" onClick={() => decide(item.id, "APPROVED")}>
              {t.approve}
            </Button>
            <Button color="warning" onClick={() => decide(item.id, "NEEDS_REVISION")}>
              {t.requestFix}
            </Button>
            <Button color="error" onClick={() => decide(item.id, "REJECTED")}>
              {t.reject}
            </Button>
          </CardActions>
        </Card>
      ))}
      {queue.length === 0 && <Typography color="text.secondary">{t.queueEmpty}</Typography>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t.violationHistory}
          </Typography>
          <Stack spacing={1}>
            {violationHistory.map((entry) => (
              <Stack key={entry.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {formatSeverity(entry.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", language)} |{" "}
                  {formatViolationCode(entry.type, language)} | {entry.mediaItem?.title ?? t.unknown} |{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.isFalsePositive ? ` | ${t.falsePositive}` : ""}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => toggleFalsePositive(entry.id, entry.isFalsePositive)}
                >
                  {entry.isFalsePositive ? t.unmarkFp : t.markFp}
                </Button>
              </Stack>
            ))}
            {!violationHistory.length && (
              <Typography color="text.secondary">{t.noViolations}</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
