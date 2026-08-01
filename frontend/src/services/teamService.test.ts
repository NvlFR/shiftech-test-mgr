import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  findAll: vi.fn(),
  findAllWithMembers: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setMembers: vi.fn(),
  findByProject: vi.fn(),
  addToProject: vi.fn(),
  updateProjectAccess: vi.fn(),
  removeFromProject: vi.fn(),
}));

vi.mock('../repositories/teamRepository', () => ({ teamRepository: repository }));

import { teamService } from './teamService';
import { DEFAULT_PROJECT_PERMISSIONS } from './projectMemberService';

describe('teamService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('menormalisasi nama dan deskripsi saat membuat team', async () => {
    repository.create.mockResolvedValue({ id: 'team-1' });
    await teamService.create('  QA Platform  ', '  Tim regression  ');
    expect(repository.create).toHaveBeenCalledWith('QA Platform', 'Tim regression');
  });

  it('menolak nama team kosong sebelum memanggil repository', () => {
    expect(() => teamService.create('   ', '')).toThrow('Nama team wajib diisi');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('menghapus user duplikat sebelum mengganti anggota team', async () => {
    await teamService.setMembers('team-1', ['user-1', 'user-1', 'user-2']);
    expect(repository.setMembers).toHaveBeenCalledWith('team-1', ['user-1', 'user-2']);
  });

  it('memberikan preset permission sesuai role saat menambahkan team ke project', async () => {
    await teamService.addToProject('project-1', 'team-1', 'tester');
    expect(repository.addToProject).toHaveBeenCalledWith(
      'project-1',
      'team-1',
      'tester',
      DEFAULT_PROJECT_PERMISSIONS.tester,
    );
  });

  it('mengganti role dan preset permission akses team project bersama-sama', async () => {
    await teamService.updateProjectAccess('access-1', 'supervisor');
    expect(repository.updateProjectAccess).toHaveBeenCalledWith(
      'access-1',
      'supervisor',
      DEFAULT_PROJECT_PERMISSIONS.supervisor,
    );
  });
});
