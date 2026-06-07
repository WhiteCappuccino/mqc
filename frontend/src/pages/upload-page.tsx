import {
  Alert,
  Button,
  Box,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { formatMediaType, normalizeAppError } from "../i18n/ui-text";
import type { MediaType } from "../types/domain";

const mediaTypes: MediaType[] = ["IMAGE", "VIDEO", "AUDIO", "TEXT", "MIXED"];

interface UploadPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Upload file",
    chooseFileOrUrl: "Choose file or provide URL",
    titleRequired: "Enter a title",
    uploadFailed: "Upload failed",
    titleLabel: "Title",
    mediaType: "Media type",
    category: "Category",
    tags: "Tags (comma separated)",
    description: "Description",
    chooseFile: "Choose file",
    selectedFile: "Selected",
    fileUrl: "Or file URL (http/https)",
    afterUpload: "After upload",
    sendToCheck: "Send to automatic check",
    keepUploaded: "Keep as uploaded",
    submit: "Submit",
  },
  ru: {
    title: "Загрузить файл",
    chooseFileOrUrl: "Выберите файл или укажите URL",
    titleRequired: "Укажите название",
    uploadFailed: "Не удалось загрузить файл",
    titleLabel: "Название",
    mediaType: "Тип медиа",
    category: "Категория",
    tags: "Теги (через запятую)",
    description: "Описание",
    chooseFile: "Выбрать файл",
    selectedFile: "Выбрано",
    fileUrl: "Или URL файла (http/https)",
    afterUpload: "После загрузки",
    sendToCheck: "Отправить на автопроверку",
    keepUploaded: "Оставить как загружено",
    submit: "Отправить",
  },
} as const;

export function UploadPage({ language }: UploadPageProps) {
  const t = copy[language];
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
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError(t.titleRequired);
      return;
    }
    if (!file && !fileUrl.trim()) {
      setError(t.chooseFileOrUrl);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const uploaded = await api.uploadMedia(
        {
          title: normalizedTitle,
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
      setError(normalizeAppError(submitError, language, t.uploadFailed));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h2">{t.title}</Typography>
      <Paper
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: "20px",
          overflow: "hidden",
        }}
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            <TextField
              label={t.titleLabel}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t.mediaType}
              value={type}
              onChange={(event) => setType(event.target.value as MediaType)}
              fullWidth
            >
              {mediaTypes.map((option) => (
                <MenuItem key={option} value={option}>
                  {formatMediaType(option, language)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t.category}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              fullWidth
            />
            <TextField
              label={t.tags}
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              fullWidth
            />
            <TextField
              label={t.description}
              multiline
              minRows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              sx={{ gridColumn: { md: "1 / -1" } }}
            />
            <Button
              component="label"
              variant="outlined"
              sx={{ minHeight: 56, justifyContent: "flex-start" }}
            >
              {file ? `${t.selectedFile}: ${file.name}` : t.chooseFile}
              <input
                hidden
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <TextField
              label={t.fileUrl}
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t.afterUpload}
              value={sendForCheck ? "check" : "draft"}
              onChange={(event) => setSendForCheck(event.target.value === "check")}
              fullWidth
            >
              <MenuItem value="check">{t.sendToCheck}</MenuItem>
              <MenuItem value="draft">{t.keepUploaded}</MenuItem>
            </TextField>
          </Box>
          <Button
            variant="contained"
            onClick={submit}
            disabled={submitting || !title.trim()}
            sx={{ alignSelf: "flex-start", minWidth: 220 }}
          >
            {t.submit}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
