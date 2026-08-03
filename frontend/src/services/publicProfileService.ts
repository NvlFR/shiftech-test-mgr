import { publicProfileRepository } from '../repositories/publicProfileRepository';
import type { PublicProfile } from '../types/domain';

export const publicProfileService = {
  async getByUsername(username: string): Promise<PublicProfile | null> {
    if (!username) throw new Error('Username is required');
    return await publicProfileRepository.getByUsername(username);
  }
};
