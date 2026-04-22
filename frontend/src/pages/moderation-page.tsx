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
import type { MediaItem } from "../types/domain";

export function ModerationPage() {
  const { token } = useAuth();
  const [queue, setQueue] = useState<MediaItem[]>([]);
  const [violationHistory, setViolationHistory] = useState<
    { id: string; type: string; severity: string; createdAt: string }[]
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
      setViolationHistory(historyData as { id: string; type: string; severity: string; createdAt: string }[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
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
      setError(
        decisionError instanceof Error ? decisionError.message : "Decision failed",
      );
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
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Moderation queue
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {queue.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Typography variant="h6">{item.title}</Typography>
            <Typography color="text.secondary">
              status={item.status} | type={item.type}
            </Typography>
            <TextField
              label="Comment"
              size="small"
              fullWidth
              sx={{ mt: 2 }}
              value={comment[item.id] ?? ""}
              onChange={(event) =>
                setComment((prev) => ({ ...prev, [item.id]: event.target.value }))
              }
            />
            <TextField
              label="Quality level (0-100)"
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
              Approve
            </Button>
            <Button color="warning" onClick={() => decide(item.id, "NEEDS_REVISION")}>
              Request fix
            </Button>
            <Button color="error" onClick={() => decide(item.id, "REJECTED")}>
              Reject
            </Button>
          </CardActions>
        </Card>
      ))}
      {queue.length === 0 && <Typography color="text.secondary">Queue is empty</Typography>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Violation history
          </Typography>
          <Stack spacing={1}>
            {violationHistory.map((entry) => (
              <Typography key={entry.id} variant="body2">
                {entry.severity} | {entry.type} | {new Date(entry.createdAt).toLocaleString()}
              </Typography>
            ))}
            {!violationHistory.length && (
              <Typography color="text.secondary">No violations recorded</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
