<section class="cover">
<p class="eyebrow">Design Review — Draft for Sign-off</p>
<h1>Test Management, versi 2</h1>
<p class="dek">Dari "satu hasil terakhir" menjadi riwayat pengujian penuh — Test Run, Test Result, dan Issue sebagai entitas tersendiri.</p>
</section>

## Mengapa berubah

Model lama menyimpan hasil PASS/FAIL langsung di baris penghubung Test Plan–Test Case (`test_plan_cases.last_result`). Setiap kali test case dites ulang, hasil sebelumnya **tertimpa** — tidak ada riwayat rilis-ke-rilis.

Konsep barumu memisahkan ini menjadi lima peran yang jelas:

<div class="concept-flow">
  <div class="concept-node">
    <span class="node-label">Project</span>
    <span class="node-note">aplikasi yang diuji</span>
  </div>
  <div class="concept-arrow">→</div>
  <div class="concept-node">
    <span class="node-label">Module</span>
    <span class="node-note">pengelompokan fitur</span>
  </div>
  <div class="concept-arrow">→</div>
  <div class="concept-node accent">
    <span class="node-label">Test Case</span>
    <span class="node-note">template, tanpa hasil</span>
  </div>
</div>

<div class="concept-flow">
  <div class="concept-node">
    <span class="node-label">Test Plan</span>
    <span class="node-note">cakupan pengujian</span>
  </div>
  <div class="concept-arrow">→</div>
  <div class="concept-node">
    <span class="node-label">Test Run</span>
    <span class="node-note">satu sesi eksekusi</span>
  </div>
  <div class="concept-arrow">→</div>
  <div class="concept-node accent">
    <span class="node-label">Test Result</span>
    <span class="node-note">PASS / FAIL / SKIP</span>
  </div>
  <div class="concept-arrow">→</div>
  <div class="concept-node warn">
    <span class="node-label">Issue</span>
    <span class="node-note">0..N per hasil FAIL</span>
  </div>
</div>

Regression Test yang dijalankan ulang minggu depan bukan menimpa data lama — ia jadi **Test Run baru**, dengan **Test Result baru** untuk setiap test case. Riwayat setiap rilis tetap utuh.

---

## Skema tabel

<div class="table-scroll">

| Tabel | Peran | Field kunci |
|---|---|---|
| `modules` | Master, per-project | `project_id`, `name` |
| `tags` + `test_case_tags` | Label bebas, many-to-many ke Test Case | `project_id`, `name` |
| `test_cases` *(diperbarui)* | Template pengujian — **tidak pernah menyimpan hasil** | + `module_id`, `objective`, `notes`; status → `active` \| `archived` |
| `test_plan_cases` *(disederhanakan)* | Hanya "test case mana saja masuk plan ini" | kolom hasil **dihapus** |
| `test_runs` | Satu sesi eksekusi terhadap satu Test Plan | `test_plan_id`, `name`, `status`, `started_at`, `completed_at` |
| `test_results` | Satu baris per (Test Run × Test Case) — **di sinilah PASS/FAIL/SKIP hidup** | `test_run_id`, `test_case_id`, `tester_id`, `status`, `executed_at`, `notes` |
| `issues` | 0..N per Test Result (1:many, sesuai keputusanmu) | `test_result_id`, `title`, `actual_result`, `expected_result`, `priority`, `status`, `assigned_to` |

</div>

File lengkap: `supabase/schema_test_management_v2.sql` — siap dijalankan setelah `schema_project_lifecycle.sql`.

---

## Keputusan yang sudah dikunci

