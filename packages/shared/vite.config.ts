import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: [
      'src/media.ts',
      'src/catalog.ts',
      'src/db.ts',
      'src/auth.ts',
      'src/interaction.ts',
      'src/settings.ts',
      'src/preferences.ts',
      'src/scheduler.ts',
      'src/constants.ts',
      'src/utils.ts',
      'src/env.ts',
      'src/logs.ts',
      'src/version.ts',
    ],
    dts: true,
  },
});
