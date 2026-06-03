import {
  Alert,
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
import type { AccessLevel, CollectionItem } from "../types/domain";

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
    addItem: "Add item",
    shareEmail: "Share email",
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
    addItem: "Добавить",
    shareEmail: "Email для доступа",
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
  },
} as const;

export function CollectionsPage({ language }: CollectionsPageProps) {
  const { token } = useAuth();
  const t = copy[language];
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  const [mediaId, setMediaId] = useState<Record<string, string>>({});
  const [shareEmail, setShareEmail] = useState<Record<string, string>>({});
  const [shareLevel, setShareLevel] = useState<Record<string, AccessLevel>>({});
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editDescription, setEditDescription] = useState<Record<string, string>>({});
  const [editPrivate, setEditPrivate] = useState<Record<string, boolean>>({});

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listCollections(token));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadError);
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
    try {
      await api.createCollection({ name, description, isPrivate }, token);
      setName("");
      setDescription("");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t.createError);
    }
  }

  async function addItem(collectionId: string) {
    if (!token) return;
    const targetMedia = mediaId[collectionId];
    if (!targetMedia) return;
    setError(null);
    try {
      await api.addCollectionItem(collectionId, targetMedia, token);
      setMediaId((prev) => ({ ...prev, [collectionId]: "" }));
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.addItemError);
    }
  }

  async function share(collectionId: string) {
    if (!token) return;
    const email = shareEmail[collectionId];
    if (!email) return;
    setError(null);
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
      setError(actionError instanceof Error ? actionError.message : t.shareError);
    }
  }

  async function remove(collectionId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.deleteCollection(collectionId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.deleteError);
    }
  }

  async function update(collectionId: string) {
    if (!token) return;
    setError(null);
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
      setError(actionError instanceof Error ? actionError.message : t.updateError);
    }
  }

  async function removeItem(collectionId: string, mediaItemId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.removeCollectionItem(collectionId, mediaItemId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.removeItemError);
    }
  }

  async function removeCollaborator(collectionId: string, userId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.removeCollectionCollaborator(collectionId, userId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t.removeCollaboratorError);
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
            <Stack spacing={1} sx={{ mt: 2 }}>
              {(item.items ?? []).map((collectionItem) => (
                <Stack key={collectionItem.mediaItemId} direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    <RouterLink to={`/media/${collectionItem.mediaItemId}`}>
                      {collectionItem.mediaItem.title}
                    </RouterLink>
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => void removeItem(item.id, collectionItem.mediaItemId)}
                  >
                    {t.remove}
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField
                size="small"
                label={t.mediaId}
                value={mediaId[item.id] ?? ""}
                onChange={(event) =>
                  setMediaId((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <Button onClick={() => addItem(item.id)}>{t.addItem}</Button>
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
                    {level}
                  </MenuItem>
                ))}
              </TextField>
              <Button onClick={() => share(item.id)}>{t.share}</Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {(item.collaborators ?? []).map((collaborator) => (
                <Stack key={collaborator.id} direction="row" spacing={1}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {collaborator.user?.email ?? collaborator.userId} | {collaborator.level}
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
      {!items.length && <Typography color="text.secondary">No collections yet</Typography>}
    </Stack>
  );
}