<div class="decision-list">
  <div class="decision-item">
    <span class="decision-badge locked">Terkunci</span>
    <div>
      <p class="decision-title">Riwayat penuh, bukan hasil terakhir</p>
      <p class="decision-note">Test Run baru setiap sesi eksekusi. Tidak ada lagi kolom hasil yang tertimpa.</p>
    </div>
  </div>
  <div class="decision-item">
    <span class="decision-badge locked">Terkunci</span>
    <div>
      <p class="decision-title">Issue 1:many terhadap Test Result</p>
      <p class="decision-note">Satu kegagalan boleh melahirkan beberapa temuan terpisah yang dilacak sendiri-sendiri.</p>
    </div>
  </div>
  <div class="decision-item">
    <span class="decision-badge locked">Terkunci</span>
    <div>
      <p class="decision-title">Module &amp; Tag sebagai master, bukan teks bebas</p>
      <p class="decision-note">Module wajib satu per Test Case, di-scope per project. Tag bebas banyak, beda fungsi dari Module (pencarian silang, bukan kategori utama).</p>
    </div>
  </div>
  <div class="decision-item">
    <span class="decision-badge locked">Terkunci</span>
    <div>
      <p class="decision-title">Steps tetap teks, bukan Test Step ternormalisasi</p>
      <p class="decision-note">Sesuai catatanmu — cukup untuk tim kecil, bisa dipecah jadi entitas sendiri nanti tanpa mengubah konsep inti.</p>
    </div>
  </div>
</div>

---

## Yang masih perlu keputusanmu

<div class="decision-list">
  <div class="decision-item open">
    <span class="decision-badge open">Perlu jawaban</span>
    <div>
      <p class="decision-title">Tester: user aplikasi, atau nama bebas?</p>
      <p class="decision-note"><code>test_results.tester_id</code> saat ini mengacu ke <code>profiles</code> (user terdaftar). Kalau ada tester eksternal tanpa akun Google, field ini perlu jadi teks bebas atau nullable dengan fallback nama manual.</p>
    </div>
  </div>
  <div class="decision-item open">
    <span class="decision-badge open">Perlu jawaban</span>
    <div>
      <p class="decision-title">Status Test Run: siapa yang menandai "Completed"?</p>
      <p class="decision-note">Manual (tombol "Selesaikan Run" oleh tester/admin), atau otomatis begitu semua Test Result terisi (tidak ada lagi yang <code>not_run</code>)?</p>
    </div>
  </div>
  <div class="decision-item open">
    <span class="decision-badge open">Perlu jawaban</span>
    <div>
      <p class="decision-title">Attachment Issue: link URL, atau upload file?</p>
      <p class="decision-note">Skema saat ini <code>attachment_url</code> (teks) — paling sederhana. Upload file sungguhan butuh Supabase Storage + policy tambahan, lebih banyak kerja untuk v1.</p>
    </div>
  </div>
</div>

---

## Urutan pengerjaan yang diusulkan

<div class="roadmap">
  <div class="roadmap-step">
    <span class="roadmap-num">1</span>
    <div>
      <p class="roadmap-title">Module</p>
      <p class="roadmap-note">Master CRUD per project — fondasi sebelum Test Case bisa dikelompokkan.</p>
    </div>
  </div>
  <div class="roadmap-step">
    <span class="roadmap-num">2</span>
    <div>
      <p class="roadmap-title">Test Case (diperbarui)</p>
      <p class="roadmap-note">Form create/edit lengkap: Module, Objective, Precondition, Steps, Expected Result, Priority, Status, Notes, Tags.</p>
    </div>
  </div>
  <div class="roadmap-step">
    <span class="roadmap-num">3</span>
    <div>
      <p class="roadmap-title">Test Run &amp; Test Result</p>
      <p class="roadmap-note">Mulai run baru dari Test Plan, isi hasil PASS/FAIL/SKIP per test case, lihat riwayat run sebelumnya.</p>
    </div>
  </div>
  <div class="roadmap-step">
    <span class="roadmap-num">4</span>
    <div>
      <p class="roadmap-title">Issue</p>
      <p class="roadmap-note">Buat issue dari Test Result yang FAIL, kelola status penyelesaian.</p>
    </div>
  </div>
</div>

<style>
:root {
  --ink: #23211d;
  --ink-soft: #5c584f;
  --paper: #faf7f0;
  --paper-raised: #ffffff;
  --line: #e2ddd0;
  --accent: #a2492f;
  --accent-soft: #f0dcd2;
  --warn: #8a6d1f;
  --warn-soft: #f3e8c9;
  --locked-soft: #dde6dc;
  --locked-ink: #3d5a3f;
  --mono: ui-monospace, 'SF Mono', Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #eee9df;
    --ink-soft: #a9a294;
    --paper: #1c1a16;
    --paper-raised: #252220;
    --line: #3a352d;
    --accent: #e08a68;
    --accent-soft: #3a2620;
    --warn: #d4b256;
    --warn-soft: #362c17;
    --locked-soft: #253226;
    --locked-ink: #a8c9a9;
  }
}

