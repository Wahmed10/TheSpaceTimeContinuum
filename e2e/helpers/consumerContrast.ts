import type { Page } from '@playwright/test';

/** Audit actual computed colors for axe's incomplete contrast targets. Requires
 * an opaque CSS surface; never infers a color from the canvas or a gradient.
 * W3C: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
 * This supplements the complete unmodified axe result, not a conformance claim.
 */
export async function incompleteContrast(page: Page, targets: string[]) {
  return page.evaluate((selectors) => {
    const parse = (css: string) => {
      const values = css.match(/[\d.]+/g)?.map(Number);
      if (!/^rgba?\(/.test(css) || !values || values.length < 3)
        throw new Error('Unsupported computed color: ' + css);
      return [values[0]!, values[1]!, values[2]!, values[3] ?? 1];
    };
    const luminance = (rgb: number[]) => {
      const linear = rgb.slice(0, 3).map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
    };
    return selectors.map((target) => {
      const element = document.querySelector<HTMLElement>(target);
      if (!element) throw new Error('Missing contrast target: ' + target);
      const textStyle = getComputedStyle(element);
      const layers: number[][] = [];
      let opaque = false;
      for (
        let ancestor: HTMLElement | null = element;
        ancestor;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (style.backgroundImage !== 'none' || Number(style.opacity) !== 1)
          break;
        const color = parse(style.backgroundColor);
        layers.push(color);
        if (color[3] === 1) {
          opaque = true;
          break;
        }
      }
      if (!opaque)
        return {
          target,
          resolved: false,
          foreground: textStyle.color,
          ratio: 0,
          minimum: 4.5,
        };
      let background = layers.pop()!;
      for (const layer of layers.reverse())
        background = layer
          .slice(0, 3)
          .map((c, i) => c * layer[3]! + background[i]! * (1 - layer[3]!));
      const color = parse(textStyle.color);
      const foreground = color
        .slice(0, 3)
        .map((c, i) => c * color[3]! + background[i]! * (1 - color[3]!));
      const light = luminance(foreground),
        dark = luminance(background);
      const size = parseFloat(textStyle.fontSize),
        bold = Number(textStyle.fontWeight) >= 700;
      // Symbols use the non-text threshold; ordinary text uses its actual size.
      const symbol = !/[\p{L}\p{N}]/u.test(element.textContent ?? '');
      const minimum =
        symbol || size >= 24 || (bold && size >= 18.666666666666668) ? 3 : 4.5;
      return {
        target,
        resolved: true,
        foreground,
        background,
        ratio: (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05),
        minimum,
        symbol,
        fontSize: size,
      };
    });
  }, targets);
}
