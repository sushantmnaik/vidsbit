"use client";

import { useEffect, useRef, useState } from "react";

import {
  createFolder,
  createProject,
  deleteFolder,
  deleteProject,
  ensureDefaultFolder,
  exportProjectBundle,
  getFolders,
  getProjects,
  importProjectBundle,
  ProjectFolder,
  ProjectSummary,
  renameProject,
  requestPersistentStorage,
  StorageHealth,
} from "@/lib/projectStorage";

interface ProjectManagerProps {
  open: boolean;
  currentProjectId: string | null;

  onOpenProject: (
    project: ProjectSummary,
  ) => void;

  onClose: () => void;
}

export default function ProjectManager({
  open,
  currentProjectId,
  onOpenProject,
  onClose,
}: ProjectManagerProps) {
  const [folders, setFolders] =
    useState<ProjectFolder[]>(
      [],
    );

  const [projects, setProjects] =
    useState<ProjectSummary[]>(
      [],
    );

  const [selectedFolderId, setSelectedFolderId] =
    useState<string | null>(
      null,
    );

  const [showNewProject, setShowNewProject] =
    useState(false);

  const [showNewFolder, setShowNewFolder] =
    useState(false);

  const [newName, setNewName] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [storageHealth, setStorageHealth] =
    useState<StorageHealth | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const defaultFolder =
      await ensureDefaultFolder();

    const [
      loadedFolders,
      loadedProjects,
      health,
    ] = await Promise.all([
      getFolders(),
      getProjects(),
      requestPersistentStorage(),
    ]);

    setFolders(
      loadedFolders,
    );

    setProjects(
      loadedProjects,
    );

    setStorageHealth(health);

    setSelectedFolderId(
      (current) =>
        current ??
        defaultFolder.id,
    );
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    (async () => {
      try {
        const defaultFolder = await ensureDefaultFolder();
        const [loadedFolders, loadedProjects, health] = await Promise.all([
          getFolders(),
          getProjects(),
          requestPersistentStorage(),
        ]);
        if (active) {
          setFolders(loadedFolders);
          setProjects(loadedProjects);
          setStorageHealth(health);
          setSelectedFolderId((current) => current ?? defaultFolder.id);
        }
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const visibleProjects =
    selectedFolderId
      ? projects.filter(
          (project) =>
            project.folderId ===
            selectedFolderId,
        )
      : projects;

  const selectedFolder =
    folders.find(
      (folder) =>
        folder.id ===
        selectedFolderId,
    );

  async function handleCreateProject() {
    const name =
      newName.trim();

    if (!name) {
      return;
    }

    setLoading(true);

    try {
      const project =
        await createProject(
          name,
          selectedFolderId ??
            undefined,
        );

      setNewName("");
      setShowNewProject(
        false,
      );

      await refresh();

      onOpenProject(
        project,
      );
    } catch (error) {
      console.error(
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder() {
    const name =
      newName.trim();

    if (!name) {
      return;
    }

    setLoading(true);

    try {
      const folder =
        await createFolder(
          name,
        );

      setNewName("");
      setShowNewFolder(
        false,
      );

      await refresh();

      setSelectedFolderId(
        folder.id,
      );
    } catch (error) {
      console.error(
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(
    project: ProjectSummary,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${project.name}"? This removes its locally saved media and timeline.`,
      );

    if (!confirmed) {
      return;
    }

    await deleteProject(
      project.id,
    );

    await refresh();
  }

  async function handleDeleteFolder(
    folder: ProjectFolder,
  ) {
    const folderProjects =
      projects.filter(
        (project) =>
          project.folderId ===
          folder.id,
      );

    const confirmed =
      window.confirm(
        `Delete "${folder.name}" and its ${folderProjects.length} project(s)?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteFolder(
        folder.id,
      );

      await refresh();
    } catch (error) {
      console.error(
        error,
      );
    }
  }

  async function handleRenameProject(
    project: ProjectSummary,
  ) {
    const name =
      window.prompt(
        "New project name:",
        project.name,
      );

    if (
      name === null ||
      !name.trim()
    ) {
      return;
    }

    await renameProject(
      project.id,
      name,
    );

    await refresh();
  }

  async function handleExportBundle(project: ProjectSummary) {
    setLoading(true);
    try {
      const { blob, fileName } = await exportProjectBundle(project.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export project bundle.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleImportFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const imported = await importProjectBundle(
        file,
        selectedFolderId ?? undefined,
      );
      await refresh();
      onOpenProject(imported);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to import project. Please ensure this is a valid .vidsbit file.",
      );
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="project-manager-overlay">
      <section className="project-manager">
        <header className="project-manager-header">
          <div>
            <span className="project-manager-kicker">
              VIDSBIT
            </span>

            <h2>
              Projects
            </h2>
          </div>

          <button
            className="project-manager-close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="project-manager-body">
          <aside className="project-folders">
            <div className="project-sidebar-title">
              <span>
                Folders
              </span>

              <button
                onClick={() => {
                  setNewName("");
                  setShowNewFolder(
                    true,
                  );
                }}
              >
                +
              </button>
            </div>

            {folders.map(
              (folder) => (
                <div
                  key={
                    folder.id
                  }
                  className={`project-folder ${
                    selectedFolderId ===
                    folder.id
                      ? "active"
                      : ""
                  }`}
                >
                  <button
                    className="project-folder-main"
                    onClick={() =>
                      setSelectedFolderId(
                        folder.id,
                      )
                    }
                  >
                    <span>
                      📁
                    </span>

                    <span>
                      {
                        folder.name
                      }
                    </span>
                  </button>

                  {folder.id !==
                    "folder-default" && (
                    <button
                      className="project-folder-delete"
                      onClick={() =>
                        handleDeleteFolder(
                          folder,
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              ),
            )}

            <div className="project-storage-health">
              <span
                title={
                  storageHealth?.persisted
                    ? "IndexedDB is protected by browser"
                    : "Browser storage active"
                }
              >
                {storageHealth?.persisted
                  ? "🛡️ Storage: Protected"
                  : "💾 Storage: Local"}
              </span>
              {storageHealth?.usageBytes !== undefined && (
                <small>
                  {Math.round(
                    storageHealth.usageBytes /
                      (1024 * 1024),
                  )}{" "}
                  MB used
                </small>
              )}
            </div>
          </aside>

          <div className="project-list">
            <div className="project-list-header">
              <div>
                <h3>
                  {selectedFolder?.name ??
                    "Projects"}
                </h3>

                <span>
                  {
                    visibleProjects.length
                  }{" "}
                  project
                  {visibleProjects.length ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vidsbit,.zip"
                  style={{ display: "none" }}
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  className="project-new-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  title="Import a self-contained .vidsbit project bundle"
                >
                  📥 Import (.vidsbit)
                </button>

                <button
                  className="project-new-button"
                  onClick={() => {
                    setNewName("");
                    setShowNewProject(
                      true,
                    );
                  }}
                >
                  + New Project
                </button>
              </div>
            </div>

            {visibleProjects.length ===
            0 ? (
              <div className="projects-empty">
                <div>
                  ＋
                </div>

                <h3>
                  No projects here
                </h3>

                <p>
                  Create a project to
                  start editing.
                </p>
              </div>
            ) : (
              <div className="projects-grid">
                {visibleProjects.map(
                  (project) => (
                    <article
                      key={
                        project.id
                      }
                      className={`project-card ${
                        project.id ===
                        currentProjectId
                          ? "current"
                          : ""
                      }`}
                    >
                      <button
                        className="project-card-open"
                        onClick={() =>
                          onOpenProject(
                            project,
                          )
                        }
                      >
                        <div className="project-card-icon">
                          ▶
                        </div>

                        <div className="project-card-info">
                          <strong>
                            {
                              project.name
                            }
                          </strong>

                          <span>
                            {
                              project.mediaCount
                            }{" "}
                            media ·{" "}
                            {
                              project.clipCount
                            }{" "}
                            clips
                          </span>

                          <small>
                            {new Date(
                              project.updatedAt,
                            ).toLocaleString()}
                          </small>
                        </div>
                      </button>

                      <div className="project-card-actions">
                        <button
                          onClick={() =>
                            handleExportBundle(
                              project,
                            )
                          }
                          title="Export standalone .vidsbit backup"
                        >
                          Export (.vidsbit)
                        </button>

                        <button
                          onClick={() =>
                            handleRenameProject(
                              project,
                            )
                          }
                        >
                          Rename
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteProject(
                              project,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {(showNewProject ||
          showNewFolder) && (
          <div className="project-dialog-overlay">
            <div className="project-dialog">
              <h3>
                {showNewProject
                  ? "New Project"
                  : "New Folder"}
              </h3>

              <input
                autoFocus
                value={newName}
                onChange={(event) =>
                  setNewName(
                    event.target.value,
                  )
                }
                placeholder={
                  showNewProject
                    ? "Project name"
                    : "Folder name"
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    if (
                      showNewProject
                    ) {
                      void handleCreateProject();
                    } else {
                      void handleCreateFolder();
                    }
                  }

                  if (
                    event.key ===
                    "Escape"
                  ) {
                    setShowNewProject(
                      false,
                    );

                    setShowNewFolder(
                      false,
                    );
                  }
                }}
              />

              <div className="project-dialog-actions">
                <button
                  onClick={() => {
                    setShowNewProject(
                      false,
                    );

                    setShowNewFolder(
                      false,
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  className="project-dialog-primary"
                  disabled={
                    loading ||
                    !newName.trim()
                  }
                  onClick={() => {
                    if (
                      showNewProject
                    ) {
                      void handleCreateProject();
                    } else {
                      void handleCreateFolder();
                    }
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}