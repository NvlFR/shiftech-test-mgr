export type ProjectPromptStarterId =
  | 'generate-test-cases'
  | 'analyze-latest-run'
  | 'triage-open-issues'
  | 'select-regression'
  | 'audit-requirement-coverage'
  | 'connect-runner';

export interface ProjectPromptStarterTemplate {
  id: ProjectPromptStarterId;
  category: string;
  title: string;
  description: string;
  template: string;
}

export const PROJECT_PROMPT_STARTERS: readonly ProjectPromptStarterTemplate[] = [
  {
    id: 'connect-runner',
    category: 'Local Runner',
    title: 'Pasang & sambungkan runner',
    description: 'Buat kode sekali pakai 10 menit dan instruksikan agent memasang runner dengan satu perintah.',
    template: `Pasang dan sambungkan Local Runner TestManager untuk project {{projectName}} (ID: {{projectId}}).

Jalankan perintah berikut dari root project Playwright:
{{bootstrapCommand}}

Setelah init berhasil, start runner dan tunggu heartbeat pertamanya terdeteksi oleh TestManager. Laporkan kembali hanya nama runner, label, dan project yang tersambung. Jangan tampilkan bootstrap code, runner token, atau secret lain.`,
  },
  {
    id: 'generate-test-cases',
    category: 'Generate Test Case',
    title: 'Generate test case dari requirement',
    description: 'Susun kandidat Test Case yang dapat direview manusia dari requirement project.',
    template: `Gunakan MCP TestManager untuk project {{projectName}} (ID: {{projectId}}).
Konteks module: {{modules}}.
Environment aktif: {{environments}}.

Baca requirement yang relevan, lalu buat kandidat Test Case positif, negatif, dan edge case. Petakan setiap kandidat ke module yang paling sesuai, tulis precondition, langkah yang dapat dieksekusi, serta expected result yang terukur. Jangan menyimpan perubahan sebelum saya menyetujui hasil review.`,
  },
  {
    id: 'analyze-latest-run',
    category: 'Analisis Test Run',
    title: 'Analisis Test Run terakhir',
    description: 'Ringkas hasil run terbaru, pola kegagalan, dan langkah tindak lanjut.',
    template: `Gunakan MCP TestManager untuk project {{projectName}} (ID: {{projectId}}).
Konteks module: {{modules}}.
Environment aktif: {{environments}}.

Temukan Test Run terbaru, analisis summary dan seluruh hasil non-PASS, lalu kelompokkan kegagalan berdasarkan module dan kemungkinan akar masalah. Soroti bukti yang kurang, kandidat flaky, serta rekomendasi retest. Jangan mengubah status Test Run secara otomatis.`,
  },
  {
    id: 'triage-open-issues',
    category: 'Triage Issue',
    title: 'Triage Issue terbuka',
    description: 'Prioritaskan Issue terbuka dengan bukti dan tindakan yang jelas.',
    template: `Gunakan MCP TestManager untuk project {{projectName}} (ID: {{projectId}}).
Konteks module: {{modules}}.
Environment aktif: {{environments}}.

Tinjau semua Issue yang masih terbuka. Kelompokkan duplikat atau gejala serupa, nilai dampak dan urgensinya, lalu rekomendasikan prioritas, owner, informasi yang masih kurang, dan next action. Sertakan referensi Test Result serta bukti terkait; minta konfirmasi sebelum mengubah data.`,
  },
  {
    id: 'select-regression',
    category: 'Pilih Regression',
    title: 'Pilih regression untuk Issue resolved',
    description: 'Pilih cakupan regression berbasis risiko untuk Issue yang sudah resolved.',
    template: `Gunakan MCP TestManager untuk project {{projectName}} (ID: {{projectId}}).
Konteks module: {{modules}}.
Environment aktif: {{environments}}.

Temukan Issue berstatus resolved yang belum diverifikasi. Untuk setiap Issue, pilih Test Case regression minimum berbasis area terdampak, dependency, riwayat kegagalan, dan risiko perubahan. Jelaskan alasan memilih atau mengecualikan setiap cakupan dan minta persetujuan sebelum membuat Test Run baru.`,
  },
  {
    id: 'audit-requirement-coverage',
    category: 'Audit Coverage',
    title: 'Audit coverage requirement',
    description: 'Temukan requirement tanpa coverage atau dengan coverage lemah.',
    template: `Gunakan MCP TestManager untuk project {{projectName}} (ID: {{projectId}}).
Konteks module: {{modules}}.
Environment aktif: {{environments}}.

Audit coverage seluruh requirement. Identifikasi requirement tanpa Test Case, coverage yang hanya mencakup happy path, mapping yang meragukan, serta area berisiko tinggi tanpa skenario negatif atau edge case. Sajikan gap per module dan rekomendasi terurut; jangan membuat Test Case sebelum saya menyetujui usulannya.`,
  },
] as const;
