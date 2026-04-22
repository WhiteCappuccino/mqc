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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import type { MediaType } from "../types/domain";

const mediaTypes: MediaType[] = ["IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"];

export function UploadPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState<MediaType>("IMAGE");
  const [sendForCheck, setSendForCheck] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!token) return;
    if (!file && !fileUrl.trim()) {
      setError("Choose file or provide URL");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const uploaded = await api.uploadMedia(
        {
          title,
          description,
          type,
          category: category || undefined,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          file: file ?? undefined,
          fileUrl: fileUrl.trim() || undefined,
        },
        token,
      );
      if (sendForCheck) {
        await api.sendForCheck(uploaded.id, token);
      }
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card sx={{ borderRadius: 3, maxWidth: 720 }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Upload media
        </Typography>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <TextField
            label="Tags (comma separated)"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <TextField
            select
            label="Media type"
            value={type}
            onChange={(event) => setType(event.target.value as MediaType)}
          >
            {mediaTypes.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <Button component="label" variant="outlined">
            {file ? `Selected: ${file.name}` : "Choose file"}
            <input
              hidden
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Button>
          <TextField
            label="Or file URL (http/https)"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
          />
          <TextField
            select
            label="After upload"
            value={sendForCheck ? "check" : "draft"}
            onChange={(event) => setSendForCheck(event.target.value === "check")}
          >
            <MenuItem value="check">Send to automatic check</MenuItem>
            <MenuItem value="draft">Keep as uploaded</MenuItem>
          </TextField>
          <Button variant="contained" onClick={submit} disabled={submitting}>
            Submit
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
