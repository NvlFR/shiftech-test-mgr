import { profileRepository } from '../repositories/profileRepository';
import { projectRepository } from '../repositories/projectRepository';
import { testSuiteRepository } from '../repositories/testSuiteRepository';

export const profileService = {
  getOwnProfile(userId: string) {
    return profileRepository.findById(userId);
  },

  getById(id: string) {
    return profileRepository.findById(id);
  },

  async getViewById(id: string) {
    const profile = await profileRepository.findById(id);
    if (!profile) return null;

    const [projects, suites] = await Promise.all([
      projectRepository.findByOwner(id),
      testSuiteRepository.findByOwner(id),
    ]);

    return { profile, projects, suites };
  },

  listAll() {
    return profileRepository.findAll();
  },

  approve(id: string) {
    return profileRepository.updateRole(id, 'user');
  },

  // "Revoke access" is the OAuth-world equivalent of amanah-pos's "reset" action:
  // there is no password to reset (login is Google-only), so instead we pull the user
  // back to 'pending' — access is cut immediately and they must be re-approved.
  revokeAccess(id: string) {
    return profileRepository.updateRole(id, 'pending');
  },

  promoteToAdmin(id: string) {
    return profileRepository.updateRole(id, 'admin');
  },

  demoteToUser(id: string) {
    return profileRepository.updateRole(id, 'user');
  },

  remove(id: string) {
    return profileRepository.softDelete(id);
  },
};
