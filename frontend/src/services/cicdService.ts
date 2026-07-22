import { cicdRepository } from '../repositories/cicdRepository';
import type { CicdIngestPayload, CicdPipelineSecret, CicdProvider } from '../types/domain';

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `tm_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export const cicdService = {
  listByProject(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return cicdRepository.listByProject(projectId);
  },
  create(input: { projectId: string; testPlanId: string; name: string; provider: CicdProvider }): Promise<CicdPipelineSecret> {
    if (!input.projectId || !input.testPlanId) throw new Error('Project dan test plan wajib dipilih');
    if (!input.name.trim()) throw new Error('Nama pipeline tidak boleh kosong');
    return cicdRepository.create({ ...input, name: input.name.trim(), token: createToken() });
  },
  rotateToken(id: string) {
    if (!id) throw new Error('Pipeline tidak valid');
    return cicdRepository.rotateToken(id, createToken());
  },
  setActive(id: string, active: boolean) {
    return cicdRepository.setActive(id, active);
  },
  ingest(token: string, payload: CicdIngestPayload) {
    if (!token.trim()) throw new Error('Pipeline token wajib diisi');
    if (!payload.results?.length) throw new Error('Minimal satu hasil test wajib dikirim');
    return cicdRepository.ingest(token.trim(), payload);
  },
};
