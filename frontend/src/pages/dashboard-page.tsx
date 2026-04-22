import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  MenuItem,
  Select,
  type SelectChangeEvent,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import type { MediaItem, MediaStatus, MediaType, ViolationSeverity } from "../types/domain";

const mediaTypes: Array<MediaType | ""> = ["", "IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"];
const mediaStatuses: Array<MediaStatus | ""> = [
  "",
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
const severities: Array<ViolationSeverity | ""> = ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function DashboardPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState<MediaType | "">("");
  const [status, setStatus] = useState<MediaStatus | "">("");
  const [severity, setSeverity] = useState<ViolationSeverity | "">("");
  const [authorId, setAuthorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "quality" | "popularity" | "status">(
    "createdAt",
  );

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [media, favorites] = await Promise.all([
        api.listMedia(token, {
          q: q || undefined,
          type: type || undefined,
          status: status || undefined,
          severity: severity || undefined,
          authorId: authorId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy,
        }),
        api.listFavorites(token),
      ]);
      setItems(media);
      setFavoriteIds(favorites.map((entry) => entry.mediaItem.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function runAnalysis(id: string) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await api.sendForCheck(id, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Analyze failed");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFavorite(mediaId: string) {
    if (!token) return;
    setError(null);
    try {
      if (favoriteIds.includes(mediaId)) {
        await api.removeFavorite(mediaId, token);
      } else {
        await api.addFavorite(mediaId, token);
      }
      await load();
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Failed to update favorite");
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
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          My Media
        </Typography>
        <Button variant="contained" component={RouterLink} to="/upload">
          Upload New
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
        <TextField
          label="Search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel id="type-filter-label">Type</InputLabel>
          <Select
            labelId="type-filter-label"
            label="Type"
            value={type}
            onChange={(event: SelectChangeEvent) => setType(event.target.value as MediaType | "")}
          >
            {mediaTypes.map((option) => (
              <MenuItem key={option || "all"} value={option}>
                {option || "ALL"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            label="Status"
            value={status}
            onChange={(event: SelectChangeEvent) =>
              setStatus(event.target.value as MediaStatus | "")
            }
          >
            {mediaStatuses.map((option) => (
              <MenuItem key={option || "all"} value={option}>
                {option || "ALL"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="severity-filter-label">Severity</InputLabel>
          <Select
            labelId="severity-filter-label"
            label="Severity"
            value={severity}
            onChange={(event: SelectChangeEvent) =>
              setSeverity(event.target.value as ViolationSeverity | "")
            }
          >
            {severities.map((option) => (
              <MenuItem key={option || "all"} value={option}>
                {option || "ALL"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Author ID"
          value={authorId}
          onChange={(event) => setAuthorId(event.target.value)}
          sx={{ minWidth: 160 }}
        />
        <TextField
          label="Date from"
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 170 }}
        />
        <TextField
          label="Date to"
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 170 }}
        />
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="sort-by-label">Sort by</InputLabel>
          <Select
            labelId="sort-by-label"
            label="Sort by"
            value={sortBy}
            onChange={(event: SelectChangeEvent) =>
              setSortBy(event.target.value as "createdAt" | "quality" | "popularity" | "status")
            }
          >
            <MenuItem value="createdAt">Date</MenuItem>
            <MenuItem value="quality">Quality</MenuItem>
            <MenuItem value="popularity">Popularity</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => void load()}>
          Apply
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack spacing={2}>
        {items.map((item) => (
          <Card key={item.id} sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">{item.title}</Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                {item.type} | {item.fileName}
              </Typography>
              <Chip label={item.status} size="small" />
            </CardContent>
            <CardActions>
              <Button component={RouterLink} to={`/media/${item.id}`}>
                Open
              </Button>
              <Button onClick={() => runAnalysis(item.id)} disabled={busyId === item.id}>
                Run check
              </Button>
              <Button onClick={() => toggleFavorite(item.id)}>
                {favoriteIds.includes(item.id) ? "Unfavorite" : "Favorite"}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
