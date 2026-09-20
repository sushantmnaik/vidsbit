"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useEditorHistory,
} from "@/lib/useEditorHistory";


import MediaPanel from "@/components/editor/MediaPanel";
import Preview from "@/components/editor/Preview";
import Timeline from "@/components/editor/Timeline";
import ExportDialog from "@/components/editor/ExportDialog";
import ProjectManager from "@/components/editor/ProjectManager";

import {
  exportVideo,
  ExportStage,
} from "@/lib/exportVideo";

import {
  EditorState,
} from "@/types/editor";

import {
  createProject,
  ensureDefaultFolder,
  loadProject,
  saveProject,
  ProjectSummary,
} from "@/lib/projectStorage";

import {
  MediaFile,
  MediaType,
  TimelineClip,
} from "@/types/editor";

export default function Home() {
  const [media, setMedia] =
    useState<MediaFile[]>([]);

  const [clips, setClips] =
    useState<TimelineClip[]>([]);

  const [
    selectedClipId,
    setSelectedClipId,
  ] = useState<string | null>(
    null,
  );

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false);

  const [
    isHydrated,
    setIsHydrated,
  ] = useState(false);

  const [
    projectManagerOpen,
    setProjectManagerOpen,
  ] = useState(false);

  const [
    currentProject,
    setCurrentProject,
  ] =
    useState<ProjectSummary | null>(
      null,
    );

  const [
    isExporting,
    setIsExporting,
  ] = useState(false);

  const [
    exportProgress,
    setExportProgress,
  ] = useState(0);

  const [
    exportStage,
    setExportStage,
  ] =
    useState<ExportStage | null>(
      null,
    );

  
  const {
  record,
  undo,
  redo,
  clearHistory,
  canUndo,
  canRedo,
} = useEditorHistory({
  media: [],
  clips: [],
  selectedClipId: null,
  currentTime: 0,
});


const getEditorState =
  useCallback(
    (): EditorState => ({
      media,
      clips,
      selectedClipId,
      currentTime,
    }),
    [
      media,
      clips,
      selectedClipId,
      currentTime,
    ],
  );

const applyEditorState =
  useCallback(
    (state: EditorState) => {
      setMedia(
        state.media,
      );

      setClips(
        state.clips,
      );

      setSelectedClipId(
        state.selectedClipId,
      );

      setCurrentTime(
        state.currentTime,
      );
    },
    [],
  );


  const [
    exportError,
    setExportError,
  ] = useState<string | null>(
    null,
  );


  const handleUndo =
  useCallback(() => {
    if (!canUndo) {
      return;
    }

    setIsPlaying(false);

    const previous =
      undo(
        getEditorState(),
      );

    if (!previous) {
      return;
    }

    applyEditorState(
      previous,
    );
  }, [
    canUndo,
    undo,
    getEditorState,
    applyEditorState,
  ]);

const handleRedo =
  useCallback(() => {
    if (!canRedo) {
      return;
    }

    setIsPlaying(false);

    const next =
      redo(
        getEditorState(),
      );

    if (!next) {
      return;
    }

    applyEditorState(
      next,
    );
  }, [
    canRedo,
    redo,
    getEditorState,
    applyEditorState,
  ]);


  

  const animationFrameRef =
    useRef<number | null>(null);

  const lastFrameTimeRef =
    useRef<number | null>(null);

  /*
   * ---------------------------------------------------------
   * Initial project
   * ---------------------------------------------------------
   *
   * If no projects exist yet, create one automatically.
   * This means VIDSBIT still opens directly into the editor
   * just like before.
   */

  


