import JSZip from "jszip";
import {
  EditorState,
  MediaFile,
  TimelineClip,
  hydrateClip,
  hydrateEditorState,
} from "@/types/editor";

const DB_NAME = "vidsbit-db";
const DB_VERSION = 2;

const FOLDER_STORE = "folders";
const PROJECT_STORE = "projects";

const DEFAULT_FOLDER_ID = "folder-default";

export interface ProjectFolder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;
  mediaCount: number;
  clipCount: number;
}

interface StoredMediaFile {
  id: string;
  name: string;
  type: MediaFile["type"];
  file: File;
  duration?: number;
  width?: number;
  height?: number;
}

interface StoredProject {
  id: string;
  name: string;
  folderId: string;
  createdAt: number;
  updatedAt: number;

  media: StoredMediaFile[];
  clips: TimelineClip[];

  selectedClipId: string | null;
  currentTime: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (
      typeof window === "undefined" ||
      typeof indexedDB === "undefined"
    ) {
      reject(
        new Error(
          "IndexedDB is not available.",
        ),
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION,
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          FOLDER_STORE,
        )
      ) {
        db.createObjectStore(
          FOLDER_STORE,
        );
      }

      if (
        !db.objectStoreNames.contains(
          PROJECT_STORE,
        )
      ) {
        db.createObjectStore(
          PROJECT_STORE,
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Could not open VIDSBIT database.",
          ),
      );
    };
  });
}

function requestResult<T>(
  request: IDBRequest<T>,
): Promise<T> {
  return new Promise(
    (resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "IndexedDB request failed.",
            ),
        );
      };
    },
  );
}

function transactionComplete(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "IndexedDB transaction failed.",
            ),
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ??
            new Error(
              "IndexedDB transaction aborted.",
            ),
        );
      };
    },
  );
}

/* ---------------------------------------------------------
   FOLDERS
--------------------------------------------------------- */

export async function createFolder(
  name: string,
): Promise<ProjectFolder> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error(
      "Folder name cannot be empty.",
    );
  }

  const db = await openDatabase();

  const now = Date.now();

  const folder: ProjectFolder = {
    id:
      `folder-${now}-${Math.random()
        .toString(36)
        .slice(2)}`,

    name: cleanName,

    createdAt: now,
    updatedAt: now,
  };

  const transaction =
    db.transaction(
      FOLDER_STORE,
      "readwrite",
    );

  transaction
    .objectStore(FOLDER_STORE)
    .put(folder, folder.id);

  await transactionComplete(
    transaction,
  );

  db.close();

  return folder;
}

export async function getFolders(): Promise<
  ProjectFolder[]
> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      FOLDER_STORE,
      "readonly",
    );

  const request =
    transaction
      .objectStore(FOLDER_STORE)
      .getAll();

  const folders =
    await requestResult<
      ProjectFolder[]
    >(request);

  await transactionComplete(
    transaction,
  );

  db.close();

  return folders.sort(
    (a, b) =>
      a.createdAt - b.createdAt,
  );
}

export async function ensureDefaultFolder(): Promise<ProjectFolder> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      FOLDER_STORE,
      "readwrite",
    );

  const store =
    transaction.objectStore(
      FOLDER_STORE,
    );

  const existing =
    await requestResult<
      ProjectFolder | undefined
    >(
      store.get(
        DEFAULT_FOLDER_ID,
      ),
    );

  if (existing) {
    await transactionComplete(
      transaction,
    );

    db.close();

    return existing;
  }

  const now = Date.now();

  const folder: ProjectFolder = {
    id: DEFAULT_FOLDER_ID,
    name: "My Projects",
    createdAt: now,
    updatedAt: now,
  };

  store.put(
    folder,
    DEFAULT_FOLDER_ID,
  );

  await transactionComplete(
    transaction,
  );

  db.close();

  return folder;
}

export async function deleteFolder(
  folderId: string,
): Promise<void> {
  if (
    folderId ===
    DEFAULT_FOLDER_ID
  ) {
    throw new Error(
      "The default folder cannot be deleted.",
    );
  }

  const db = await openDatabase();

  const transaction =
    db.transaction(
      [
        FOLDER_STORE,
        PROJECT_STORE,
      ],
      "readwrite",
    );

  const folders =
    transaction.objectStore(
      FOLDER_STORE,
    );

  const projects =
    transaction.objectStore(
      PROJECT_STORE,
    );

  folders.delete(folderId);

  const allProjects =
    await requestResult<
      StoredProject[]
    >(projects.getAll());

  for (const project of allProjects) {
    if (
      project.folderId ===
      folderId
    ) {
      projects.delete(
        project.id,
      );
    }
  }

  await transactionComplete(
    transaction,
  );

  db.close();
}

/* ---------------------------------------------------------
   PROJECTS
--------------------------------------------------------- */

