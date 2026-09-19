"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  EditorState,
} from "@/types/editor";

const MAX_HISTORY = 100;

function cloneEditorState(
  state: EditorState,
): EditorState {
  return {
    media: [...state.media],

    clips: state.clips.map(
      (clip) => ({
        ...clip,
      }),
    ),

    selectedClipId:
      state.selectedClipId,

    currentTime:
      state.currentTime,
  };
}

export function useEditorHistory(
  initialState: EditorState,
) {
  const [undoStack, setUndoStack] =
    useState<EditorState[]>([]);

  const [redoStack, setRedoStack] =
    useState<EditorState[]>([]);

  /*
   * Keep refs synchronized with the state so keyboard
   * handlers and callbacks always see the latest history.
   */
  const undoRef =
    useRef<EditorState[]>([]);

  const redoRef =
    useRef<EditorState[]>([]);

  const syncUndo = (
    value: EditorState[],
  ) => {
    undoRef.current = value;
    setUndoStack(value);
  };

  const syncRedo = (
    value: EditorState[],
  ) => {
    redoRef.current = value;
    setRedoStack(value);
  };

  /*
   * Call this BEFORE performing an editing operation.
   */
  const record = useCallback(
    (state: EditorState) => {
      const snapshot =
        cloneEditorState(
          state,
        );

      const next = [
        ...undoRef.current,
        snapshot,
      ];

      if (
        next.length >
        MAX_HISTORY
      ) {
        next.shift();
      }

      syncUndo(next);

      /*
       * Once a new edit happens, the redo branch
       * is no longer valid.
       */
      syncRedo([]);
    },
    [],
  );

  const undo = useCallback(
    (
      currentState: EditorState,
    ): EditorState | null => {
      if (
        undoRef.current.length ===
        0
      ) {
        return null;
      }

      const stack = [
        ...undoRef.current,
      ];

      const previous =
        stack.pop();

      if (!previous) {
        return null;
      }

      /*
       * Current state becomes a redo state.
       */
      const redoNext = [
        ...redoRef.current,
        cloneEditorState(
          currentState,
        ),
      ];

      syncUndo(stack);
      syncRedo(
        redoNext.slice(
          -MAX_HISTORY,
        ),
      );

      return cloneEditorState(
        previous,
      );
    },
    [],
  );

  const redo = useCallback(
    (
      currentState: EditorState,
    ): EditorState | null => {
      if (
        redoRef.current.length ===
        0
      ) {
        return null;
      }

      const stack = [
        ...redoRef.current,
      ];

      const next =
        stack.pop();

      if (!next) {
        return null;
      }

      /*
       * Current state becomes an undo state.
       */
      const undoNext = [
        ...undoRef.current,
        cloneEditorState(
          currentState,
        ),
      ];

      syncRedo(stack);
      syncUndo(
        undoNext.slice(
          -MAX_HISTORY,
        ),
      );

      return cloneEditorState(
        next,
      );
    },
    [],
  );

  const clearHistory =
    useCallback(() => {
      undoRef.current = [];
      redoRef.current = [];

      setUndoStack([]);
      setRedoStack([]);
    }, []);

  return {
    record,

    undo,
    redo,

    clearHistory,

    canUndo:
      undoStack.length > 0,

    canRedo:
      redoStack.length > 0,
  };
}