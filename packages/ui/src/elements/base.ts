/**
 * 自定义元素的基类：在非浏览器环境（SSR/Node）下用一个空类兜底，
 * 这样 `import 'meow-tile-kit'` 不会因为 `HTMLElement` 未定义而报错。
 */
export const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);