export async function createProject(
  name: string,
  folderId?: string,
): Promise<ProjectSummary> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error(
      "Project name cannot be empty.",
    );
  }

  const folder =
    folderId
      ? null
      : await ensureDefaultFolder();

  const actualFolderId =
    folderId ??
    folder?.id ??
    DEFAULT_FOLDER_ID;

  const db = await openDatabase();

  const now = Date.now();

  const project: StoredProject = {
    id:
      `project-${now}-${Math.random()
        .toString(36)
        .slice(2)}`,

    name: cleanName,

    folderId:
      actualFolderId,

    createdAt: now,
    updatedAt: now,

    media: [],
    clips: [],

    selectedClipId: null,
    currentTime: 0,
  };

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readwrite",
    );

  transaction
    .objectStore(PROJECT_STORE)
    .put(
      project,
      project.id,
    );

  await transactionComplete(
    transaction,
  );

  db.close();

  return {
    id: project.id,
    name: project.name,
    folderId:
      project.folderId,
    createdAt:
      project.createdAt,
    updatedAt:
      project.updatedAt,
    mediaCount: 0,
    clipCount: 0,
  };
}

export async function getProjects(): Promise<
  ProjectSummary[]
> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readonly",
    );

  const request =
    transaction
      .objectStore(
        PROJECT_STORE,
      )
      .getAll();

  const projects =
    await requestResult<
      StoredProject[]
    >(request);

  await transactionComplete(
    transaction,
  );

  db.close();

  return projects
    .map(
      (project) => ({
        id: project.id,
        name: project.name,
        folderId:
          project.folderId,
        createdAt:
          project.createdAt,
        updatedAt:
          project.updatedAt,
        mediaCount:
          project.media.length,
        clipCount:
          project.clips.length,
      }),
    )
    .sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt,
    );
}

export async function loadProject(
  projectId: string,
): Promise<EditorState | null> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readonly",
    );

  const request =
    transaction
      .objectStore(
        PROJECT_STORE,
      )
      .get(projectId);

  const project =
    await requestResult<
      StoredProject | undefined
    >(request);

  await transactionComplete(
    transaction,
  );

  db.close();

  if (!project) {
    return null;
  }

  const media: MediaFile[] =
    project.media.map(
      (item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        file: item.file,

        url:
          item.file
            ? URL.createObjectURL(
                item.file,
              )
            : null,

        duration:
          item.duration,

        width:
          item.width,

        height:
          item.height,

        missing: !item.file,

        reference: {
          fileName: item.name,
          size: item.file?.size ?? 0,
          lastModified: item.file?.lastModified ?? 0,
          mimeType: item.file?.type ?? "",
        },
      }),
    );

  const selectedClipId =
    project.clips.some(
      (clip) =>
        clip.id ===
        project.selectedClipId,
    )
      ? project.selectedClipId
      : null;

  return hydrateEditorState({
    media,
    clips:
      project.clips.map((clip) =>
        hydrateClip(clip),
      ),
    selectedClipId,
    currentTime:
      Number.isFinite(
        project.currentTime,
      )
        ? project.currentTime
        : 0,
  });
}

export async function saveProject(
  projectId: string,
  state: EditorState,
): Promise<void> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readwrite",
    );

  const store =
    transaction.objectStore(
      PROJECT_STORE,
    );

  const existing =
    await requestResult<
      StoredProject | undefined
    >(
      store.get(projectId),
    );

  if (!existing) {
    throw new Error(
      "Project no longer exists.",
    );
  }

  const storedMedia: StoredMediaFile[] =
    state.media
      .filter(
        (
          item,
        ): item is MediaFile & {
          file: File;
        } => Boolean(item.file),
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        file: item.file,
        duration:
          item.duration,
        width:
          item.width,
        height:
          item.height,
      }));

  const updated: StoredProject = {
    ...existing,

    updatedAt:
      Date.now(),

    media:
      storedMedia,

    clips:
      state.clips,

    selectedClipId:
      state.selectedClipId,

    currentTime:
      state.currentTime,
  };

  store.put(
    updated,
    projectId,
  );

  await transactionComplete(
    transaction,
  );

  db.close();
}

export async function renameProject(
  projectId: string,
  name: string,
): Promise<void> {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error(
      "Project name cannot be empty.",
    );
  }

  const db = await openDatabase();

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readwrite",
    );

  const store =
    transaction.objectStore(
      PROJECT_STORE,
    );

  const project =
    await requestResult<
      StoredProject | undefined
    >(
      store.get(projectId),
    );

  if (!project) {
    throw new Error(
      "Project not found.",
    );
  }

  project.name =
    cleanName;

  project.updatedAt =
    Date.now();

  store.put(
    project,
    projectId,
  );

  await transactionComplete(
    transaction,
  );

  db.close();
}

export async function deleteProject(
  projectId: string,
): Promise<void> {
  const db = await openDatabase();

  const transaction =
    db.transaction(
      PROJECT_STORE,
      "readwrite",
    );

  transaction
    .objectStore(
      PROJECT_STORE,
    )
    .delete(projectId);

  await transactionComplete(
    transaction,
  );

  db.close();
}

/* ---------------------------------------------------------
   PERSISTENCE & STORAGE HEALTH
--------------------------------------------------------- */

