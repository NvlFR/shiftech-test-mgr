import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import type { RunnerConfig } from './config.js';
import type { ReportArtifact } from './api.js';
import type { CollectedArtifact } from './artifacts.js';
import { log } from './logger.js';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.zip': 'application/zip',
  '.txt': 'text/plain', '.log': 'text/plain', '.har': 'application/json',
  '.html': 'text/html', '.htm': 'text/html',
};

interface SignResponse { bucket: string; uploads: { name: string; path: string; uploadUrl: string }[] }

// Ask the automation-artifacts Edge Function for signed upload URLs, PUT each
// file to Storage, and return artifact metadata pointing at the stored objects.
export async function uploadArtifacts(config: RunnerConfig, jobId: string, collected: CollectedArtifact[]): Promise<ReportArtifact[]> {
  if (collected.length === 0) return [];
  if (!config.artifactUpload) throw new Error('Upload artifact ke Supabase Storage dinonaktifkan');

  let sign: SignResponse;
  try {
    const res = await fetch(`${config.supabaseUrl}/functions/v1/automation-artifacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
      body: JSON.stringify({ token: config.runnerToken, job_id: jobId, files: collected.map((a) => a.name) }),
    });
    if (!res.ok) {
      throw new Error(`Artifact signing failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    }
    sign = await res.json() as SignResponse;
  } catch (err) {
    log.warn('Artifact signing request failed', { error: (err as Error).message });
    throw err;
  }

  const target = new Map(sign.uploads.map((u) => [u.name, u]));
  if (target.size !== collected.length || collected.some((artifact) => !target.has(artifact.name))) {
    throw new Error('Edge Function tidak mengembalikan signed URL untuk seluruh bundle artifact');
  }
  const out: ReportArtifact[] = [];
  for (const a of collected) {
    const t = target.get(a.name);
    if (!t) continue;
    try {
      const put = await fetch(t.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': MIME[extname(a.name).toLowerCase()] ?? 'application/octet-stream', 'x-upsert': 'true' },
        body: readFileSync(a.localPath),
      });
      if (!put.ok) {
        throw new Error(`Artifact upload failed untuk ${a.name} (${put.status})`);
      }
      out.push({ type: a.type, name: a.name, url: t.path, path: t.path, bucket: sign.bucket });
    } catch (err) {
      log.warn('Artifact upload errored', { name: a.name, error: (err as Error).message });
      throw err;
    }
  }
  return out;
}
