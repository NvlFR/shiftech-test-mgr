import { useQuery } from '@tanstack/react-query';
import type { BreadcrumbItem } from '../components/ui/Breadcrumb';
import { profileService } from '../services/profileService';
import { useAuthContext } from './useAuth';
import { queryKeys } from './queryKeys';

/**
 * Builds the source-new project breadcrumb while adapting identity fields to the
 * local Profile contract (fullName/email, without username or public profile routes).
 */
export function useProjectBreadcrumbItems(
  projectName: string | null | undefined,
  ownerId: string | null | undefined,
  projectPath?: string,
): BreadcrumbItem[] {
  const { session } = useAuthContext();
  const isOwnProject = !ownerId || !session?.user?.id || ownerId === session.user.id;
  const { data: ownerProfile } = useQuery({
    queryKey: queryKeys.profile(ownerId ?? ''),
    queryFn: () => profileService.getById(ownerId!),
    enabled: Boolean(ownerId) && !isOwnProject,
  });

  if (!projectName) return [];

  const items: BreadcrumbItem[] = [];
  if (ownerProfile && !isOwnProject) {
    items.push({ label: ownerProfile.fullName ?? ownerProfile.email, path: `/users/${ownerProfile.id}` });
  }
  items.push({ label: projectName, path: projectPath });
  return items;
}
