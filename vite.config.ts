import { defineConfig } from 'vite';

const repoBase = process.env.GITHUB_ACTIONS ? '/EarthShuffle/' : '/';

export default defineConfig({
  base: repoBase,
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
