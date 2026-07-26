import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RunnerConfig } from './config.js';
import type { ReportArtifact } from './api.js';
import type { CollectedArtifact } from './artifacts.js';
import { log } from './logger.js';

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.zip': 'application/zip',
  '.txt': 'text/plain', '.log': 'text/plain',
};

interface SignResponse { bucket: string; uploads: { name: string; path: string; uploadUrl: string }[] }

// Local-path fallback used when upload is disabled or fails. The central server
// stores whatever URL we report; a file:// path is only useful on this machine.
function localFallback(config: RunnerConfig, jobId: string, collected: CollectedArtifact[]): ReportArtifact[] {
  return collected.map((a) => ({
    type: a.type,
    name: a.name,
    url: config.artifactBaseUrl ? `${config.artifactBaseUrl}/${jobId}/${a.name}` : pathToFileURL(a.localPath).href,
  }));
}

// Ask the automation-artifacts Edge Function for signed upload URLs, PUT each
// file to Storage, and return artifact metadata pointing at the stored objects.
export async function uploadArtifacts(config: RunnerConfig, jobId: string, collected: CollectedArtifact[]): Promise<ReportArtifact[]> {
  if (collected.length === 0) return [];
  if (!config.artifactUpload) return localFallback(config, jobId, collected);

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
      log.warn('Artifact signing failed, using local paths', { status: res.status, body: (await res.text()).slice(0, 200) });
      return localFallback(config, jobId, collected);
    }
    sign = await res.json() as SignResponse;
  } catch (err) {
    log.warn('Artifact signing request errored, using local paths', { error: (err as Error).message });
    return localFallback(config, jobId, collected);
  }

  const target = new Map(sign.uploads.map((u) => [u.name, u]));
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
        log.warn('Artifact upload failed', { name: a.name, status: put.status });
        continue;
      }
      out.push({ type: a.type, name: a.name, url: t.path, path: t.path, bucket: sign.bucket });
    } catch (err) {
      log.warn('Artifact upload errored', { name: a.name, error: (err as Error).message });
    }
  }
  return out;
}
