/**
 * @boardier-module tools/ImageTool
 * @boardier-category Tools
 * @boardier-description Tool for inserting images. Opens a file picker on click and creates an ImageElement from the selected file.
 * @boardier-since 0.1.0
 */
import type { Vec2 } from '../core/types';
import { BaseTool, type ToolContext } from './BaseTool';
import { createImage } from '../elements/base';

/**
 * ImageTool: click to open file dialog + place image at click position,
 * or drag to define image bounds then open file dialog.
 */
export class ImageTool extends BaseTool {
  readonly type = 'image' as const;
  private clickPos: Vec2 = { x: 0, y: 0 };

  getCursor(): string { return 'crosshair'; }

  onPointerDown(_ctx: ToolContext, world: Vec2, _e: PointerEvent): void {
    this.clickPos = world;
  }

  onPointerUp(ctx: ToolContext, _world: Vec2, _e: PointerEvent): void {
    const pos = this.clickPos;

    // Open file dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { document.body.removeChild(input); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // Determine image dimensions
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          // Cap at reasonable size
          const maxSize = 500;
          if (w > maxSize || h > maxSize) {
            const scale = maxSize / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          const defaults = ctx.theme.elementDefaults;
          const el = createImage({
            x: pos.x - w / 2,
            y: pos.y - h / 2,
            width: w,
            height: h,
            src: dataUrl,
            alt: file.name,
            strokeColor: defaults.strokeColor,
            strokeWidth: 0,
          });

          ctx.history.push(ctx.scene.getElements());
          ctx.scene.addElement(el);
          ctx.scene.setSelection([el.id]);
          ctx.commitHistory();
          ctx.requestRender();
          ctx.setToolType('select');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      document.body.removeChild(input);
    };
    input.click();
  }

  onKeyDown(ctx: ToolContext, e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      ctx.setToolType('select');
    }
  }
}
