import { EditorState } from "@/types/editor";
import { serializeProject } from "@/lib/projectFormat";
import {
  isFileSystemAccessSupported,
  pickProjectFolder,
  writeBlobFile,
  writeTextFile,
} from "@/lib/fsAccess";

export async function backupProjectOnly(name: string, state: EditorState): Promise<void> {
  const payload = serializeProject(name, state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName(name)}.vidsbit`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function backupProjectFull(name: string, state: EditorState): Promise<string> {
  if (!isFileSystemAccessSupported()) {
    await backupProjectOnly(name, state);
    return "This browser cannot write a folder backup. A project-only .vidsbit file was downloaded instead. Media was not copied.";
  }

  const folder = await pickProjectFolder();
  if (!folder) {
    throw new Error("No folder was selected.");
  }

  const root = await folder.getDirectoryHandle(safeName(name), { create: true });
  const mediaDir = await root.getDirectoryHandle("media", { create: true });
  const mappedState: EditorState = {
    ...state,
    media: [],
  };

  for (const item of state.media) {
    if (!item.file) {
      mappedState.media.push({ ...item, missing: true });
      continue;
    }
    const fileName = `${item.id}-${item.reference.fileName}`.replace(/[^\w.\-]+/g, "_");
    await writeBlobFile(mediaDir, fileName, item.file);
    mappedState.media.push({
      ...item,
      missing: true,
      file: null,
      url: null,
      reference: {
        ...item.reference,
        relativePath: `media/${fileName}`,
        fileName,
      },
    });
  }

  const payload = serializeProject(name, mappedState);
  await writeTextFile(root, "project.vidsbit", JSON.stringify(payload, null, 2));
  return "Full backup written to the selected folder. Keep the media folder next to project.vidsbit.";
}

function safeName(name: string): string {
  return name.trim().replace(/[^\w\-]+/g, "_").slice(0, 60) || "vidsbit-project";
}