:root[data-theme="dark"] {
  --ink: #eee9df;
  --ink-soft: #a9a294;
  --paper: #1c1a16;
  --paper-raised: #252220;
  --line: #3a352d;
  --accent: #e08a68;
  --accent-soft: #3a2620;
  --warn: #d4b256;
  --warn-soft: #362c17;
  --locked-soft: #253226;
  --locked-ink: #a8c9a9;
}

:root[data-theme="light"] {
  --ink: #23211d;
  --ink-soft: #5c584f;
  --paper: #faf7f0;
  --paper-raised: #ffffff;
  --line: #e2ddd0;
  --accent: #a2492f;
  --accent-soft: #f0dcd2;
  --warn: #8a6d1f;
  --warn-soft: #f3e8c9;
  --locked-soft: #dde6dc;
  --locked-ink: #3d5a3f;
}

@font-face {
  font-family: 'Fraunces';
  src: local('Fraunces');
  font-weight: 300 700;
}

* { box-sizing: border-box; }

body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
  line-height: 1.6;
  max-width: 46rem;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
}

.cover {
  margin-bottom: 3rem;
}

.eyebrow {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--accent);
  margin: 0 0 0.75rem;
}

h1 {
  font-family: Georgia, 'Iowan Old Style', serif;
  font-weight: 700;
  font-size: 2.4rem;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 0.75rem;
  text-wrap: balance;
  color: var(--ink);
}

.dek {
  font-size: 1.05rem;
  color: var(--ink-soft);
  max-width: 38rem;
  margin: 0;
  text-wrap: balance;
}

h2 {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  border-top: 1px solid var(--line);
  padding-top: 0.5rem;
  margin: 0 0 1.25rem;
}

hr {
  border: none;
  height: 1px;
  background: var(--line);
  margin: 2.5rem 0;
}

p { margin: 0 0 1rem; color: var(--ink); }
p:last-child { margin-bottom: 0; }

code {
  font-family: var(--mono);
  font-size: 0.85em;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

/* concept flow */
.concept-flow {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.concept-node {
  flex: 1 1 8rem;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 8rem;
}

.concept-node.accent {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.concept-node.warn {
  border-color: var(--warn);
  background: var(--warn-soft);
}

.node-label {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ink);
}

.node-note {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.concept-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
  font-size: 1.1rem;
  flex: 0 0 auto;
  padding: 0 0.1rem;
}

/* table */
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 1.25rem;
}

table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.88rem;
  background: var(--paper-raised);
}

th, td {
  text-align: left;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}

th {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  font-weight: 600;
  background: var(--paper);
}

tr:last-child td { border-bottom: none; }

/* decisions */
.decision-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.decision-item {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 0.85rem 1rem;
}

.decision-badge {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  flex: 0 0 auto;
  margin-top: 0.1rem;
}

.decision-badge.locked {
  background: var(--locked-soft);
  color: var(--locked-ink);
}

.decision-badge.open {
  background: var(--warn-soft);
  color: var(--warn);
}

.decision-title {
  font-weight: 700;
  margin: 0 0 0.2rem;
  font-size: 0.95rem;
}

.decision-note {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

/* roadmap */
.roadmap {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.roadmap-step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--line);
}

.roadmap-step:last-child { border-bottom: none; }

.roadmap-num {
  font-family: Georgia, serif;
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--accent);
  flex: 0 0 auto;
  width: 1.75rem;
}

.roadmap-title {
  font-weight: 700;
  margin: 0 0 0.2rem;
  font-size: 0.95rem;
}

.roadmap-note {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft);
}

@media (max-width: 600px) {
  body { padding: 2rem 1rem 3rem; }
  h1 { font-size: 1.9rem; }
  .concept-flow { flex-direction: column; }
  .concept-arrow { transform: rotate(90deg); padding: 0.15rem 0; }
}
</style>
