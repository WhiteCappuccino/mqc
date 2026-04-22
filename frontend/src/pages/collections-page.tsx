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

export function CollectionsPage() {
  const { token } = useAuth();
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load collections");
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
      setError(createError instanceof Error ? createError.message : "Failed to create");
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
      setError(actionError instanceof Error ? actionError.message : "Failed to add item");
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
      setError(actionError instanceof Error ? actionError.message : "Failed to share collection");
    }
  }

  async function remove(collectionId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.deleteCollection(collectionId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to delete collection");
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
      setError(actionError instanceof Error ? actionError.message : "Failed to update collection");
    }
  }

  async function removeItem(collectionId: string, mediaItemId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.removeCollectionItem(collectionId, mediaItemId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to remove item");
    }
  }

  async function removeCollaborator(collectionId: string, userId: string) {
    if (!token) return;
    setError(null);
    try {
      await api.removeCollectionCollaborator(collectionId, userId, token);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to remove collaborator");
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
        Collections
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create collection
          </Typography>
          <Stack spacing={2}>
            <TextField value={name} label="Name" onChange={(event) => setName(event.target.value)} />
            <TextField
              value={description}
              label="Description"
              onChange={(event) => setDescription(event.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
              }
              label="Private collection"
            />
            <Button variant="contained" onClick={create}>
              Create
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
              {item.isPrivate ? "Private" : "Public"} | items: {item.items?.length ?? 0}
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
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField
                size="small"
                label="Media ID"
                value={mediaId[item.id] ?? ""}
                onChange={(event) =>
                  setMediaId((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <Button onClick={() => addItem(item.id)}>Add item</Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
              <TextField
                size="small"
                label="Share email"
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
              <Button onClick={() => share(item.id)}>Share</Button>
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
                    Remove
                  </Button>
                </Stack>
              ))}
            </Stack>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Edit collection</Typography>
              <TextField
                size="small"
                label="Name"
                value={editName[item.id] ?? item.name}
                onChange={(event) =>
                  setEditName((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <TextField
                size="small"
                label="Description"
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
                label="Private"
              />
              <Button variant="outlined" onClick={() => void update(item.id)}>
                Save changes
              </Button>
            </Stack>
          </CardContent>
          <CardActions>
            <Button color="error" onClick={() => remove(item.id)}>
              Delete
            </Button>
          </CardActions>
        </Card>
      ))}
      {!items.length && <Typography color="text.secondary">No collections yet</Typography>}
    </Stack>
  );
}
