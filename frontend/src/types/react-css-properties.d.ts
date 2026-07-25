// Allows CSS custom properties in `style` props, e.g. style={{ '--offset': 8 }}.
//
// The `import type` below is load-bearing: it makes this file a module, so the
// `declare module 'react'` is treated as an *augmentation* of @types/react. In a
// non-module file (like vite-env.d.ts) the same block instead declares an ambient
// module that REPLACES @types/react entirely, which breaks every named import
// from 'react' across the codebase.
import type {} from 'react';

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
