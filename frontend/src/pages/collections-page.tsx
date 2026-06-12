import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { getCustomCheckTemplates, type CheckTemplate } from "../check/check-templates";
import { formatAccessLevel, formatMediaType, normalizeAppError } from "../i18n/ui-text";
import type { AccessLevel, CollectionItem, MediaItem } from "../types/domain";

const accessLevels: AccessLevel[] = ["VIEW", "COMMENT", "EDIT", "MODERATE", "MANAGE"];

interface CollectionsPageProps {
  language: "en" | "ru";
}

const copy = {
  en: {
    title: "Collections",
    createCollection: "Create collection",
    name: "Name",
    description: "Description",
    privateCollection: "Private collection",
    create: "Create",
    private: "Private",
    public: "Public",
    items: "items",
    remove: "Remove",
    mediaId: "Media ID",
    existingMedia: "Existing media",
    addItem: "Add item",
    shareEmail: "Share email",
    accessLevel: "Access level",
    share: "Share",
    editCollection: "Edit collection",
    saveChanges: "Save changes",
    delete: "Delete",
    loadError: "Failed to load collections",
    createError: "Failed to create",
    addItemError: "Failed to add item",
    shareError: "Failed to share collection",
    deleteError: "Failed to delete collection",
    updateError: "Failed to update collection",
    removeItemError: "Failed to remove item",
    removeCollaboratorError: "Failed to remove collaborator",
    runCollectionCheck: "Run collection check",
    runCheck: "Run checks",
    runCheckError: "Failed to run collection check",
    mediaTypeFilter: "Media type in collection",
    templateForType: "Template for type",
    allTypes: "All types",
    done: "Done",
    noCollections: "No collections yet",
    noMediaAvailable: "No available media",
    previewUnavailable: "Preview unavailable",
    untitled: "Untitled file",
  },
  ru: {
    title: "Коллекции",
    createCollection: "Создать коллекцию",
    name: "Название",
    description: "Описание",
    privateCollection: "Приватная коллекция",
    create: "Создать",
    private: "Приватная",
    public: "Публичная",
    items: "элементов",
    remove: "Убрать",
    mediaId: "ID медиа",
    existingMedia: "Существующие медиафайлы",
    addItem: "Добавить",
    shareEmail: "Email для доступа",
    accessLevel: "Уровень доступа",
    share: "Поделиться",
    editCollection: "Редактировать коллекцию",
    saveChanges: "Сохранить изменения",
    delete: "Удалить",
    loadError: "Не удалось загрузить коллекции",
    createError: "Не удалось создать коллекцию",
    addItemError: "Не удалось добавить элемент",
    shareError: "Не удалось открыть доступ к коллекции",
    deleteError: "Не удалось удалить коллекцию",
    updateError: "Не удалось обновить коллекцию",
    removeItemError: "Не удалось убрать элемент",
    removeCollaboratorError: "Не удалось удалить участника",
    runCollectionCheck: "Проверка коллекции",
    runCheck: "Запустить проверки",
    runCheckError: "Не удалось запустить проверку коллекции",
    mediaTypeFilter: "Тип медиа в коллекции",
    templateForType: "Шаблон для типа",
    allTypes: "Все типы",
    done: "Готово",
    noCollections: "Коллекций пока нет",
    noMediaAvailable: "Нет доступных медиафайлов",
    previewUnavailable: "Превью недоступно",
    untitled: "Файл без названия",
  },
} as const;