export interface StorageHealth {
  persisted: boolean;
  quotaBytes?: number;
  usageBytes?: number;
}

export async function requestPersistentStorage(): Promise<StorageHealth> {
  if (typeof window === "undefined" || !navigator.storage) {
    return { persisted: false };
  }

  let persisted = false;
  try {
    persisted = await navigator.storage.persisted();
    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch (error) {
    console.warn("Storage persistence request failed:", error);
  }

  let quotaBytes: number | undefined;
  let usageBytes: number | undefined;
  try {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    }
  } catch {}

  return { persisted, quotaBytes, usageBytes };
}

/* ---------------------------------------------------------
   PORTABLE PROJECT BUNDLE (.vidsbit ARCHIVE)
--------------------------------------------------------- */

export async function exportProjectBundle(
  projectId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const db = await openDatabase();

  const transaction = db.transaction(PROJECT_STORE, "readonly");
  const store = transaction.objectStore(PROJECT_STORE);
  const project = await requestResult<StoredProject | undefined>(
    store.get(projectId),
  );

  await transactionComplete(transaction);
  db.close();

  if (!project) {
    throw new Error("Project not found for bundle export.");
  }

  const zip = new JSZip();

  const mediaManifest: Array<{
    id: string;
    name: string;
    type: MediaFile["type"];
    duration?: number;
    width?: number;
    height?: number;
    zipPath: string;
  }> = [];

  const mediaFolder = zip.folder("media");

  for (let i = 0; i < project.media.length; i++) {
    const item = project.media[i];
    if (!item.file) continue;

    const safeName = `${item.id}_${item.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const zipPath = `media/${safeName}`;

    if (mediaFolder) {
      mediaFolder.file(safeName, item.file, { binary: true });
    }

    mediaManifest.push({
      id: item.id,
      name: item.name,
      type: item.type,
      duration: item.duration,
      width: item.width,
      height: item.height,
      zipPath,
    });
  }

  const bundleData = {
    format: "vidsbit-project-bundle",
    version: 1,
    exportedAt: Date.now(),
    project: {
      id: project.id,
      name: project.name,
      folderId: project.folderId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      currentTime: project.currentTime,
      selectedClipId: project.selectedClipId,
      clips: project.clips,
      media: mediaManifest,
    },
  };

  zip.file("vidsbit-project.json", JSON.stringify(bundleData, null, 2));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "STORE",
    mimeType: "application/octet-stream",
  });

  const safeFileName =
    project.name.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "project";

  return {
    blob,
    fileName: `${safeFileName}.vidsbit`,
  };
}

export async function importProjectBundle(
  file: File,
  targetFolderId?: string,
): Promise<ProjectSummary> {
  const zip = await JSZip.loadAsync(file);

  const manifestFile =
    zip.file("vidsbit-project.json") ?? zip.file("project.json");

  if (!manifestFile) {
    throw new Error("Invalid .vidsbit archive: manifest file missing.");
  }

  const jsonText = await manifestFile.async("text");
  const manifest = JSON.parse(jsonText);

  if (!manifest.project || !Array.isArray(manifest.project.clips)) {
    throw new Error("Invalid project structure inside archive.");
  }

  const proj = manifest.project;
  const now = Date.now();
  const newProjectId = `project-${now}-${Math.random().toString(36).slice(2)}`;

  const defaultFolder = await ensureDefaultFolder();
  const folderId = targetFolderId ?? proj.folderId ?? defaultFolder.id;

  const storedMedia: StoredMediaFile[] = [];

  for (const m of proj.media ?? []) {
    const entry = zip.file(m.zipPath);
    if (!entry) continue;

    const buffer = await entry.async("arraybuffer");
    const mime =
      m.type === "video"
        ? "video/mp4"
        : m.type === "audio"
          ? "audio/mpeg"
          : "image/png";

    const restoredFile = new File([buffer], m.name, {
      type: mime,
      lastModified: now,
    });

    storedMedia.push({
      id: m.id,
      name: m.name,
      type: m.type,
      file: restoredFile,
      duration: m.duration,
      width: m.width,
      height: m.height,
    });
  }

  const newProject: StoredProject = {
    id: newProjectId,
    name: proj.name ? `${proj.name} (Imported)` : "Imported Project",
    folderId,
    createdAt: now,
    updatedAt: now,
    media: storedMedia,
    clips: (proj.clips as TimelineClip[]).map((c) => hydrateClip(c)),
    selectedClipId: proj.selectedClipId ?? null,
    currentTime: Number.isFinite(proj.currentTime) ? proj.currentTime : 0,
  };

  const db = await openDatabase();
  const transaction = db.transaction(PROJECT_STORE, "readwrite");
  transaction.objectStore(PROJECT_STORE).put(newProject, newProject.id);
  await transactionComplete(transaction);
  db.close();

  return {
    id: newProject.id,
    name: newProject.name,
    folderId: newProject.folderId,
    createdAt: newProject.createdAt,
    updatedAt: newProject.updatedAt,
    mediaCount: newProject.media.length,
    clipCount: newProject.clips.length,
  };
}