import {
  EditorState,
  MediaFile,
  TimelineClip,
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
          URL.createObjectURL(
            item.file,
          ),

        duration:
          item.duration,

        width:
          item.width,

        height:
          item.height,
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

  return {
    media,
    clips:
      project.clips,
    selectedClipId,
    currentTime:
      Number.isFinite(
        project.currentTime,
      )
        ? project.currentTime
        : 0,
  };
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
    state.media.map(
      (item) => ({
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
      }),
    );

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