function renderCollectionMediaPreview(
  media: MediaItem,
  language: "en" | "ru",
  t: (typeof copy)["en"] | (typeof copy)["ru"],
) {
  if (media.type === "IMAGE" && media.previewUrl) {
    return (
      <Box
        component="img"
        src={media.previewUrl}
        alt={media.title || media.fileName}
        sx={{
          width: 96,
          height: 72,
          objectFit: "cover",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          flexShrink: 0,
        }}
      />
    );
  }

  if (media.type === "VIDEO" && media.previewUrl) {
    return (
      <Box
        component="video"
        src={media.previewUrl}
        muted
        sx={{
          width: 96,
          height: 72,
          objectFit: "cover",
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          flexShrink: 0,
        }}
      />
    );
  }

  if (media.type === "AUDIO") {
    return (
      <Box
        sx={{
          width: 96,
          height: 72,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption">{formatMediaType(media.type, language)}</Typography>
      </Box>
    );
  }

  if (media.type === "TEXT") {
    return (
      <Box
        sx={{
          width: 96,
          height: 72,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          p: 1,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {media.description || media.fileName || t.previewUnavailable}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 96,
        height: 72,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {t.previewUnavailable}
      </Typography>
    </Box>
  );
}

export function CollectionsPage({ language }: CollectionsPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [mediaOptions, setMediaOptions] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CheckTemplate[]>([]);
  const [busyCollectionId, setBusyCollectionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  const [mediaId, setMediaId] = useState<Record<string, string>>({});
  const [shareEmail, setShareEmail] = useState<Record<string, string>>({});
  const [shareLevel, setShareLevel] = useState<Record<string, AccessLevel>>({});
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editDescription, setEditDescription] = useState<Record<string, string>>({});
  const [editPrivate, setEditPrivate] = useState<Record<string, boolean>>({});
  const [collectionCheckType, setCollectionCheckType] = useState<Record<string, string>>({});
  const [collectionTemplateByType, setCollectionTemplateByType] = useState<Record<string, Record<string, string>>>({});

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [collections, media, templateResponse] = await Promise.all([
        api.listCollections(token),
        api.listMedia(token),
        api.listCheckTemplates(token),
      ]);
      setItems(collections);
      setMediaOptions(media);
      setTemplates([
        ...(templateResponse as CheckTemplate[]).map((template) => ({ ...template, source: "system" as const })),
        ...getCustomCheckTemplates(),
      ]);
    } catch (loadError) {
      setError(normalizeAppError(loadError, language, t.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function create() {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.createCollection({ name, description, isPrivate }, token);
      setName("");
      setDescription("");
      await load();
    } catch (createError) {
      setError(normalizeAppError(createError, language, t.createError));
    }
  }

  async function addItem(collectionId: string) {
    if (!token) return;
    const targetMedia = mediaId[collectionId];
    if (!targetMedia) return;
    setError(null);
    setSuccess(null);
    try {
      await api.addCollectionItem(collectionId, targetMedia, token);
      setMediaId((prev) => ({ ...prev, [collectionId]: "" }));
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.addItemError));
    }
  }

  async function share(collectionId: string) {
    if (!token) return;
    const email = shareEmail[collectionId];
    if (!email) return;
    setError(null);
    setSuccess(null);
    try {
      await api.shareCollection(
        collectionId,
        {
          email,
          level: shareLevel[collectionId] ?? "VIEW",
        },
        token,
      );
      setShareEmail((prev) => ({ ...prev, [collectionId]: "" }));
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.shareError));
    }
  }

  async function remove(collectionId: string) {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.deleteCollection(collectionId, token);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.deleteError));
    }
  }

  async function update(collectionId: string) {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.updateCollection(
        collectionId,
        {
          name: editName[collectionId] || undefined,
          description: editDescription[collectionId] || undefined,
          isPrivate: editPrivate[collectionId],
        },
        token,
      );
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.updateError));
    }
  }

  async function removeItem(collectionId: string, mediaItemId: string) {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.removeCollectionItem(collectionId, mediaItemId, token);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.removeItemError));
    }
  }

  async function removeCollaborator(collectionId: string, userId: string) {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.removeCollectionCollaborator(collectionId, userId, token);
      await load();
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.removeCollaboratorError));
    }
  }

  async function runCollectionChecks(collection: CollectionItem) {
    if (!token) return;
    const itemsInCollection = collection.items ?? [];
    const selectedType = collectionCheckType[collection.id] ?? "";
    const filteredItems = selectedType
      ? itemsInCollection.filter((entry) => entry.mediaItem.type === selectedType)
      : itemsInCollection;

    if (!filteredItems.length) return;

    setError(null);
    setSuccess(null);
    setBusyCollectionId(collection.id);
    try {
      const mediaByType = new Map<string, typeof filteredItems>();
      filteredItems.forEach((entry) => {
        const key = entry.mediaItem.type;
        mediaByType.set(key, [...(mediaByType.get(key) ?? []), entry]);
      });

      for (const [type, groupedItems] of mediaByType.entries()) {
        const templateId = collectionTemplateByType[collection.id]?.[type];
        const template = templates.find((entry) => entry.id === templateId);
        await Promise.all(
          groupedItems.map((entry) =>
            api.sendForCheck(entry.mediaItemId, token, {
              templateId: template?.id,
              criteriaCodes: template?.criteriaCodes,
              profileRequirements: template?.profileRequirements,
              renderRules: template?.renderRules,
            }),
          ),
        );
      }

      setSuccess(t.done);
    } catch (actionError) {
      setError(normalizeAppError(actionError, language, t.runCheckError));
    } finally {
      setBusyCollectionId(null);
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
      <Typography variant="h2">{t.title}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t.createCollection}
          </Typography>
          <Stack spacing={2}>
            <TextField value={name} label={t.name} onChange={(event) => setName(event.target.value)} />
            <TextField
              value={description}
              label={t.description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
              }
              label={t.privateCollection}
            />
            <Button variant="contained" onClick={create}>
              {t.create}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {items.map((item) => (
        <Card key={item.id}>
          <CardContent>
            <Typography variant="h6">{item.name}</Typography>
            <Typography color="text.secondary">{item.description}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {item.isPrivate ? t.private : t.public} | {t.items}: {item.items?.length ?? 0}
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">{t.runCollectionCheck}</Typography>
              <TextField
                select
                size="small"
                label={t.mediaTypeFilter}
                value={collectionCheckType[item.id] ?? ""}
                onChange={(event) =>
                  setCollectionCheckType((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
                sx={{ maxWidth: 320 }}
              >
                <MenuItem value="">{t.allTypes}</MenuItem>
                {[...new Set((item.items ?? []).map((entry) => entry.mediaItem.type))]
                  .filter((type) => ["IMAGE", "VIDEO", "AUDIO"].includes(type))
                  .map((type) => (
                    <MenuItem key={type} value={type}>
                      {formatMediaType(type as MediaItem["type"], language)}
                    </MenuItem>
                  ))}
              </TextField>
              <Stack
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                {[...new Set(
                  (item.items ?? [])
                    .map((entry) => entry.mediaItem.type)
                    .filter((type) => !collectionCheckType[item.id] || type === collectionCheckType[item.id]),
                )]
                  .filter((type) => ["IMAGE", "VIDEO", "AUDIO"].includes(type))
                  .map((type) => (
                    <TextField
                      key={`${item.id}-${type}`}
                      select
                      size="small"
                      label={`${t.templateForType}: ${formatMediaType(type as MediaItem["type"], language)}`}
                      value={collectionTemplateByType[item.id]?.[type] ?? ""}
                      onChange={(event) =>
                        setCollectionTemplateByType((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...(prev[item.id] ?? {}),
                            [type]: event.target.value,
                          },
                        }))
                      }
                    >
                      {templates
                        .filter((template) => template.appliesTo.includes(type as MediaItem["type"]))
                        .map((template) => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.name ?? template.id}
                          </MenuItem>
                        ))}
                    </TextField>
                  ))}
              </Stack>
              <Button
                variant="contained"
                onClick={() => void runCollectionChecks(item)}
                disabled={busyCollectionId === item.id}
                sx={{ alignSelf: "flex-start" }}
              >
                {t.runCheck}
              </Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                {(item.items ?? []).map((collectionItem) => (
                  <Card key={collectionItem.mediaItemId} variant="outlined" sx={{ p: 1.25 }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
                      {renderCollectionMediaPreview(collectionItem.mediaItem, language, t)}
                      <Stack spacing={0.75} sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography
                          component={RouterLink}
                          to={`/media/${collectionItem.mediaItemId}`}
                          variant="body2"
                          sx={{
                            textDecoration: "none",
                            color: "text.primary",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {collectionItem.mediaItem.title?.trim() ||
                            collectionItem.mediaItem.fileName?.trim() ||
                            t.untitled}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMediaType(collectionItem.mediaItem.type, language)} |{" "}
                          {collectionItem.mediaItem.fileName}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => void removeItem(item.id, collectionItem.mediaItemId)}
                          sx={{ alignSelf: "flex-start", minWidth: 0, px: 0 }}
                        >
                          {t.remove}
                        </Button>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
                  gap: 1,
                  width: "100%",
                  alignItems: "stretch",
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    size="small"
                    label={t.mediaId}
                    value={mediaId[item.id] ?? ""}
                    onChange={(event) =>
                      setMediaId((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                  />
                  <Autocomplete
                    options={mediaOptions}
                    value={mediaOptions.find((media) => media.id === (mediaId[item.id] ?? "")) ?? null}
                    onChange={(_, value) =>
                      setMediaId((prev) => ({ ...prev, [item.id]: value?.id ?? "" }))
                    }
                    getOptionLabel={(option) => option.title?.trim() || option.fileName || option.id}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText={t.noMediaAvailable}
                    sx={{ minWidth: 320, flexGrow: 1 }}
                    renderInput={(params) => (
                      <TextField {...params} size="small" label={t.existingMedia} />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        {renderCollectionMediaPreview(option, language, t)}
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {option.title?.trim() || option.fileName || option.id}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatMediaType(option.type, language)} | {option.fileName}
                          </Typography>
                        </Stack>
                      </Box>
                    )}
                  />
                </Stack>
                <Button onClick={() => addItem(item.id)}>{t.addItem}</Button>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
              <TextField
                size="small"
                label={t.shareEmail}
                value={shareEmail[item.id] ?? ""}
                onChange={(event) =>
                  setShareEmail((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <TextField
                size="small"
                select
                label={t.accessLevel}
                value={shareLevel[item.id] ?? "VIEW"}
                onChange={(event) =>
                  setShareLevel((prev) => ({
                    ...prev,
                    [item.id]: event.target.value as AccessLevel,
                  }))
                }
              >
                {accessLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {formatAccessLevel(level, language)}
                  </MenuItem>
                ))}
              </TextField>
              <Button onClick={() => share(item.id)}>{t.share}</Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {(item.collaborators ?? []).map((collaborator) => (
                <Stack key={collaborator.id} direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {collaborator.user?.email ?? collaborator.userId} |{" "}
                    {formatAccessLevel(collaborator.level, language)}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => void removeCollaborator(item.id, collaborator.userId)}
                  >
                    {t.remove}
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">{t.editCollection}</Typography>
              <TextField
                size="small"
                label={t.name}
                value={editName[item.id] ?? item.name}
                onChange={(event) =>
                  setEditName((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <TextField
                size="small"
                label={t.description}
                value={editDescription[item.id] ?? item.description ?? ""}
                onChange={(event) =>
                  setEditDescription((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editPrivate[item.id] ?? item.isPrivate}
                    onChange={(event) =>
                      setEditPrivate((prev) => ({ ...prev, [item.id]: event.target.checked }))
                    }
                  />
                }
                label={t.private}
              />
              <Button variant="outlined" onClick={() => void update(item.id)}>
                {t.saveChanges}
              </Button>
            </Stack>
          </CardContent>
          <CardActions>
            <Button color="error" onClick={() => remove(item.id)}>
              {t.delete}
            </Button>
          </CardActions>
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">{t.noCollections}</Typography>}
    </Stack>
  );
}
