import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],

    // Component test dengan jsdom + testing-library memang lambat: render penuh,
    // userEvent yang menunggu, dan efek async. Dengan batas bawaan 5 detik,
    // test yang sehat ikut gagal saat mesin sibuk menjalankan file lain secara
    // paralel — jumlah kegagalannya bahkan berubah tiap run (3 vs 5).
    // Flaky seperti itu berbahaya untuk loop tanpa pengawasan: task yang benar
    // akan dilabeli `blocked` dan membakar token untuk retry.
    testTimeout: 20_000,
    hookTimeout: 20_000,

    // Kebersihan antar-test: mock dikembalikan ke keadaan semula supaya
    // kegagalan tidak pernah bergantung pada urutan eksekusi.
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,

    coverage: {
      provider: 'v8',
    },
  },
});
