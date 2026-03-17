import type { BoardierElement } from './types';

/**
 * Simple undo/redo stack using full-scene snapshots.
 * Snapshots are deep-cloned, so mutations to the live scene don't affect history.
 */
export class History {
  private stack: BoardierElement[][] = [];
  private pointer: number = -1;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /** Push a snapshot of the current scene. Call AFTER completing an operation. */
  push(elements: BoardierElement[]): void {
    // Discard any redo-future beyond the current pointer
    this.stack.splice(this.pointer + 1);
    this.stack.push(structuredClone(elements));

    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    this.pointer = this.stack.length - 1;
  }

  /** Undo — returns the previous snapshot, or null if at the bottom. */
  undo(): BoardierElement[] | null {
    if (this.pointer <= 0) return null;
    this.pointer--;
    return structuredClone(this.stack[this.pointer]);
  }

  /** Redo — returns the next snapshot, or null if at the top. */
  redo(): BoardierElement[] | null {
    if (this.pointer >= this.stack.length - 1) return null;
    this.pointer++;
    return structuredClone(this.stack[this.pointer]);
  }

  get canUndo(): boolean {
    return this.pointer > 0;
  }

  get canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.pointer = -1;
  }
}