useEffect(() => {
  let cancelled = false;

  async function initialize() {
    try {
      const [
        { getProjects },
        defaultFolder,
      ] = await Promise.all([
        import("@/lib/projectStorage"),
        ensureDefaultFolder(),
      ]);

      const projects =
        await getProjects();

      if (cancelled) {
        return;
      }

      if (projects.length > 0) {
        /*
         * Open the most recently updated project.
         */
        const project =
          projects[0];

        const loaded =
          await loadProject(
            project.id,
          );

        if (
          loaded &&
          !cancelled
        ) {
          setCurrentProject(
            project,
          );

          setMedia(
            loaded.media,
          );

          setClips(
            loaded.clips,
          );

          setSelectedClipId(
            loaded.selectedClipId,
          );

          setCurrentTime(
            loaded.currentTime,
          );
        }
      } else {
        /*
         * First ever VIDSBIT launch.
         */
        const project =
          await createProject(
            "Untitled Project",
            defaultFolder.id,
          );

        if (
          !cancelled
        ) {
          setCurrentProject(
            project,
          );
        }
      }
    } catch (error) {
      console.error(
        "VIDSBIT initialization failed:",
        error,
      );
    } finally {
      if (!cancelled) {
        setIsHydrated(true);
      }
    }
  }

  initialize();

  return () => {
    cancelled = true;
  };
}, []);

  /*
   * ---------------------------------------------------------
   * Save current project
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (
      !isHydrated ||
      !currentProject
    ) {
      return;
    }

    const timeout =
      window.setTimeout(() => {
        saveProject(
          currentProject.id,
          {
            media,
            clips,
            selectedClipId,
            currentTime,
          },
        ).catch((error) => {
          console.error(
            "VIDSBIT project save failed:",
            error,
          );
        });
      }, 500);

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    media,
    clips,
    selectedClipId,
    currentTime,
    currentProject,
    isHydrated,
  ]);

  /*
   * ---------------------------------------------------------
   * Metadata
   * ---------------------------------------------------------
   */

  const getMediaType = (
    file: File,
  ): MediaType | null => {
    if (
      file.type.startsWith(
        "video/",
      )
    ) {
      return "video";
    }

    if (
      file.type.startsWith(
        "audio/",
      )
    ) {
      return "audio";
    }

    if (
      file.type.startsWith(
        "image/",
      )
    ) {
      return "image";
    }

    return null;
  };

  const getMediaMetadata = (
    file: File,
    type: MediaType,
  ): Promise<{
    duration?: number;
    width?: number;
    height?: number;
  }> => {
    return new Promise(
      (resolve) => {
        if (
          type === "image"
        ) {
          const image =
            new Image();

          const url =
            URL.createObjectURL(
              file,
            );

          image.onload = () => {
            resolve({
              width:
                image.naturalWidth,
              height:
                image.naturalHeight,
            });

            URL.revokeObjectURL(
              url,
            );
          };

          image.onerror = () => {
            URL.revokeObjectURL(
              url,
            );

            resolve({});
          };

          image.src = url;

          return;
        }

        if (
          type === "video"
        ) {
          const video =
            document.createElement(
              "video",
            );

          const url =
            URL.createObjectURL(
              file,
            );

          video.preload =
            "metadata";

          video.onloadedmetadata =
            () => {
              resolve({
                duration:
                  Number.isFinite(
                    video.duration,
                  )
                    ? video.duration
                    : undefined,

                width:
                  video.videoWidth ||
                  undefined,

                height:
                  video.videoHeight ||
                  undefined,
              });

              URL.revokeObjectURL(
                url,
              );
            };

          video.onerror = () => {
            URL.revokeObjectURL(
              url,
            );

            resolve({});
          };

          video.src = url;

          return;
        }

        if (
          type === "audio"
        ) {
          const audio =
            document.createElement(
              "audio",
            );

          const url =
            URL.createObjectURL(
              file,
            );

          audio.preload =
            "metadata";

          audio.onloadedmetadata =
            () => {
              resolve({
                duration:
                  Number.isFinite(
                    audio.duration,
                  )
                    ? audio.duration
                    : undefined,
              });

              URL.revokeObjectURL(
                url,
              );
            };

          audio.onerror = () => {
            URL.revokeObjectURL(
              url,
            );

            resolve({});
          };

          audio.src = url;

          return;
        }

        resolve({});
      },
    );
  };

  /*
   * ---------------------------------------------------------
   * Import media
   * ---------------------------------------------------------
   */

  const handleImport =
    useCallback(
      async (
        files: FileList,
      ) => {
        const imported: MediaFile[] =
          [];

        for (
          let index = 0;
          index <
          files.length;
          index++
        ) {
          const file =
            files[index];

          const type =
            getMediaType(
              file,
            );

          if (!type) {
            continue;
          }

          const metadata =
            await getMediaMetadata(
              file,
              type,
            );

          imported.push({
            id:
              `${Date.now()}-${index}-${Math.random()
                .toString(36)
                .slice(2)}`,

            name:
              file.name,

            type,

            file,

            url:
              URL.createObjectURL(
                file,
              ),

            duration:
              metadata.duration,

            width:
              metadata.width,

            height:
              metadata.height,
          });
        }

        if (
          imported.length ===
          0
        ) {
          return;
        }

        setMedia(
          (previous) => [
            ...previous,
            ...imported,
          ],
        );

        /*
         * Automatically add the first video if the
         * timeline is empty.
         */
        if (
          clips.length ===
          0
        ) {
          const firstVideo =
            imported.find(
              (item) =>
                item.type ===
                "video",
            );

          if (
            firstVideo &&
            firstVideo.duration
          ) {
            const newClip: TimelineClip =
              {
                id:
                  `clip-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2)}`,

                mediaId:
                  firstVideo.id,

                sourceStart: 0,

                sourceEnd:
                  firstVideo.duration,

                timelineStart: 0,

                track: 0,
              };

            setClips([
              newClip,
            ]);

            setSelectedClipId(
              newClip.id,
            );
          }
        }
      },
      [clips.length],
    );

  /*
   * ---------------------------------------------------------
   * Add media to timeline
   * ---------------------------------------------------------
   */

  const handleAddToTimeline =
    useCallback(
      (
        mediaId: string,
      ) => {
        const item =
          media.find(
            (mediaItem) =>
              mediaItem.id ===
              mediaId,
          );

        if (
          !item ||
          item.type !==
            "video" ||
          !item.duration
        ) {
          return;
        }

        const timelineEnd =
          clips.reduce(
            (
              max,
              clip,
            ) =>
              Math.max(
                max,
                clip.timelineStart +
                  (clip.sourceEnd -
                    clip.sourceStart),
              ),
            0,
          );

        const newClip: TimelineClip =
          {
            id:
              `clip-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

            mediaId,

            sourceStart: 0,

            sourceEnd:
              item.duration,

            timelineStart:
              timelineEnd,

            track: 0,
          };

        setClips(
          (previous) => [
            ...previous,
            newClip,
          ],
        );

        setSelectedClipId(
          newClip.id,
        );
      },
      [media, clips],
    );

  /*
   * ---------------------------------------------------------
   * Normalize timeline
   * ---------------------------------------------------------
   */

  const normalizeClips = (
    source: TimelineClip[],
  ) => {
    let position = 0;

    return source.map(
      (clip) => {
        const duration =
          Math.max(
            0,
            clip.sourceEnd -
              clip.sourceStart,
          );

        const result = {
          ...clip,
          timelineStart:
            position,
        };

        position +=
          duration;

        return result;
      },
    );
  };

  /*
   * ---------------------------------------------------------
   * Select clip
   * ---------------------------------------------------------
   */

  const handleSelectClip =
    (clipId: string) => {
      setSelectedClipId(
        clipId,
      );
    };

  /*
   * ---------------------------------------------------------
   * Delete clip
   * ---------------------------------------------------------
   */

  const handleDeleteClip =
    (clipId: string) => {
      const updated =
        clips.filter(
          (clip) =>
            clip.id !==
            clipId,
        );

      const normalized =
        normalizeClips(
          updated,
        );

      setClips(
        normalized,
      );

      if (
        selectedClipId ===
        clipId
      ) {
        setSelectedClipId(
          normalized[0]?.id ??
            null,
        );
      }
    };

  /*
   * ---------------------------------------------------------
   * Trim start
   * ---------------------------------------------------------
   */

const handleTrimStart =
  (clipId: string) => {
    const clip =
      clips.find(
        (item) =>
          item.id === clipId,
      );

    if (!clip) {
      return;
    }

    record(
      getEditorState(),
    );

    setClips(
      (previous) =>
        normalizeClips(
          previous.map(
            (item) => {
              if (
                item.id !==
                clipId
              ) {
                return item;
              }

              const duration =
                item.sourceEnd -
                item.sourceStart;

              const amount =
                Math.min(
                  1,
                  duration / 2,
                );

              return {
                ...item,
                sourceStart:
                  item.sourceStart +
                  amount,
              };
            },
          ),
        ),
    );
  };
  /*
   * ---------------------------------------------------------
   * Trim end
   * ---------------------------------------------------------
   */

  const handleTrimEnd =
    (clipId: string) => {
      setClips(
        (previous) =>
          normalizeClips(
            previous.map(
              (clip) => {
                if (
                  clip.id !==
                  clipId
                ) {
                  return clip;
                }

                const duration =
                  clip.sourceEnd -
                  clip.sourceStart;

                const amount =
                  Math.min(
                    1,
                    duration /
                      2,
                  );

                return {
                  ...clip,
                  sourceEnd:
                    clip.sourceEnd -
                    amount,
                };
              },
            ),
          ),
      );
    };

  /*
   * ---------------------------------------------------------
   * Split
   * ---------------------------------------------------------
   */

  const handleSplitClip =
    (clipId: string) => {
      const clip =
        clips.find(
          (item) =>
            item.id ===
            clipId,
        );

      if (!clip) {
        return;
      }

      const relative =
        currentTime -
        clip.timelineStart;

      const duration =
        clip.sourceEnd -
        clip.sourceStart;

      if (
        relative <= 0 ||
        relative >= duration
      ) {
        return;
      }


    record(
      getEditorState(),
    );

      const split =
        clip.sourceStart +
        relative;

      const first = {
        ...clip,
        id:
          `clip-${Date.now()}-a-${Math.random()
            .toString(36)
            .slice(2)}`,
        sourceEnd:
          split,
      };

      const second = {
        ...clip,
        id:
          `clip-${Date.now()}-b-${Math.random()
            .toString(36)
            .slice(2)}`,
        sourceStart:
          split,
      };

      const index =
        clips.findIndex(
          (item) =>
            item.id ===
            clipId,
        );

      const updated = [
        ...clips.slice(
          0,
          index,
        ),
        first,
        second,
        ...clips.slice(
          index + 1,
        ),
      ];

      setClips(
        normalizeClips(
          updated,
        ),
      );

      setSelectedClipId(
        second.id,
      );
    };

  /*
   * ---------------------------------------------------------
   * Move clip
   * ---------------------------------------------------------
   */

  const handleMoveClip =
  (
    clipId: string,
    direction:
      | "left"
      | "right",
  ) => {
    const index =
      clips.findIndex(
        (clip) =>
          clip.id === clipId,
      );

    if (index === -1) {
      return;
    }

    const target =
      direction === "left"
        ? index - 1
        : index + 1;

    if (
      target < 0 ||
      target >= clips.length
    ) {
      return;
    }

    record(
      getEditorState(),
    );

    const updated =
      [...clips];

    [
      updated[index],
      updated[target],
    ] = [
      updated[target],
      updated[index],
    ];

    setClips(
      normalizeClips(
        updated,
      ),
    );
  };
  /*
   * ---------------------------------------------------------
   * Active clip
   * ---------------------------------------------------------
   */

  const activeClip =
    clips.find(
      (clip) => {
        const duration =
          clip.sourceEnd -
          clip.sourceStart;

        return (
          currentTime >=
            clip.timelineStart &&
          currentTime <
            clip.timelineStart +
              duration
        );
      },
    ) ??
    clips[clips.length - 1] ??
    null;

  /*
   * ---------------------------------------------------------
   * Playback
   * ---------------------------------------------------------
   */

  const stopAnimation =
    useCallback(() => {
      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      animationFrameRef.current =
        null;

      lastFrameTimeRef.current =
        null;
    }, []);

  const startAnimation =
    useCallback(() => {
      stopAnimation();

      lastFrameTimeRef.current =
        performance.now();

      const tick = (
        timestamp: number,
      ) => {
        const previous =
          lastFrameTimeRef.current ??
          timestamp;

        const delta =
          (timestamp -
            previous) /
          1000;

        lastFrameTimeRef.current =
          timestamp;

        setCurrentTime(
          (value) => {
            const duration =
              clips.reduce(
                (
                  max,
                  clip,
                ) =>
                  Math.max(
                    max,
                    clip.timelineStart +
                      (clip.sourceEnd -
                        clip.sourceStart),
                  ),
                0,
              );

            const next =
              value + delta;

            if (
              next >=
              duration
            ) {
              setIsPlaying(
                false,
              );

              return duration;
            }

            return next;
          },
        );

        animationFrameRef.current =
          requestAnimationFrame(
            tick,
          );
      };

      animationFrameRef.current =
        requestAnimationFrame(
          tick,
        );
    }, [
      clips,
      stopAnimation,
    ]);

  useEffect(() => {
    if (isPlaying) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return stopAnimation;
  }, [
    isPlaying,
    startAnimation,
    stopAnimation,
  ]);

  const handleTogglePlay =
    () => {
      if (
        clips.length ===
        0
      ) {
        return;
      }

      setIsPlaying(
        (value) =>
          !value,
      );
    };

  const handleVideoEnded =
    () => {
      if (!activeClip) {
        setIsPlaying(
          false,
        );

        return;
      }

      const index =
        clips.findIndex(
          (clip) =>
            clip.id ===
            activeClip.id,
        );

      const next =
        clips[index + 1];

      if (next) {
        setCurrentTime(
          next.timelineStart,
        );

        setSelectedClipId(
          next.id,
        );
      } else {
        setIsPlaying(
          false,
        );
      }
    };

  /*
   * ---------------------------------------------------------
   * Seek
   * ---------------------------------------------------------
   */

  const handleSeek =
    (time: number) => {
      setCurrentTime(
        Math.max(
          0,
          time,
        ),
      );
    };

  /*
   * ---------------------------------------------------------
   * Open project
   * ---------------------------------------------------------
   */

  const handleOpenProject =
    async (
      project: ProjectSummary,
    ) => {
      setIsPlaying(
        false,
      );

      const loaded =
        await loadProject(
          project.id,
        );

      if (!loaded) {
        return;
      }

      /*
       * Release URLs belonging to the currently
       * open project.
       */
      for (
        const item of media
      ) {
        URL.revokeObjectURL(
          item.url,
        );
      }

      setMedia(
        loaded.media,
      );

      setClips(
        loaded.clips,
      );

      setSelectedClipId(
        loaded.selectedClipId,
      );

      setCurrentTime(
        loaded.currentTime,
      );

      setCurrentProject(
        project,
      );

      setProjectManagerOpen(
        false,
      );

      console.log(
        `Opened project: ${project.name}`,
      );
    };

  /*
   * ---------------------------------------------------------
   * Export
   * ---------------------------------------------------------
   */

  const handleExport =
    async () => {
      if (
        clips.length ===
          0 ||
        isExporting
      ) {
        return;
      }

      setIsPlaying(
        false,
      );

      setExportError(
        null,
      );

      setExportProgress(
        0,
      );

      setExportStage(
        "loading",
      );

      setIsExporting(
        true,
      );

      try {
        const blob =
          await exportVideo(
            media,
            clips,
            {
              onStage:
                setExportStage,

              onProgress:
                setExportProgress,
            },
          );

        const url =
          URL.createObjectURL(
            blob,
          );

        const link =
          document.createElement(
            "a",
          );

        link.href = url;

        link.download =
          "vidsbit-export.mp4";

        document.body.appendChild(
          link,
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          url,
        );

        setExportProgress(
          1,
        );

        setExportStage(
          "finalizing",
        );
      } catch (error) {
        console.error(
          "VIDSBIT export failed:",
          error,
        );

        setExportError(
          error instanceof Error
            ? error.message
            : "Something went wrong during export.",
        );
      }
    };

  const closeExport =
    () => {
      setIsExporting(
        false,
      );

      setExportError(
        null,
      );

      setExportStage(
        null,
      );

      setExportProgress(
        0,
      );
    };

    useEffect(() => {
  const handleKeyDown = (
    event: KeyboardEvent,
  ) => {
    const target =
      event.target as HTMLElement | null;

    const isTyping =
      target?.tagName ===
        "INPUT" ||
      target?.tagName ===
        "TEXTAREA" ||
      target?.isContentEditable;

    /*
     * Don't hijack keyboard shortcuts while typing
     * in project names or other text fields.
     */
    if (isTyping) {
      return;
    }

    /*
     * Escape
     */
    if (
      event.key === "Escape"
    ) {
      setProjectManagerOpen(
        false,
      );

      return;
    }

    /*
     * Ctrl/Cmd shortcuts
     */
    if (
      event.ctrlKey ||
      event.metaKey
    ) {
      /*
       * Undo
       */
      if (
        event.key.toLowerCase() ===
        "z"
      ) {
        event.preventDefault();

        if (
          event.shiftKey
        ) {
          handleRedo();
        } else {
          handleUndo();
        }

        return;
      }

      /*
       * Redo
       */
      if (
        event.key.toLowerCase() ===
          "y" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        handleRedo();

        return;
      }

      /*
       * Save
       *
       * Auto-save already exists, so this simply
       * performs an immediate save.
       */
      if (
        event.key.toLowerCase() ===
        "s"
      ) {
        event.preventDefault();

        if (
          currentProject
        ) {
          saveProject(
            currentProject.id,
            getEditorState(),
          ).catch(
            console.error,
          );
        }

        return;
      }

      /*
       * Open Projects
       */
      if (
        event.key.toLowerCase() ===
        "o"
      ) {
        event.preventDefault();

        setProjectManagerOpen(
          true,
        );

        return;
      }

      /*
       * Export
       */
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        void handleExport();

        return;
      }

      return;
    }

    /*
     * Space = play / pause
     */
    if (
      event.code ===
      "Space"
    ) {
      event.preventDefault();

      handleTogglePlay();

      return;
    }

    /*
     * Delete selected clip
     */
    if (
      event.key ===
        "Delete" ||
      event.key ===
        "Backspace"
    ) {
      if (
        selectedClipId
      ) {
        event.preventDefault();

        handleDeleteClip(
          selectedClipId,
        );
      }

      return;
    }

    /*
     * S = Split
     */
    if (
      event.key.toLowerCase() ===
      "s"
    ) {
      if (
        selectedClipId
      ) {
        event.preventDefault();

        handleSplitClip(
          selectedClipId,
        );
      }

      return;
    }

    /*
     * Arrow keys
     */
    if (
      event.key === "ArrowLeft"
    ) {
      event.preventDefault();

      const amount =
        event.shiftKey
          ? 1
          : 0.1;

      setCurrentTime(
        (value) =>
          Math.max(
            0,
            value - amount,
          ),
      );

      return;
    }

    if (
      event.key === "ArrowRight"
    ) {
      event.preventDefault();

      const duration =
        clips.reduce(
          (
            max,
            clip,
          ) =>
            Math.max(
              max,
              clip.timelineStart +
                (clip.sourceEnd -
                  clip.sourceStart),
            ),
          0,
        );

      const amount =
        event.shiftKey
          ? 1
          : 0.1;

      setCurrentTime(
        (value) =>
          Math.min(
            duration,
            value + amount,
          ),
      );

      return;
    }

    /*
     * Home
     */
    if (
      event.key ===
      "Home"
    ) {
      event.preventDefault();

      setCurrentTime(0);

      return;
    }

    /*
     * End
     */
    if (
      event.key ===
      "End"
    ) {
      event.preventDefault();

      const duration =
        clips.reduce(
          (
            max,
            clip,
          ) =>
            Math.max(
              max,
              clip.timelineStart +
                (clip.sourceEnd -
                  clip.sourceStart),
            ),
          0,
        );

      setCurrentTime(
        duration,
      );

      return;
    }
  };

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  return () => {
    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );
  };
}, [
  handleUndo,
  handleRedo,
  handleTogglePlay,
  handleExport,
  currentProject,
  getEditorState,
  selectedClipId,
  clips,
]);

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="editor-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            V
          </div>

          <div>
            <h1>
              VIDSBIT
            </h1>

            <span>
              {currentProject?.name ??
                "Video Editor"}
            </span>
          </div>
        </div>

        <div className="topbar-actions">

          <button
  className="history-button"
  disabled={!canUndo}
  onClick={handleUndo}
  title="Undo (Ctrl+Z)"
>
  ↶
</button>

<button
  className="history-button"
  disabled={!canRedo}
  onClick={handleRedo}
  title="Redo (Ctrl+Shift+Z)"
>
  ↷
</button>

          <button
            className="projects-button"
            onClick={() =>
              setProjectManagerOpen(
                true,
              )
            }
          >
            Projects
          </button>

          <button
            className="export-button"
            disabled={
              clips.length ===
                0 ||
              isExporting
            }
            onClick={
              handleExport
            }
          >
            {isExporting
              ? "Exporting..."
              : "Export"}
          </button>
        </div>
      </header>

      <div className="editor-workspace">
        <MediaPanel
          media={media}
          onImport={
            handleImport
          }
          onAddToTimeline={
            handleAddToTimeline
          }
        />

        <Preview
          activeClip={
            activeClip
          }
          media={media}
          isPlaying={
            isPlaying
          }
          timelineTime={
            currentTime
          }
          onVideoEnded={
            handleVideoEnded
          }
          onTogglePlay={
            handleTogglePlay
          }
        />
      </div>

      <Timeline
        clips={clips}
        media={media}
        selectedClipId={
          selectedClipId
        }
        currentTime={
          currentTime
        }
        isPlaying={
          isPlaying
        }
        onSelectClip={
          handleSelectClip
        }
        onDeleteClip={
          handleDeleteClip
        }
        onSplitClip={
          handleSplitClip
        }
        onTrimStart={
          handleTrimStart
        }
        onTrimEnd={
          handleTrimEnd
        }
        onMoveClip={
          handleMoveClip
        }
        onTogglePlay={
          handleTogglePlay
        }
        onSeek={
          handleSeek
        }
      />

      <ProjectManager
        open={
          projectManagerOpen
        }
        currentProjectId={
          currentProject?.id ??
          null
        }
        onOpenProject={
          handleOpenProject
        }
        onClose={() =>
          setProjectManagerOpen(
            false,
          )
        }
      />

      <ExportDialog
        open={isExporting}
        stage={exportStage}
        progress={
          exportProgress
        }
        error={
          exportError
        }
        onClose={
          closeExport
        }
      />
    </main>
  );
}