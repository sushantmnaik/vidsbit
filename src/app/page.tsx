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
import Inspector from "@/components/editor/Inspector";
import ShortcutsModal from "@/components/editor/ShortcutsModal";
import ExportDialog from "@/components/editor/ExportDialog";
import ProjectManager from "@/components/editor/ProjectManager";

import {
  exportVideo,
  ExportStage,
} from "@/lib/exportVideo";

import {
  createProject,
  ensureDefaultFolder,
  loadProject,
  saveProject,
  requestPersistentStorage,
  exportProjectBundle,
  ProjectSummary,
} from "@/lib/projectStorage";

import {
  EditorState,
  MediaFile,
  MediaType,
  TimelineClip,
  FilterPreset,
  TransitionType,
  emptyEditorState,
  hydrateClip,
  defaultTracks,
  DEFAULT_CAPTION_STYLE,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_IMAGE_DURATION,
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

  const [timelineZoom, setTimelineZoom] =
    useState(1);

  const [aspectRatio, setAspectRatio] =
    useState("16:9");

  const [shortcutsOpen, setShortcutsOpen] =
    useState(false);

  const [videoTrackCount, setVideoTrackCount] =
    useState(2);

  const [audioTrackCount, setAudioTrackCount] =
    useState(2);

  const [selectedVideoTrack, setSelectedVideoTrack] =
    useState(0);

  const [selectedAudioTrack, setSelectedAudioTrack] =
    useState(0);

  const [snapEnabled, setSnapEnabled] =
    useState(true);

  const [musicSearch, setMusicSearch] =
    useState("");

  const [musicMood, setMusicMood] =
    useState("Any");

  const [musicGenre, setMusicGenre] =
    useState("Any");

  const [musicLanguage, setMusicLanguage] =
    useState("Any");

  const {
    record,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
  } = useEditorHistory(emptyEditorState());

  const getEditorState = useCallback(
    (): EditorState => ({
      media,
      clips,
      tracks: defaultTracks(),
      texts: [],
      captions: [],
      captionStyle: { ...DEFAULT_CAPTION_STYLE },
      selectedClipId,
      selectedTextId: null,
      selectedCaptionId: null,
      currentTime,
      snapEnabled,
      settings: { ...DEFAULT_PROJECT_SETTINGS },
    }),
    [
      media,
      clips,
      selectedClipId,
      currentTime,
      snapEnabled,
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
        void requestPersistentStorage();
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
          getEditorState(),
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
    getEditorState,
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

            missing: false,

            reference: {
              fileName: file.name,
              size: file.size,
              lastModified: file.lastModified,
              mimeType: file.type,
            },
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
              hydrateClip({
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
              });

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

        if (!item) {
          return;
        }

        const itemDuration =
          item.duration && item.duration > 0
            ? item.duration
            : item.type === "image"
              ? DEFAULT_IMAGE_DURATION
              : 5;

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

        const isAudioItem = item.type === "audio";
        const targetTrack = isAudioItem
          ? Math.min(
              selectedAudioTrack,
              Math.max(0, audioTrackCount - 1),
            )
          : Math.min(
              selectedVideoTrack,
              Math.max(0, videoTrackCount - 1),
            );

        // Multi-track layer placement:
        // - Overlay tracks (track > 0) or audio: start at current playhead position
        // - Main video track (track 0): append to existing track 0 clips, or place at playhead
        let startPosition = 0;
        if (targetTrack > 0 || isAudioItem) {
          startPosition = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
        } else {
          const track0Clips = clips.filter(
            (c) => c.track === 0 && c.trackKind !== "audio",
          );
          const track0End = track0Clips.reduce(
            (max, c) => Math.max(max, c.timelineStart + (c.sourceEnd - c.sourceStart)),
            0,
          );
          startPosition = currentTime > track0End ? currentTime : track0End;
        }

        const newClip: TimelineClip =
          hydrateClip({
            id:
              `clip-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

            mediaId,

            sourceStart: 0,

            sourceEnd:
              itemDuration,

            timelineStart:
              startPosition,

            track: targetTrack,
            trackKind: isAudioItem ? "audio" : "video",
            speed: 1,
            volume: 100,
            transition: "none",
            rotation: 0,
            filter: "none",
            crop: "none",
            textOverlay: "",
            textAnimation: "none",
            captionStyle: "classic",
            captionAnimation: "none",
            chromaKey: "none",
            videoBackgroundRemoval: "none",
            imageBackgroundRemoval: "none",
            advancedEffect: "none",
            pictureInPicture: targetTrack > 0,
            fadeIn: 0,
            fadeOut: 0,
            audioTrimStart: 0,
            audioTrimEnd: 0,
            backgroundMusic: "none",
            snapEnabled: snapEnabled,
          });

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
      [
        media,
        clips,
        currentTime,
        selectedVideoTrack,
        videoTrackCount,
        selectedAudioTrack,
        audioTrackCount,
        snapEnabled,
      ],
    );

  const handleAddStockAudio = useCallback(
    (track: { title: string; url: string; duration: number }) => {
      const stockId = `stock-audio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const mediaItem: MediaFile = {
        id: stockId,
        name: track.title,
        type: "audio",
        file: null,
        url: track.url,
        duration: track.duration,
        missing: false,
        reference: {
          fileName: `${track.title}.mp3`,
          size: 0,
          lastModified: Date.now(),
          mimeType: "audio/mp3",
        },
      };

      setMedia((prev) => [...prev, mediaItem]);

      const startPosition = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;

      const newClip: TimelineClip = hydrateClip({
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        mediaId: stockId,
        sourceStart: 0,
        sourceEnd: track.duration,
        timelineStart: startPosition,
        track: selectedAudioTrack,
        trackKind: "audio",
        speed: 1,
        volume: 100,
        transition: "none",
        rotation: 0,
        filter: "none",
        crop: "none",
        textOverlay: "",
        textAnimation: "none",
        captionStyle: "classic",
        captionAnimation: "none",
        chromaKey: "none",
        videoBackgroundRemoval: "none",
        imageBackgroundRemoval: "none",
        advancedEffect: "none",
        pictureInPicture: false,
        fadeIn: 0,
        fadeOut: 0,
        audioTrimStart: 0,
        audioTrimEnd: 0,
        backgroundMusic: "none",
        snapEnabled: snapEnabled,
      });

      setClips((prev) => [...prev, newClip]);
      setSelectedClipId(newClip.id);
    },
    [selectedAudioTrack, snapEnabled, currentTime],
  );

  const updateSelectedClip = useCallback(
    (partial: Partial<TimelineClip>) => {
      if (!selectedClipId) {
        return;
      }

      setClips((previous) =>
        previous.map((clip) =>
          clip.id === selectedClipId ? { ...clip, ...partial } : clip,
        ),
      );
    },
    [selectedClipId],
  );

  const handleApplyFilter = useCallback(
    (filter: FilterPreset) => {
      if (!selectedClipId) return;
      updateSelectedClip({ filter });
    },
    [selectedClipId, updateSelectedClip],
  );

  const handleApplyTransition = useCallback(
    (transition: TransitionType) => {
      if (!selectedClipId) return;
      updateSelectedClip({ transition });
    },
    [selectedClipId, updateSelectedClip],
  );

  const handleAddTextOverlay = useCallback(
    (text: string) => {
      if (selectedClipId) {
        setClips((prev) =>
          prev.map((c) => (c.id === selectedClipId ? { ...c, textOverlay: text } : c)),
        );
      } else {
        const clipAtPlayhead = clips.find(
          (c) =>
            currentTime >= c.timelineStart &&
            currentTime < c.timelineStart + (c.sourceEnd - c.sourceStart),
        );
        if (clipAtPlayhead) {
          setSelectedClipId(clipAtPlayhead.id);
          setClips((prev) =>
            prev.map((c) => (c.id === clipAtPlayhead.id ? { ...c, textOverlay: text } : c)),
          );
        } else {
          alert("Please select a clip on the timeline to apply this title / text overlay.");
        }
      }
    },
    [selectedClipId, clips, currentTime],
  );

  const handleAddTextPrompt = useCallback(() => {
    const active = clips.find((c) => c.id === selectedClipId);
    const current = active?.textOverlay ?? "";
    const next = window.prompt("Enter Title / Text Overlay:", current || "Default Title");
    if (next !== null && next.trim()) {
      handleAddTextOverlay(next.trim());
    }
  }, [clips, selectedClipId, handleAddTextOverlay]);

  const getTimelineDuration = useCallback(() => {
    return Math.max(
      0.1,
      clips.reduce(
        (max, clip) =>
          Math.max(
            max,
            clip.timelineStart + (clip.sourceEnd - clip.sourceStart),
          ),
        0,
      ),
    );
  }, [clips]);

  const handleJumpToStart = useCallback(() => {
    setCurrentTime(0);
  }, []);

  const handleJumpToEnd = useCallback(() => {
    setCurrentTime(getTimelineDuration());
  }, [getTimelineDuration]);

  /*
   * ---------------------------------------------------------
   * Normalize timeline
   * ---------------------------------------------------------
   */

  const normalizeClips = (
    source: TimelineClip[],
  ) => {
    return source.map((clip) => {
      const sourceStart = Math.max(0, clip.sourceStart);
      const sourceEnd = Math.max(sourceStart + 0.1, clip.sourceEnd);
      return {
        ...clip,
        sourceStart,
        sourceEnd,
        timelineStart: Math.max(
          0,
          Number.isFinite(clip.timelineStart) ? clip.timelineStart : 0,
        ),
      };
    });
  };

  /*
   * ---------------------------------------------------------
   * Select clip
   * ---------------------------------------------------------
   */

  const handleSelectClip =
    (clipId: string | null) => {
      setSelectedClipId(
        clipId,
      );
      if (clipId) {
        const found = clips.find((c) => c.id === clipId);
        if (found) {
          const duration = Math.max(0.1, found.sourceEnd - found.sourceStart);
          if (currentTime < found.timelineStart || currentTime >= found.timelineStart + duration) {
            setCurrentTime(found.timelineStart);
          }
        }
      }
    };

  /*
   * ---------------------------------------------------------
   * Delete clip
   * ---------------------------------------------------------
   */

  const handleDeleteClip =
    (clipId: string) => {
      const clipToDelete = clips.find(
        (clip) => clip.id === clipId,
      );

      if (!clipToDelete) {
        return;
      }

      record(getEditorState());

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

      setClips(normalized);

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

      const sourceDuration =
        Math.max(
          0.1,
          clip.sourceEnd -
            clip.sourceStart,
        );
      const relative =
        currentTime -
        clip.timelineStart;
      let trimAmount = 0.5;

      if (
        relative > 0.05 &&
        relative < sourceDuration - 0.05
      ) {
        trimAmount = relative;
      } else {
        trimAmount = Math.min(
          1,
          sourceDuration / 2,
        );
      }

      setClips((previous) =>
        normalizeClips(
          previous.map((item) => {
            if (item.id !== clipId) {
              return item;
            }

            const nextStart =
              Math.min(
                item.sourceEnd - 0.1,
                item.sourceStart + trimAmount,
              );
            const actualDelta = nextStart - item.sourceStart;

            return {
              ...item,
              sourceStart: nextStart,
              timelineStart: item.timelineStart + actualDelta,
            };
          }),
        ),
      );
    };

  const handleTrimEnd =
    (clipId: string) => {
      const clip =
        clips.find(
          (item) => item.id === clipId,
        );

      if (!clip) {
        return;
      }

      record(getEditorState());

      const sourceDuration =
        Math.max(
          0.1,
          clip.sourceEnd - clip.sourceStart,
        );
      const relative =
        currentTime -
        clip.timelineStart;
      let trimAmount = 0.5;

      if (
        relative > 0.05 &&
        relative < sourceDuration - 0.05
      ) {
        trimAmount = sourceDuration - relative;
      } else {
        trimAmount = Math.min(
          1,
          sourceDuration / 2,
        );
      }

      setClips((previous) =>
        normalizeClips(
          previous.map((item) => {
            if (item.id !== clipId) {
              return item;
            }

            const nextEnd =
              Math.max(
                item.sourceStart + 0.1,
                item.sourceEnd - trimAmount,
              );

            return {
              ...item,
              sourceEnd: nextEnd,
            };
          }),
        ),
      );
    };

  const handleDuplicateClip =
    (clipId: string) => {
      const clip =
        clips.find(
          (item) => item.id === clipId,
        );

      if (!clip) {
        return;
      }

      record(getEditorState());

      const duplicated: TimelineClip = {
        ...clip,
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timelineStart:
          clip.timelineStart +
          Math.max(0.25, clip.sourceEnd - clip.sourceStart),
      };

      const updated = [...clips, duplicated];

      setClips(normalizeClips(updated));
      setSelectedClipId(duplicated.id);
    };

  const handleReorderClip = (
    sourceId: string,
    targetId: string,
  ) => {
    if (sourceId === targetId) {
      return;
    }

    const sourceClip = clips.find((c) => c.id === sourceId);
    const targetClip = clips.find((c) => c.id === targetId);
    if (!sourceClip || !targetClip) {
      return;
    }

    record(getEditorState());

    const tempStart = sourceClip.timelineStart;
    const nextClips = clips.map((c) => {
      if (c.id === sourceId) {
        return {
          ...c,
          timelineStart: targetClip.timelineStart,
          track: targetClip.track,
          trackKind: targetClip.trackKind,
        };
      }
      if (c.id === targetId) {
        return {
          ...c,
          timelineStart: tempStart,
        };
      }
      return c;
    });

    setClips(normalizeClips(nextClips));
  };

  const handleTrimDragBegin = (
    clipId: string,
    handle: "start" | "end",
  ) => {
    record(getEditorState());
    setSelectedClipId(clipId);
    // The actual pointer movement updates happen in the timeline panel.
    void handle;
  };

  const handleTrimDragUpdate = (
    clipId: string,
    handle: "start" | "end",
    deltaSeconds: number,
  ) => {
    if (!Number.isFinite(deltaSeconds)) {
      return;
    }

    setClips((previous) =>
      normalizeClips(
        previous.map((clip) => {
          if (clip.id !== clipId) {
            return clip;
          }

          const sourceDuration =
            Math.max(0.1, clip.sourceEnd - clip.sourceStart);
          const adjustedDelta =
            handle === "start" ? deltaSeconds : -deltaSeconds;
          const nextStart =
            handle === "start"
              ? Math.min(
                  clip.sourceEnd - 0.1,
                  clip.sourceStart + adjustedDelta,
                )
              : clip.sourceStart;
          const nextEnd =
            handle === "end"
              ? Math.max(
                  clip.sourceStart + 0.1,
                  clip.sourceEnd + adjustedDelta,
                )
              : clip.sourceEnd;

          if (handle === "start") {
            const nextStartVal = Math.min(
              clip.sourceEnd - 0.1,
              Math.max(0, nextStart),
            );
            const actualDelta = nextStartVal - clip.sourceStart;
            return {
              ...clip,
              sourceStart: nextStartVal,
              timelineStart: Math.max(0, clip.timelineStart + actualDelta),
            };
          }

          const endValue = Math.max(
            clip.sourceStart + 0.1,
            Math.min(
              clip.sourceStart + sourceDuration + 2,
              nextEnd,
            ),
          );

          return {
            ...clip,
            sourceEnd: endValue,
          };
        }),
      ),
    );
  };

  const handleZoomIn = useCallback(() => {
    setTimelineZoom((value) =>
      Math.min(5, Math.round((value + 0.25) * 100) / 100),
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    setTimelineZoom((value) =>
      Math.max(1, Math.round((value - 0.25) * 100) / 100),
    );
  }, []);

  const handleFitTimeline = useCallback(() => {
    setTimelineZoom(1);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setTimelineZoom(
      Math.max(1, Math.min(5, Math.round(zoom * 100) / 100)),
    );
  }, []);

  const snapToNearestClip =
    useCallback(
      (time: number) => {
        if (!snapEnabled || clips.length === 0) {
          return time;
        }

        const candidates = [0];

        for (const clip of clips) {
          candidates.push(clip.timelineStart);
          candidates.push(
            clip.timelineStart +
              (clip.sourceEnd - clip.sourceStart),
          );
        }

        const nearest = candidates.reduce(
          (best, candidate) => {
            const distance = Math.abs(candidate - time);

            if (distance < Math.abs(best - time)) {
              return candidate;
            }

            return best;
          },
          candidates[0],
        );

        return nearest;
      },
      [clips, snapEnabled],
    );

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
        Math.max(
          0.1,
          clip.sourceEnd -
            clip.sourceStart,
        );

      let splitOffset = relative;
      if (
        splitOffset <= 0.05 ||
        splitOffset >= duration - 0.05
      ) {
        splitOffset = duration / 2;
      }

      record(
        getEditorState(),
      );

      const split =
        clip.sourceStart +
        splitOffset;

      const first = {
        ...clip,
        id:
          `clip-${Date.now()}-a-${Math.random()
            .toString(36)
            .slice(2)}`,
        sourceEnd:
          split,
        timelineStart:
          clip.timelineStart,
      };

      const second = {
        ...clip,
        id:
          `clip-${Date.now()}-b-${Math.random()
            .toString(36)
            .slice(2)}`,
        sourceStart:
          split,
        timelineStart:
          clip.timelineStart + splitOffset,
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

  const handleMoveClip = (clipId: string, direction: "left" | "right") => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) {
      return;
    }

    record(getEditorState());

    const delta = direction === "left" ? -1 : 1;
    const nextStart = Math.max(0, clip.timelineStart + delta);

    setClips((prev) =>
      normalizeClips(
        prev.map((c) => (c.id === clipId ? { ...c, timelineStart: nextStart } : c)),
      ),
    );
  };

  const handleUpdateClipStart = useCallback((clipId: string, newStart: number) => {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              timelineStart: Math.max(
                0,
                Math.round(newStart * 100) / 100,
              ),
            }
          : clip,
      ),
    );
  }, []);

  const handleUpdateClipTrack = useCallback(
    (clipId: string, newTrack: number, newTrackKind?: "video" | "audio") => {
      record(getEditorState());
      setClips((prev) =>
        prev.map((clip) => {
          if (clip.id !== clipId) {
            return clip;
          }
          return {
            ...clip,
            track: newTrack,
            ...(newTrackKind ? { trackKind: newTrackKind } : {}),
            pictureInPicture: newTrack > 0,
          };
        }),
      );
    },
    [getEditorState, record],
  );
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

  const selectedClip =
    clips.find(
      (clip) =>
        clip.id === selectedClipId,
    ) ?? null;

  const timelineDuration = getTimelineDuration();

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

  const handleVideoEnded = () => {
    const totalDuration = getTimelineDuration();
    if (currentTime >= totalDuration - 0.15) {
      setIsPlaying(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * Seek
   * ---------------------------------------------------------
   */

  const handleSeek =
    (time: number) => {
      const snapped = snapToNearestClip(time);

      setCurrentTime(
        Math.max(
          0,
          snapped,
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
        if (item.url) {
          URL.revokeObjectURL(
            item.url,
          );
        }
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
              aspectRatio,
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

        link.download = blob.type.includes("webm")
          ? "vidsbit-export.webm"
          : "vidsbit-export.mp4";

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
      setShortcutsOpen(
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

      /*
       * Duplicate (Ctrl+D)
       */
      if (
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        if (selectedClipId) {
          handleDuplicateClip(selectedClipId);
        }
        return;
      }

      /*
       * Split (Ctrl+B)
       */
      if (
        event.key.toLowerCase() === "b"
      ) {
        event.preventDefault();
        if (selectedClipId) {
          handleSplitClip(selectedClipId);
        }
        return;
      }

        /*
       * Zoom In (+ or =)
       */
      if (
        event.key === "=" ||
        event.key === "+"
      ) {
        event.preventDefault();
        handleZoomIn();
        return;
      }

      /*
       * Zoom Out (-)
       */
      if (
        event.key === "-" ||
        event.key === "_"
      ) {
        event.preventDefault();
        handleZoomOut();
        return;
      }

      /*
       * Fit Timeline (0)
       */
      if (
        event.key === "0"
      ) {
        event.preventDefault();
        handleFitTimeline();
        return;
      }

      return;
    }

    /*
     * Direct Zoom shortcuts (+ / -) without modifiers
     */
    if (
      event.key === "=" ||
      event.key === "+"
    ) {
      event.preventDefault();
      handleZoomIn();
      return;
    }

    if (
      event.key === "-" ||
      event.key === "_"
    ) {
      event.preventDefault();
      handleZoomOut();
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
     * Q or [ = Ripple Trim Left / Start
     */
    if (
      event.key.toLowerCase() === "q" ||
      event.key === "["
    ) {
      if (selectedClipId) {
        event.preventDefault();
        handleTrimStart(selectedClipId);
      }
      return;
    }

    /*
     * W or ] = Ripple Trim Right / End
     */
    if (
      event.key.toLowerCase() === "w" ||
      event.key === "]"
    ) {
      if (selectedClipId) {
        event.preventDefault();
        handleTrimEnd(selectedClipId);
      }
      return;
    }

    /*
     * N = Toggle Snapping Magnet
     */
    if (
      event.key.toLowerCase() === "n"
    ) {
      event.preventDefault();
      setSnapEnabled((value) => !value);
      return;
    }

    /*
     * T = Add / Edit Text
     */
    if (
      event.key.toLowerCase() === "t"
    ) {
      event.preventDefault();
      handleAddTextPrompt();
      return;
    }

    /*
     * ? = Toggle Shortcuts Cheatsheet
     */
    if (
      event.key === "?"
    ) {
      event.preventDefault();
      setShortcutsOpen((value) => !value);
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
            snapToNearestClip(
              value - amount,
            ),
          ),
      );

      return;
    }

    if (
      event.key === "ArrowRight"
    ) {
      event.preventDefault();

      const duration = getTimelineDuration();

      const amount =
        event.shiftKey
          ? 1
          : 0.1;

      setCurrentTime(
        (value) =>
          Math.min(
            duration,
            snapToNearestClip(
              value + amount,
            ),
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

      const duration = getTimelineDuration();

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
  handleZoomIn,
  handleZoomOut,
  handleFitTimeline,
  handleDeleteClip,
  handleSplitClip,
  handleTrimStart,
  handleTrimEnd,
  handleDuplicateClip,
  handleAddTextPrompt,
  getTimelineDuration,
  snapToNearestClip,
]);

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="editor-app" aria-label="VIDSBIT video editor app">
      {/* PowerDirector / CapCut Studio Topbar */}
      <header className="capcut-topbar">
        <div className="topbar-left">
          <div className="brand-logo">
            <img src="/android-chrome-192x192.png" alt="VIDSBIT logo" />
          </div>
          <div className="brand-titles">
            <h2>VIDSBIT Studio</h2>
            <span className="project-title-badge">
              {currentProject?.name ?? "Untitled Project"}
            </span>
          </div>
        </div>

        <div className="topbar-center">
          <button
            type="button"
            className="top-icon-btn"
            disabled={!canUndo}
            onClick={handleUndo}
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            type="button"
            className="top-icon-btn"
            disabled={!canRedo}
            onClick={handleRedo}
            title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
          >
            ↷
          </button>
          <div className="top-divider" />
          <span className="top-save-status">
            <span className="save-dot" /> Auto-Saved
          </span>
        </div>

        <div className="topbar-right">
          <button
            type="button"
            className="top-action-btn"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard Shortcuts (?)"
          >
            ⌨ Shortcuts
          </button>
          <button
            type="button"
            className="top-action-btn"
            onClick={() => setProjectManagerOpen(true)}
            title="Project Manager (Ctrl+O)"
          >
            📁 Projects
          </button>
          <button
            type="button"
            className="top-action-btn"
            disabled={!currentProject}
            onClick={async () => {
              if (!currentProject) return;
              try {
                const { blob, fileName } = await exportProjectBundle(currentProject.id);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch (e) {
                alert(e instanceof Error ? e.message : "Failed to backup project.");
              }
            }}
            title="Download portable offline backup (.vidsbit)"
          >
            💾 Backup
          </button>
          <button
            type="button"
            className="capcut-export-btn"
            disabled={clips.length === 0 || isExporting}
            onClick={handleExport}
            title="Export Video (Enter)"
          >
            {isExporting ? "Exporting..." : "🎬 Export"}
          </button>
        </div>
      </header>

      {/* Studio Upper Deck: Asset Library | Monitor | Inspector */}
      <div className="capcut-upper-deck">
        <MediaPanel
          media={media}
          onImport={handleImport}
          onAddToTimeline={handleAddToTimeline}
          onAddStockAudio={handleAddStockAudio}
          onApplyFilter={handleApplyFilter}
          onApplyTransition={handleApplyTransition}
          onAddTextOverlay={handleAddTextOverlay}
          selectedClipId={selectedClipId}
        />

        <Preview
          clips={clips}
          media={media}
          isPlaying={isPlaying}
          timelineTime={currentTime}
          totalDuration={getTimelineDuration()}
          aspectRatio={aspectRatio}
          onChangeAspectRatio={setAspectRatio}
          onVideoEnded={handleVideoEnded}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onJumpToStart={handleJumpToStart}
          onJumpToEnd={handleJumpToEnd}
          selectedClipId={selectedClipId}
          onSelectClip={handleSelectClip}
          onUpdateClip={updateSelectedClip}
        />

        <Inspector
          selectedClip={selectedClip}
          media={media}
          currentTime={currentTime}
          onUpdateSelectedClip={updateSelectedClip}
          onDeleteClip={handleDeleteClip}
          onDuplicateClip={handleDuplicateClip}
          onSplitClip={handleSplitClip}
          selectedVideoTrack={selectedVideoTrack}
          selectedAudioTrack={selectedAudioTrack}
          videoTrackCount={videoTrackCount}
          audioTrackCount={audioTrackCount}
          onChangeSelectedVideoTrack={setSelectedVideoTrack}
          onChangeSelectedAudioTrack={setSelectedAudioTrack}
          onAddVideoTrack={() => setVideoTrackCount((v) => v + 1)}
          onAddAudioTrack={() => setAudioTrackCount((v) => v + 1)}
        />
      </div>

      {/* Full-Width Multi-Track Timeline Deck */}
      <Timeline
        clips={clips}
        media={media}
        selectedClipId={selectedClipId}
        currentTime={currentTime}
        isPlaying={isPlaying}
        timelineZoom={timelineZoom}
        snapEnabled={snapEnabled}
        videoTrackCount={videoTrackCount}
        audioTrackCount={audioTrackCount}
        selectedVideoTrack={selectedVideoTrack}
        selectedAudioTrack={selectedAudioTrack}
        onSelectClip={handleSelectClip}
        onDeleteClip={handleDeleteClip}
        onSplitClip={handleSplitClip}
        onTrimStart={handleTrimStart}
        onTrimEnd={handleTrimEnd}
        onMoveClip={handleMoveClip}
        onDuplicateClip={handleDuplicateClip}
        onTrimDragBegin={handleTrimDragBegin}
        onTrimDragUpdate={handleTrimDragUpdate}
        onReorderClip={handleReorderClip}
        onUpdateClipStart={handleUpdateClipStart}
        onUpdateClipTrack={handleUpdateClipTrack}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitTimeline={handleFitTimeline}
        onChangeZoom={handleZoomChange}
        onToggleSnap={() => setSnapEnabled((v) => !v)}
        onAddVideoTrack={() => setVideoTrackCount((v) => v + 1)}
        onAddAudioTrack={() => setAudioTrackCount((v) => v + 1)}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onAddTextPrompt={handleAddTextPrompt}
      />

      {/* Shortcuts Guide Modal */}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Project Manager Modal */}
      <ProjectManager
        open={projectManagerOpen}
        currentProjectId={currentProject?.id ?? null}
        onOpenProject={handleOpenProject}
        onClose={() => setProjectManagerOpen(false)}
      />

      {/* Video Export Dialog */}
      <ExportDialog
        open={isExporting}
        stage={exportStage}
        progress={exportProgress}
        error={exportError}
        onClose={closeExport}
      />
    </main>
  );
}