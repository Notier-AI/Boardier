import type { BoardierElement } from './types';
import { generateId } from '../utils/id';

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
