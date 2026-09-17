import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/**/*.ts',
        'src/features/insights/calendarScroll.ts',
        'src/features/insights/calendarTimeline.ts',
        'src/features/insights/chartEntrance.ts',
      ],
      exclude: ['src/domain/types.ts'],
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
