import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync } from 'fs';

const root = __dirname;
const chartCoreSrc = path.resolve(root, './packages/chart-core/src');
const chartReactSrc = path.resolve(root, './packages/chart-react/src');

function resolveChartReactSubpath(subpath: string): string {
  const asFile = path.resolve(chartReactSrc, subpath);
  if (existsSync(`${asFile}.ts`)) return `${asFile}.ts`;
  if (existsSync(`${asFile}.tsx`)) return `${asFile}.tsx`;
  const asIndex = path.resolve(chartReactSrc, subpath, 'index.ts');
  if (existsSync(asIndex)) return asIndex;
  return asFile;
}
const aiToolsCoreSrc = path.resolve(root, './packages/ai-tools-core/src');
const aiToolsChartSrc = path.resolve(root, './packages/ai-tools-chart/src');

function resolveChartCoreSubpath(subpath: string): string {
  const aliased = subpath === 'data-source' ? 'dataSource' : subpath;
  const asFile = path.resolve(chartCoreSrc, aliased);
  if (existsSync(`${asFile}.ts`)) return `${asFile}.ts`;
  if (existsSync(`${asFile}.tsx`)) return `${asFile}.tsx`;
  const asIndex = path.resolve(chartCoreSrc, aliased, 'index.ts');
  if (existsSync(asIndex)) return asIndex;
  return asFile;
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@edge\/chart-core\/(.+)$/,
        replacement: '$1',
        customResolver(source, importer) {
          void importer;
          const subpath = source.replace(/^@edge\/chart-core\//, '');
          return resolveChartCoreSubpath(subpath);
        },
      },
      {
        find: '@edge/chart-core',
        replacement: path.resolve(chartCoreSrc, 'index.ts'),
      },
      {
        find: /^@edge\/chart-react\/(.+)$/,
        replacement: '$1',
        customResolver(source, importer) {
          void importer;
          const subpath = source.replace(/^@edge\/chart-react\//, '');
          return resolveChartReactSubpath(subpath);
        },
      },
      {
        find: '@edge/chart-react',
        replacement: path.resolve(chartReactSrc, 'index.ts'),
      },
      {
        find: '@edge/ai-tools-core',
        replacement: path.resolve(aiToolsCoreSrc, 'index.ts'),
      },
      {
        find: '@edge/ai-tools-chart',
        replacement: path.resolve(aiToolsChartSrc, 'index.ts'),
      },
      {
        find: '@',
        replacement: path.resolve(root, './src'),
      },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/__tests__/**/*.{ts,tsx}',
      'packages/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
