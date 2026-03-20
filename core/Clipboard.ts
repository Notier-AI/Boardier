/**
 * @boardier-module core/Clipboard
 * @boardier-category Core
 * @boardier-description In-memory clipboard for copy/paste of canvas elements. Deep-clones elements to prevent mutation, assigns fresh IDs on paste, and applies a spatial offset so pasted content is visually distinct.
 * @boardier-since 0.1.0
 */
import type { BoardierElement } from './types';
import { generateId } from '../utils/id';

/**
 * @boardier-class Clipboard
 * @boardier-description Stores a deep-cloned buffer of `BoardierElement[]`. `paste()` returns new elements with fresh IDs and an offset.
 * @boardier-usage `clipboard.copy(selectedElements); const pasted = clipboard.paste(20, 20);`
 */
export class Clipboard {
  private buffer: BoardierElement[] = [];

  copy(elements: BoardierElement[]): void {
    this.buffer = structuredClone(elements);
  }

  paste(offsetX = 20, offsetY = 20): BoardierElement[] {
    return this.buffer.map(el => ({
      ...structuredClone(el),
      id: generateId(),
      x: el.x + offsetX,
      y: el.y + offsetY,
    })) as BoardierElement[];
  }

  get hasContent(): boolean {
    return this.buffer.length > 0;
  }
}
