const DB_NAME = "vidsbit-db";
const HANDLE_STORE = "handles";

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

async function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders");
      }
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects");
      }
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open handle database."));
  });
}

export async function rememberDirectoryHandle(
  key: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function restoreDirectoryHandle(
  key: string,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(HANDLE_STORE, "readonly");
        const request = tx.objectStore(HANDLE_STORE).get(key);
        request.onsuccess = () =>
          resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    return handle;
  } catch (error) {
    console.warn("Could not restore directory handle", error);
    return null;
  }
}

export async function ensurePermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "read",
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const current = await handle.queryPermission({ mode });
  if (current === "granted") {
    return true;
  }

  const next = await handle.requestPermission({ mode });
  return next === "granted";
}

export async function pickProjectFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    return null;
  }

  const handle = await window.showDirectoryPicker({
    id: "vidsbit-project-folder",
    mode: "readwrite",
  });
  await rememberDirectoryHandle("project-folder", handle);
  return handle;
}

export async function pickMusicFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported() || !window.showDirectoryPicker) {
    return null;
  }

  const handle = await window.showDirectoryPicker({
    id: "vidsbit-music-folder",
    mode: "read",
    startIn: "music",
  });
  await rememberDirectoryHandle("music-folder", handle);
  return handle;
}

export async function listAudioFiles(
  directory: FileSystemDirectoryHandle,
): Promise<File[]> {
  const files: File[] = [];
  for await (const entry of directory.values()) {
    if (entry.kind === "file") {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
        files.push(file);
      }
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeTextFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  contents: string,
): Promise<void> {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  if (!fileHandle.createWritable) {
    throw new Error("This browser cannot write files to the selected folder.");
  }
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
}

export async function writeBlobFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  blob: Blob,
): Promise<void> {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  if (!fileHandle.createWritable) {
    throw new Error("This browser cannot write files to the selected folder.");
  }
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}
