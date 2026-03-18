import type { BoardierElement, Vec2, Bounds, ViewState, BoardierSceneData } from './types';
import { hitTestElement, getElementBounds } from '../elements/base';
import { boundsIntersect, boundsContainsPoint } from '../utils/math';

type Listener<T extends (...args: any[]) => void> = T;

export class Scene {
  private elements: BoardierElement[] = [];
  private selectedIds: Set<string> = new Set();

  private changeListeners: Listener<(els: BoardierElement[]) => void>[] = [];
  private selectionListeners: Listener<(ids: string[]) => void>[] = [];

  // ─── Element CRUD ────────────────────────────────────────────────

  getElements(): BoardierElement[] {
    return this.elements;
  }

  setElements(elements: BoardierElement[]): void {
    this.elements = elements;
    this.emitChange();
  }

  getElementById(id: string): BoardierElement | undefined {
    return this.elements.find(e => e.id === id);
  }

  addElement(el: BoardierElement): void {
    this.elements.push(el);
    this.emitChange();
  }

  addElements(els: BoardierElement[]): void {
    this.elements.push(...els);
    this.emitChange();
  }

  removeElement(id: string): void {
    this.elements = this.elements.filter(e => e.id !== id);
    this.selectedIds.delete(id);
    this.emitChange();
  }

  removeElements(ids: string[]): void {
    const set = new Set(ids);
    this.elements = this.elements.filter(e => !set.has(e.id));
    for (const id of ids) this.selectedIds.delete(id);
    this.emitChange();
  }

  updateElement(id: string, updates: Partial<BoardierElement>): void {
    const idx = this.elements.findIndex(e => e.id === id);
    if (idx === -1) return;
    this.elements[idx] = { ...this.elements[idx], ...updates } as BoardierElement;
    this.emitChange();
  }

  /** Batch update — avoids emitting per element. */
  updateElements(updates: { id: string; changes: Partial<BoardierElement> }[]): void {
    for (const u of updates) {
      const idx = this.elements.findIndex(e => e.id === u.id);
      if (idx !== -1) this.elements[idx] = { ...this.elements[idx], ...u.changes } as BoardierElement;
    }
    this.emitChange();
  }

  // ─── Selection ───────────────────────────────────────────────────

  getSelectedIds(): string[] {
    return [...this.selectedIds];
  }

  getSelectedElements(): BoardierElement[] {
    return this.elements.filter(e => this.selectedIds.has(e.id));
  }

  setSelection(ids: string[]): void {
    this.selectedIds = new Set(ids);
    this.emitSelection();
  }

  addToSelection(id: string): void {
    this.selectedIds.add(id);
    this.emitSelection();
  }

  clearSelection(): void {
    if (this.selectedIds.size === 0) return;
    this.selectedIds.clear();
    this.emitSelection();
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  // ─── Hit testing ─────────────────────────────────────────────────

  /** Returns the topmost (last) element under the point, or null. */
  hitTest(point: Vec2, tolerance: number = 4): BoardierElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      if (el.locked) continue;
      if (hitTestElement(el, point, tolerance)) return el;
    }
    return null;
  }

  /** Returns all elements whose bounds intersect the given rectangle. */
  getElementsInBounds(bounds: Bounds): BoardierElement[] {
    return this.elements.filter(el => {
      const eb = getElementBounds(el);
      return boundsIntersect(eb, bounds);
    });
  }

  // ─── Z-order ─────────────────────────────────────────────────────

  bringToFront(id: string): void {
    const idx = this.elements.findIndex(e => e.id === id);
    if (idx === -1 || idx === this.elements.length - 1) return;
    const [el] = this.elements.splice(idx, 1);
    this.elements.push(el);
    this.emitChange();
  }

  sendToBack(id: string): void {
    const idx = this.elements.findIndex(e => e.id === id);
    if (idx <= 0) return;
    const [el] = this.elements.splice(idx, 1);
    this.elements.unshift(el);
    this.emitChange();
  }

  // ─── Serialization ───────────────────────────────────────────────

  toJSON(viewState: ViewState): BoardierSceneData {
    return {
      engine: 'boardier',
      elements: structuredClone(this.elements),
      viewState: { ...viewState },
    };
  }

  fromJSON(data: { elements?: BoardierElement[]; viewState?: ViewState }): ViewState {
    this.elements = data.elements ? structuredClone(data.elements) : [];
    this.selectedIds.clear();
    this.emitChange();
    this.emitSelection();
    return data.viewState ?? { scrollX: 0, scrollY: 0, zoom: 1 };
  }

  // ─── Events ──────────────────────────────────────────────────────

  onChange(fn: (els: BoardierElement[]) => void): () => void {
    this.changeListeners.push(fn);
    return () => { this.changeListeners = this.changeListeners.filter(f => f !== fn); };
  }

  onSelectionChange(fn: (ids: string[]) => void): () => void {
    this.selectionListeners.push(fn);
    return () => { this.selectionListeners = this.selectionListeners.filter(f => f !== fn); };
  }

  private emitChange() {
    for (const fn of this.changeListeners) fn(this.elements);
  }

  private emitSelection() {
    for (const fn of this.selectionListeners) fn([...this.selectedIds]);
  }
}
