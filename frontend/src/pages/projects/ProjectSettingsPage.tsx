import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputSwitch } from 'primereact/inputswitch';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { profileService } from '../../services/profileService';
import { projectMemberService } from '../../services/projectMemberService';
import { environmentService } from '../../services/environmentService';
import { testRoleService } from '../../services/testRoleService';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useProjectRepositories } from '../../hooks/useProjectRepositories';
import type { Project, Module, Tag as TagEntity, TestRole, Profile, ProjectMemberWithProfile, ProjectMemberRole, ProjectVisibility, Environment, ProjectRepository, ProjectRepositorySourceType } from '../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL } from '../../helpers/statusLabels';
import { Tag } from 'primereact/tag';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { formatDateTime } from '../../helpers/dateFormatter';

const MEMBER_ROLE_OPTIONS: { label: string; value: ProjectMemberRole }[] = [
  { label: PROJECT_MEMBER_ROLE_LABEL.member, value: 'member' },
  { label: PROJECT_MEMBER_ROLE_LABEL.supervisor, value: 'supervisor' },
  { label: PROJECT_MEMBER_ROLE_LABEL.tester, value: 'tester' },
  { label: PROJECT_MEMBER_ROLE_LABEL.manager, value: 'manager' },
];

const VISIBILITY_OPTIONS: { label: string; value: ProjectVisibility }[] = [
  { label: 'Private — anggota saja', value: 'private' },
  { label: 'Unlisted — siapa pun yang punya akses', value: 'unlisted' },
  { label: 'Public — dapat dilihat publik', value: 'public' },
];

const REPOSITORY_SOURCE_OPTIONS: { label: string; value: ProjectRepositorySourceType }[] = [
  { label: 'Local path', value: 'local_path' },
  { label: 'GitHub public', value: 'github_public' },
  { label: 'GitHub private', value: 'github_private' },
  { label: 'Git URL', value: 'git_url' },
];

const REPOSITORY_SOURCE_LABEL: Record<ProjectRepositorySourceType, string> = Object.fromEntries(
  REPOSITORY_SOURCE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ProjectRepositorySourceType, string>;

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { loading: roleLoading, canManageSettings, canArchiveProject, canDeleteProject } = useProjectRole(id);
  const { environments, loading: environmentsLoading, reload: reloadEnvironments } = useEnvironments(id ?? null);
  const {
    repositories,
    loading: repositoriesLoading,
    create: createRepository,
    update: updateRepository,
    remove: removeRepository,
    testConnection: testRepositoryConnection,
    testingRepositoryId,
    saveGenericToken,
  } = useProjectRepositories(id);

  const [project, setProject] = useState<Project | null>(null);
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectError, setEditProjectError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [testRoles, setTestRoles] = useState<TestRole[]>([]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Repositories ---
  const [repositoryDialogOpen, setRepositoryDialogOpen] = useState(false);
  const [editingRepositoryId, setEditingRepositoryId] = useState<string | null>(null);
  const [repositoryName, setRepositoryName] = useState('');
  const [repositorySourceType, setRepositorySourceType] = useState<ProjectRepositorySourceType>('github_public');
  const [repositoryLocation, setRepositoryLocation] = useState('');
  const [repositoryDefaultBranch, setRepositoryDefaultBranch] = useState('');
  const [repositorySubdirectory, setRepositorySubdirectory] = useState('');
  const [repositoryIsActive, setRepositoryIsActive] = useState(true);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [repositoryGenericToken, setRepositoryGenericToken] = useState('');

  function openCreateRepositoryDialog() {
    setEditingRepositoryId(null);
    setRepositoryName('');
    setRepositorySourceType('github_public');
    setRepositoryLocation('');
    setRepositoryDefaultBranch('');
    setRepositorySubdirectory('');
    setRepositoryIsActive(true);
    setRepositoryError(null);
    setRepositoryGenericToken('');
    setRepositoryDialogOpen(true);
  }

  function openEditRepositoryDialog(repository: ProjectRepository) {
    setEditingRepositoryId(repository.id);
    setRepositoryName(repository.name);
    setRepositorySourceType(repository.sourceType);
    setRepositoryLocation(repository.urlOrPath);
    setRepositoryDefaultBranch(repository.defaultBranch ?? '');
    setRepositorySubdirectory(repository.subdirectory ?? '');
    setRepositoryIsActive(repository.isActive);
    setRepositoryError(null);
    setRepositoryGenericToken('');
    setRepositoryDialogOpen(true);
  }

  async function handleSaveRepository() {
    setRepositoryError(null);
    const input = {
      name: repositoryName,
      sourceType: repositorySourceType,
      urlOrPath: repositoryLocation,
      defaultBranch: repositoryDefaultBranch || null,
      subdirectory: repositorySubdirectory || null,
      isActive: repositoryIsActive,
    };

    try {
      const repository = editingRepositoryId
        ? await updateRepository(editingRepositoryId, input)
        : await createRepository(input);
      if (repositorySourceType === 'git_url' && repositoryGenericToken.trim()) {
        await saveGenericToken(repository, repositoryGenericToken);
      }
      setRepositoryDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: editingRepositoryId ? 'Repository diperbarui' : 'Repository ditambahkan' });
    } catch (error) {
      setRepositoryError(error instanceof Error ? error.message : 'Gagal menyimpan repository');
    }
  }

  function handleDeleteRepository(repository: ProjectRepository) {
    confirmDialog({
      header: 'Hapus Repository',
      message: `Repository "${repository.name}" akan dilepas dari project. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await removeRepository(repository.id);
          toast.current?.show({ severity: 'success', summary: 'Repository dihapus' });
        } catch (error) {
          toast.current?.show({ severity: 'error', summary: 'Gagal menghapus repository', detail: error instanceof Error ? error.message : undefined });
        }
      },
    });
  }

  async function handleTestRepositoryConnection(repository: ProjectRepository) {
    try {
      const result = await testRepositoryConnection(repository);
      toast.current?.show({
        severity: result.warning ? 'warn' : 'success',
        summary: result.warning ? 'Koneksi berhasil dengan peringatan' : 'Koneksi berhasil',
        detail: `${result.name} · branch ${result.defaultBranch ?? '-'} · permission: ${result.permissions.join(', ') || 'tidak terdeteksi'}${result.warning ? `. ${result.warning}` : ''}`,
        life: result.warning ? 10000 : 5000,
      });
    } catch (error) {
      toast.current?.show({ severity: 'error', summary: 'Test connection gagal', detail: error instanceof Error ? error.message : undefined });
    }
  }

  async function loadAll(showLoading = true) {
    if (!id) return;
    if (showLoading) setLoading(true);
    const [projectResult, modulesResult, tagsResult, testRolesResult, membersResult, usersResult] = await Promise.all([
      projectService.getById(id),
      moduleService.listByProject(id),
      tagService.listByProject(id),
      testRoleService.listByProject(id),
      projectMemberService.listByProject(id),
      profileService.listAll(),
    ]);
    setProject(projectResult);
    if (projectResult) setVisibility(projectResult.visibility);
    setModules(modulesResult);
    setTags(tagsResult);
    setTestRoles(testRolesResult);
    setMembers(membersResult);
    setApprovedUsers(usersResult.filter((p: Profile) => p.role === 'user' || p.role === 'admin'));
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openEditProjectDialog() {
    if (!project) return;
    setEditProjectName(project.name);
    setEditProjectDescription(project.description ?? '');
    setEditProjectError(null);
    setEditProjectDialogOpen(true);
  }

  async function handleSaveProjectProfile() {
    if (!project) return;
    setEditProjectError(null);
    try {
      const updated = await projectService.update(project.id, { name: editProjectName, description: editProjectDescription, visibility: project.visibility });
      setProject(updated);
      setEditProjectDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: 'Project diperbarui' });
    } catch (error) {
      setEditProjectError(error instanceof Error ? error.message : 'Gagal memperbarui project');
    }
  }

  // --- Module dialog ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const moduleNameRef = useRef<HTMLInputElement>(null);

  const [moduleSearch, setModuleSearch] = useState('');
  const [moduleSortField, setModuleSortField] = useState('code');
  const [moduleSortOrder, setModuleSortOrder] = useState<1 | -1>(1);
  const [selectedModules, setSelectedModules] = useState<Module[]>([]);

  const filteredModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q));
  }, [modules, moduleSearch]);

  const [testRoleSearch, setTestRoleSearch] = useState('');
  const [selectedTestRoles, setSelectedTestRoles] = useState<TestRole[]>([]);
  const [testRoleDialogOpen, setTestRoleDialogOpen] = useState(false);
  const [editingTestRoleId, setEditingTestRoleId] = useState<string | null>(null);
  const [testRoleName, setTestRoleName] = useState('');
  const [testRoleError, setTestRoleError] = useState<string | null>(null);
  const filteredTestRoles = useMemo(() => {
    const query = testRoleSearch.trim().toLowerCase();
    return query ? testRoles.filter((role) => role.name.toLowerCase().includes(query)) : testRoles;
  }, [testRoleSearch, testRoles]);

  function openCreateTestRoleDialog() {
    setEditingTestRoleId(null);
    setTestRoleName('');
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  function openEditTestRoleDialog(role: TestRole) {
    setEditingTestRoleId(role.id);
    setTestRoleName(role.name);
    setTestRoleError(null);
    setTestRoleDialogOpen(true);
  }

  async function handleSaveTestRole() {
    if (!id) return;
    try {
      setTestRoleError(null);
      if (editingTestRoleId) await testRoleService.update(editingTestRoleId, { name: testRoleName });
      else await testRoleService.create({ projectId: id, name: testRoleName });
      setTestRoleDialogOpen(false);
      setTestRoles(await testRoleService.listByProject(id));
      toast.current?.show({ severity: 'success', summary: editingTestRoleId ? 'Test role diperbarui' : 'Test role dibuat' });
    } catch (error) {
      setTestRoleError(error instanceof Error ? error.message : 'Gagal menyimpan test role');
    }
  }

  function handleDeleteTestRole(role: TestRole) {
    confirmDialog({
      header: 'Hapus Test Role',
      message: `Test role "${role.name}" akan dihapus. Test case yang menggunakannya menjadi tanpa target role. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        if (!id) return;
        await testRoleService.remove(role.id);
        setTestRoles(await testRoleService.listByProject(id));
      },
    });
  }

  function handleBulkDeleteTestRoles() {
    if (!selectedTestRoles.length) return;
    confirmDialog({
      header: 'Hapus Test Role Terpilih',
      message: `${selectedTestRoles.length} test role akan dihapus. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        if (!id) return;
        await Promise.all(selectedTestRoles.map((role) => testRoleService.remove(role.id)));
        setSelectedTestRoles([]);
        setTestRoles(await testRoleService.listByProject(id));
      },
    });
  }

  function openCreateModuleDialog() {
    setEditingModuleId(null);
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  function openEditModuleDialog(row: Module) {
    setEditingModuleId(row.id);
    setModuleCode(row.code);
    setModuleName(row.name);
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!id) return;
    setModuleError(null);
    try {
      if (editingModuleId) {
        await moduleService.update(editingModuleId, { name: moduleName, code: moduleCode });
      } else {
        await moduleService.create({ projectId: id, name: moduleName, code: moduleCode });
      }
      setModuleDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingModuleId ? 'Module diperbarui' : 'Module dibuat' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Gagal menyimpan module');
    }
  }

  function handleDeleteModule(row: Module) {
    confirmDialog({
      header: 'Hapus Module',
      message: `Module "${row.name}" akan dihapus. Test case yang memakai module ini akan menjadi tanpa module. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await moduleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module dihapus' });
      },
    });
  }

  function handleBulkDeleteModules() {
    confirmDialog({
      header: 'Hapus Module Terpilih',
      message: `${selectedModules.length} module akan dihapus. Test case yang memakai module ini akan menjadi tanpa module. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedModules.map((m) => moduleService.remove(m.id)));
        setSelectedModules([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module terpilih dihapus' });
      },
    });
  }

  // --- Tag dialog ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);
  const tagNameRef = useRef<HTMLInputElement>(null);

  const [tagSearch, setTagSearch] = useState('');
  const [tagSortField, setTagSortField] = useState('name');
  const [tagSortOrder, setTagSortOrder] = useState<1 | -1>(1);
  const [selectedTags, setSelectedTags] = useState<TagEntity[]>([]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, tagSearch]);

  function openCreateTagDialog() {
    setEditingTagId(null);
    setTagName('');
    setTagError(null);
    setTagDialogOpen(true);
  }

  function openEditTagDialog(row: TagEntity) {
    setEditingTagId(row.id);
    setTagName(row.name);
    setTagError(null);
    setTagDialogOpen(true);
  }

  async function handleSaveTag() {
    if (!id) return;
    setTagError(null);
    try {
      if (editingTagId) {
        await tagService.rename(editingTagId, tagName);
      } else {
        await tagService.create(id, tagName);
      }
      setTagDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingTagId ? 'Tag diperbarui' : 'Tag dibuat' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Gagal menyimpan tag');
    }
  }

  function handleDeleteTag(row: TagEntity) {
    confirmDialog({
      header: 'Hapus Tag',
      message: `Tag "${row.name}" akan dihapus dan dilepas dari seluruh test case yang memakainya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await tagService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag dihapus' });
      },
    });
  }

  function handleBulkDeleteTags() {
    confirmDialog({
      header: 'Hapus Tag Terpilih',
      message: `${selectedTags.length} tag akan dihapus dan dilepas dari seluruh test case yang memakainya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedTags.map((t) => tagService.remove(t.id)));
        setSelectedTags([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag terpilih dihapus' });
      },
    });
  }

  // --- Environments ---
  const [environmentDialogOpen, setEnvironmentDialogOpen] = useState(false);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  const [environmentName, setEnvironmentName] = useState('');
  const [environmentBaseUrl, setEnvironmentBaseUrl] = useState('');
  const [environmentError, setEnvironmentError] = useState<string | null>(null);

  function openCreateEnvironmentDialog() {
    setEditingEnvironmentId(null);
    setEnvironmentName('');
    setEnvironmentBaseUrl('');
    setEnvironmentError(null);
    setEnvironmentDialogOpen(true);
  }

  function openEditEnvironmentDialog(row: Environment) {
    setEditingEnvironmentId(row.id);
    setEnvironmentName(row.name);
    setEnvironmentBaseUrl(row.baseUrl ?? '');
    setEnvironmentError(null);
    setEnvironmentDialogOpen(true);
  }

  async function handleSaveEnvironment() {
    if (!id) return;
    setEnvironmentError(null);
    try {
      if (editingEnvironmentId) await environmentService.update(editingEnvironmentId, { name: environmentName, baseUrl: environmentBaseUrl });
      else await environmentService.create({ projectId: id, name: environmentName, baseUrl: environmentBaseUrl });
      setEnvironmentDialogOpen(false);
      await reloadEnvironments();
      toast.current?.show({ severity: 'success', summary: editingEnvironmentId ? 'Environment diperbarui' : 'Environment dibuat' });
    } catch (err) {
      setEnvironmentError(err instanceof Error ? err.message : 'Gagal menyimpan environment');
    }
  }

  function handleDeleteEnvironment(row: Environment) {
    confirmDialog({
      header: 'Hapus Environment',
      message: `Environment "${row.name}" akan dihapus. Histori test run tetap tersimpan, tetapi tidak lagi memiliki referensi environment. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle', acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptClassName: 'p-button-danger',
      accept: async () => {
        await environmentService.remove(row.id);
        await reloadEnvironments();
        toast.current?.show({ severity: 'success', summary: 'Environment dihapus' });
      },
    });
  }

  // --- Members ---
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberUserId, setMemberUserId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<ProjectMemberRole>('member');
  const [memberError, setMemberError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<ProjectMemberWithProfile[]>([]);

  const availableUserOptions = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.userId));
    return approvedUsers
      .filter((u) => !memberIds.has(u.id))
      .map((u) => ({ label: u.fullName ?? u.email, value: u.id }));
  }, [approvedUsers, members]);

  function openAddMemberDialog() {
    setMemberUserId(null);
    setMemberRole('member');
    setMemberError(null);
    setMemberDialogOpen(true);
  }

  async function handleAddMember() {
    if (!id) return;
    setMemberError(null);
    if (!memberUserId) {
      setMemberError('Pilih user terlebih dahulu');
      return;
    }
    try {
      await projectMemberService.add(id, memberUserId, memberRole);
      setMemberDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: 'Anggota ditambahkan' });
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Gagal menambahkan anggota');
    }
  }

  async function handleSaveVisibility() {
    if (!project) return;
    try {
      const updated = await projectService.update(project.id, {
        name: project.name,
        description: project.description ?? '',
        visibility,
      });
      setProject(updated);
      toast.current?.show({ severity: 'success', summary: 'Visibilitas project diperbarui' });
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal memperbarui visibilitas', detail: err instanceof Error ? err.message : undefined });
    }
  }

  async function handleChangeMemberRole(row: ProjectMemberWithProfile, role: ProjectMemberRole) {
    await projectMemberService.changeRole(row.id, role);
    setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, role } : m)));
  }

  function handleRemoveMember(row: ProjectMemberWithProfile) {
    confirmDialog({
      header: 'Hapus Anggota',
      message: `"${row.profile.fullName ?? row.profile.email}" akan dihapus dari project ini dan kehilangan akses. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectMemberService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Anggota dihapus' });
      },
    });
  }

  function handleBulkRemoveMembers() {
    confirmDialog({
      header: 'Hapus Anggota Terpilih',
      message: `${selectedMembers.length} anggota akan dihapus dari project ini. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedMembers.map((m) => projectMemberService.remove(m.id)));
        setSelectedMembers([]);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Anggota terpilih dihapus' });
      },
    });
  }

  function handleArchiveProject() {
    if (!project) return;
    confirmDialog({
      header: 'Arsipkan Project',
      message: `Project "${project.name}" akan diarsipkan. Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: 'Arsipkan',
      rejectLabel: 'Batal',
      accept: async () => {
        await projectService.archive(project.id);
        setProject({ ...project, status: 'archived' });
        toast.current?.show({ severity: 'success', summary: 'Project diarsipkan' });
      },
    });
  }

  function handleDeletePermanently() {
    if (!project) return;
    confirmDialog({
      header: 'Hapus Permanen',
      message: (
        <span>
          Project <strong>"{project.name}"</strong> beserta seluruh test plan dan test case di dalamnya akan{' '}
          <strong>dihapus permanen dan tidak bisa dikembalikan</strong>. Lanjutkan?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus Permanen',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(project.id);
        toast.current?.show({ severity: 'success', summary: 'Project dihapus permanen' });
        navigate('/');
      },
    });
  }

  if (loading || roleLoading) return <p>Memuat...</p>;
  if (!canManageSettings) return <Navigate to={`/projects/${id}`} replace />;
  if (!project) return <p>Project tidak ditemukan.</p>;

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: project.name, path: `/projects/${id}` },
          { label: 'Pengaturan' },
        ]}
      />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between gap-2">
          <div className="flex align-items-start gap-2 min-w-0">
            <Button icon="pi pi-arrow-left" text rounded severity="secondary" aria-label="Kembali" onClick={() => navigate(`/projects/${id}`)} />
            <div className="min-w-0">
              <h2 className="m-0 text-overflow-ellipsis overflow-hidden white-space-nowrap">Pengaturan — {project.name}</h2>
              {project.description && <p className="m-0 mt-1 text-color-secondary text-sm">{project.description}</p>}
            </div>
          </div>
          <div className="flex align-items-center gap-2 flex-shrink-0">
            <Button icon="pi pi-pencil" text rounded severity="secondary" aria-label="Edit project" onClick={openEditProjectDialog} />
            <Button label="Integrasi" icon="pi pi-share-alt" size="small" outlined onClick={() => navigate(`/projects/${id}/integrations`)} />
            <Button label="Backup & Retensi" icon="pi pi-database" size="small" outlined onClick={() => navigate(`/projects/${id}/data-management`)} />
          </div>
        </div>
      </Card>

      <Card>
        <TabView>
          <TabPanel header="Akses & Visibilitas">
            <div className="flex flex-column gap-2" style={{ maxWidth: '34rem' }}>
              <label htmlFor="project-visibility" className="font-medium">Visibilitas project</label>
              <small className="text-color-secondary">
                Atur apakah project hanya untuk anggota, tidak terdaftar tetapi bisa dibuka lewat akses, atau dapat dilihat publik.
              </small>
              <div className="flex gap-2 align-items-center mt-2">
                <Dropdown
                  inputId="project-visibility"
                  value={visibility}
                  options={VISIBILITY_OPTIONS}
                  onChange={(e) => setVisibility(e.value)}
                  className="flex-1"
                />
                <Button label="Simpan" icon="pi pi-save" onClick={handleSaveVisibility} />
              </div>
            </div>
          </TabPanel>
          <TabPanel header="Modules">
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} placeholder="Cari nama/kode..." />
              </IconField>
              <Button label="Module Baru" icon="pi pi-plus" size="small" onClick={openCreateModuleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedModules.length}
              onClear={() => setSelectedModules([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteModules} />}
            />
            <DataTable
              value={filteredModules}
              size="small"
              emptyMessage="Belum ada module"
              paginator
              rows={10}
              sortField={moduleSortField}
              sortOrder={moduleSortOrder}
              onSort={(e) => {
                setModuleSortField(e.sortField);
                setModuleSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedModules}
              onSelectionChange={(e) => setSelectedModules(e.value as Module[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: Module) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditModuleDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteModule(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Tags">
            <p className="text-color-secondary text-sm mb-3">
              Tag juga otomatis dibuat saat diketik di form Test Case. Kelola tag di sini.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Cari nama..." />
              </IconField>
              <Button label="Tag Baru" icon="pi pi-plus" size="small" onClick={openCreateTagDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTags.length}
              onClear={() => setSelectedTags([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTags} />}
            />
            <DataTable
              value={filteredTags}
              size="small"
              emptyMessage="Belum ada tag"
              paginator
              rows={10}
              sortField={tagSortField}
              sortOrder={tagSortOrder}
              onSort={(e) => {
                setTagSortField(e.sortField);
                setTagSortOrder((e.sortOrder ?? 1) as 1 | -1);
              }}
              selection={selectedTags}
              onSelectionChange={(e) => setSelectedTags(e.value as TagEntity[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: TagEntity) => (
                  <RowActionsMenu
                    items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTagDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTag(row) },
                    ]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Test Roles">
            <p className="text-color-secondary text-sm mb-3">
              Role di dalam aplikasi yang diuji, misalnya Admin, Manager, atau Member. Ini berbeda dari peran anggota project.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={testRoleSearch} onChange={(event) => setTestRoleSearch(event.target.value)} placeholder="Cari nama role..." />
              </IconField>
              <Button label="Test Role Baru" icon="pi pi-plus" size="small" onClick={openCreateTestRoleDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedTestRoles.length}
              onClear={() => setSelectedTestRoles([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkDeleteTestRoles} />}
            />
            <DataTable value={filteredTestRoles} emptyMessage="Belum ada test role" paginator rows={10} selection={selectedTestRoles} onSelectionChange={(event) => setSelectedTestRoles(event.value as TestRole[])} dataKey="id" selectionMode="checkbox" size="small">
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column field="name" header="Nama" sortable />
              <Column header="" style={{ width: '3.5rem' }} body={(row: TestRole) => <RowActionsMenu items={[{ label: 'Edit', icon: 'pi pi-pencil', command: () => openEditTestRoleDialog(row) }, { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteTestRole(row) }]} />} />
            </DataTable>
          </TabPanel>

          <TabPanel header="Environment">
            <div className="flex justify-content-between align-items-center mb-2">
              <span className="text-color-secondary text-sm">Environment yang tersedia saat memulai test run.</span>
              <Button label="Environment Baru" icon="pi pi-plus" size="small" onClick={openCreateEnvironmentDialog} />
            </div>
            <DataTable value={environments} loading={environmentsLoading} emptyMessage="Belum ada environment" size="small">
              <Column field="name" header="Nama" />
              <Column field="baseUrl" header="Base URL" body={(row: Environment) => row.baseUrl ?? '-'} />
              <Column header="" style={{ width: '7rem' }} body={(row: Environment) => (
                <div className="flex gap-1">
                  <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" onClick={() => openEditEnvironmentDialog(row)} />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Hapus" onClick={() => handleDeleteEnvironment(row)} />
                </div>
              )} />
            </DataTable>
          </TabPanel>

          <TabPanel header="Repository">
            <div className="flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
              <div>
                <div className="font-medium">Repository source code</div>
                <div className="text-color-secondary text-sm mt-1">
                  Token disimpan di Vault dan nilainya tidak dapat dibaca ulang dari browser.
                </div>
              </div>
              <Button label="Tambah Repository" icon="pi pi-plus" size="small" onClick={openCreateRepositoryDialog} />
            </div>
            <DataTable value={repositories} loading={repositoriesLoading} emptyMessage="Belum ada repository" size="small" paginator rows={10}>
              <Column field="name" header="Nama" sortable />
              <Column header="Sumber" body={(row: ProjectRepository) => REPOSITORY_SOURCE_LABEL[row.sourceType]} />
              <Column field="urlOrPath" header="URL / Path" />
              <Column header="Branch" body={(row: ProjectRepository) => row.defaultBranch ?? '-'} />
              <Column
                header="Kredensial"
                body={(row: ProjectRepository) => row.credentialId ? (
                  <div className="flex flex-column gap-1">
                    <span className="font-monospace">{row.credentialMask ?? '••••••'}</span>
                    <small className="text-color-secondary">Dibuat: {row.credentialCreatedAt ? formatDateTime(row.credentialCreatedAt) : '-'}</small>
                    <small className="text-color-secondary">Kedaluwarsa: {row.credentialExpiresAt ? formatDateTime(row.credentialExpiresAt) : '-'}</small>
                  </div>
                ) : <span className="text-color-secondary">Tanpa token</span>}
              />
              <Column header="Status" body={(row: ProjectRepository) => <Tag value={row.isActive ? 'Aktif' : 'Nonaktif'} severity={row.isActive ? 'success' : 'secondary'} />} />
              <Column
                header=""
                style={{ width: '12rem' }}
                body={(row: ProjectRepository) => (
                  <div className="flex gap-1 justify-content-end">
                    <Button label="Test" icon="pi pi-bolt" text size="small" loading={testingRepositoryId === row.id} disabled={row.sourceType === 'local_path'} onClick={() => void handleTestRepositoryConnection(row)} />
                    <RowActionsMenu items={[
                      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditRepositoryDialog(row) },
                      { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDeleteRepository(row) },
                    ]} />
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Anggota Project">
            <p className="text-color-secondary text-sm mb-3">
              Hanya user yang terdaftar di sini (atau admin) yang bisa mengakses project ini. Manager bisa mengelola anggota lain.
            </p>
            <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
              <span />
              <Button label="Tambah Anggota" icon="pi pi-plus" size="small" onClick={openAddMemberDialog} />
            </div>
            <BulkActionsBar
              selectedCount={selectedMembers.length}
              onClear={() => setSelectedMembers([])}
              actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleBulkRemoveMembers} />}
            />
            <DataTable
              value={members}
              size="small"
              emptyMessage="Belum ada anggota"
              paginator
              rows={10}
              selection={selectedMembers}
              onSelectionChange={(e) => setSelectedMembers(e.value as ProjectMemberWithProfile[])}
              dataKey="id"
              selectionMode="checkbox"
            >
              <Column selectionMode="multiple" style={{ width: '3rem' }} />
              <Column header="Nama" body={(row: ProjectMemberWithProfile) => row.profile.fullName ?? '-'} />
              <Column header="Email" body={(row: ProjectMemberWithProfile) => row.profile.email} />
              <Column
                header="Status"
                body={(row: ProjectMemberWithProfile) => (
                  <Tag
                    value={row.status === 'accepted' ? 'Aktif' : row.status === 'invited' ? 'Menunggu' : 'Ditolak'}
                    severity={row.status === 'accepted' ? 'success' : row.status === 'invited' ? 'warning' : 'danger'}
                  />
                )}
              />
              <Column
                header="Peran"
                body={(row: ProjectMemberWithProfile) => (
                  <Dropdown
                    value={row.role}
                    options={MEMBER_ROLE_OPTIONS}
                    onChange={(e) => handleChangeMemberRole(row, e.value)}
                    className="w-10rem"
                  />
                )}
              />
              <Column
                header=""
                style={{ width: '3.5rem' }}
                body={(row: ProjectMemberWithProfile) => (
                  <RowActionsMenu
                    items={[{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleRemoveMember(row) }]}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          {(canArchiveProject || canDeleteProject) && (
            <TabPanel header="Danger Zone">
              <div className="flex flex-column gap-3" style={{ maxWidth: '32rem' }}>
                {canArchiveProject && project.status !== 'archived' && (
                  <div className="flex align-items-center justify-content-between gap-3 p-3 border-1 border-round surface-border">
                    <div>
                      <div className="font-medium">Arsipkan Project</div>
                      <div className="text-color-secondary text-sm">
                        Project ini status: <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />.
                        Project yang diarsipkan tidak muncul di daftar aktif.
                      </div>
                    </div>
                    <Button label="Arsipkan" icon="pi pi-inbox" severity="warning" outlined onClick={handleArchiveProject} />
                  </div>
                )}
                {canDeleteProject && (
                  <div className="flex align-items-center justify-content-between gap-3 p-3 border-1 border-round surface-border">
                    <div>
                      <div className="font-medium">Hapus Permanen</div>
                      <div className="text-color-secondary text-sm">
                        Menghapus project beserta seluruh test plan dan test case. Tindakan ini tidak bisa dibatalkan.
                      </div>
                    </div>
                    <Button label="Hapus Permanen" icon="pi pi-trash" severity="danger" outlined onClick={handleDeletePermanently} />
                  </div>
                )}
              </div>
            </TabPanel>
          )}
        </TabView>
      </Card>

      {/* --- Module Dialog --- */}
      <Dialog
        header={editingModuleId ? 'Edit Module' : 'Module Baru'}
        visible={moduleDialogOpen}
        onHide={() => setModuleDialogOpen(false)}
        onShow={() => moduleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {moduleError && <small className="p-error">{moduleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="module-code">Kode</label>
            <InputText id="module-code" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="Otomatis jika dikosongkan" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="module-name">Nama Module</label>
            <InputText
              id="module-name"
              ref={moduleNameRef}
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveModule();
              }}
              placeholder="mis. Autentikasi, Dashboard, Pembelian"
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveModule} />
        </div>
      </Dialog>

      <Dialog
        header={editingEnvironmentId ? 'Edit Environment' : 'Environment Baru'}
        visible={environmentDialogOpen}
        onHide={() => setEnvironmentDialogOpen(false)}
        style={{ width: '28rem' }}
      >
        <div className="flex flex-column gap-3">
          {environmentError && <small className="p-error">{environmentError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="environment-name">Nama Environment</label>
            <InputText id="environment-name" value={environmentName} onChange={(e) => setEnvironmentName(e.target.value)} placeholder="Development, Staging, UAT, Production" autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="environment-base-url">Base URL (opsional)</label>
            <InputText id="environment-base-url" value={environmentBaseUrl} onChange={(e) => setEnvironmentBaseUrl(e.target.value)} placeholder="https://staging.example.com" />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveEnvironment} />
        </div>
      </Dialog>

      <Dialog
        header={editingRepositoryId ? 'Edit Repository' : 'Tambah Repository'}
        visible={repositoryDialogOpen}
        onHide={() => setRepositoryDialogOpen(false)}
        style={{ width: '34rem' }}
      >
        <div className="flex flex-column gap-3">
          {repositoryError && <small className="p-error">{repositoryError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="repository-name">Nama</label>
            <InputText id="repository-name" value={repositoryName} onChange={(event) => setRepositoryName(event.target.value)} autoFocus placeholder="Frontend, Backend, E2E" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="repository-source">Tipe sumber</label>
            <Dropdown inputId="repository-source" value={repositorySourceType} options={REPOSITORY_SOURCE_OPTIONS} onChange={(event) => setRepositorySourceType(event.value)} className="w-full" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="repository-location">{repositorySourceType === 'local_path' ? 'Path absolut' : 'URL repository'}</label>
            <InputText id="repository-location" value={repositoryLocation} onChange={(event) => setRepositoryLocation(event.target.value)} placeholder={repositorySourceType === 'local_path' ? '/home/tester/app' : repositorySourceType === 'git_url' ? 'https://git.example.com/group/repository.git' : 'https://github.com/org/repository'} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="repository-branch">Default branch (opsional)</label>
            <InputText id="repository-branch" value={repositoryDefaultBranch} onChange={(event) => setRepositoryDefaultBranch(event.target.value)} placeholder="main" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="repository-subdirectory">Subdirectory (opsional)</label>
            <InputText id="repository-subdirectory" value={repositorySubdirectory} onChange={(event) => setRepositorySubdirectory(event.target.value)} placeholder="frontend" />
          </div>
          <div className="flex align-items-center gap-2">
            <InputSwitch inputId="repository-active" checked={repositoryIsActive} onChange={(event) => setRepositoryIsActive(Boolean(event.value))} />
            <label htmlFor="repository-active">Repository aktif</label>
          </div>
          {(repositorySourceType === 'github_private' || repositorySourceType === 'git_url') && (
            <small className="text-color-secondary">
              Kredensial dikelola oleh layanan server dan tidak pernah dikirim kembali ke browser. Gunakan token dengan scope minimum.
            </small>
          )}
          {repositorySourceType === 'git_url' && (
            <div className="flex flex-column gap-1">
              <label htmlFor="repository-generic-token">Token generik (opsional)</label>
              <Password inputId="repository-generic-token" value={repositoryGenericToken} onChange={(event) => setRepositoryGenericToken(event.target.value)} feedback={false} toggleMask inputClassName="w-full" className="w-full" placeholder={editingRepositoryId ? 'Kosongkan untuk mempertahankan token' : 'Access token read-only'} />
              <small className="text-color-secondary">Token dikirim langsung ke layanan Vault dan tidak dapat dibaca ulang.</small>
            </div>
          )}
          <Button label="Simpan" icon="pi pi-save" size="small" onClick={() => void handleSaveRepository()} />
        </div>
      </Dialog>

      {/* --- Tag Dialog --- */}
      <Dialog
        header={editingTagId ? 'Edit Tag' : 'Tag Baru'}
        visible={tagDialogOpen}
        onHide={() => setTagDialogOpen(false)}
        onShow={() => tagNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {tagError && <small className="p-error">{tagError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="tag-name">Nama Tag</label>
            <InputText
              id="tag-name"
              ref={tagNameRef}
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTag();
              }}
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>

      {/* --- Member Dialog --- */}
      <Dialog
        header="Tambah Anggota"
        visible={memberDialogOpen}
        onHide={() => setMemberDialogOpen(false)}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {memberError && <small className="p-error">{memberError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="member-user">User</label>
            <Dropdown
              id="member-user"
              value={memberUserId}
              options={availableUserOptions}
              onChange={(e) => setMemberUserId(e.value)}
              filter
              placeholder="Pilih user"
              className="w-full"
            />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="member-role">Peran</label>
            <Dropdown
              id="member-role"
              value={memberRole}
              options={MEMBER_ROLE_OPTIONS}
              onChange={(e) => setMemberRole(e.value)}
              className="w-full"
            />
          </div>
          <Button label="Tambah" size="small" onClick={handleAddMember} />
        </div>
      </Dialog>

      <Dialog header="Edit Project" visible={editProjectDialogOpen} onHide={() => setEditProjectDialogOpen(false)} style={{ width: '30rem' }} footer={<><Button label="Batal" text onClick={() => setEditProjectDialogOpen(false)} /><Button label="Simpan" onClick={handleSaveProjectProfile} /></>}>
        <div className="flex flex-column gap-3">
          {editProjectError && <small className="p-error">{editProjectError}</small>}
          <div className="flex flex-column gap-1"><label htmlFor="settings-project-name">Nama Project</label><InputText id="settings-project-name" value={editProjectName} onChange={(event) => setEditProjectName(event.target.value)} autoFocus /></div>
          <div className="flex flex-column gap-1"><label htmlFor="settings-project-description">Deskripsi</label><InputTextarea id="settings-project-description" value={editProjectDescription} onChange={(event) => setEditProjectDescription(event.target.value)} rows={4} /></div>
        </div>
      </Dialog>

      <Dialog header={editingTestRoleId ? 'Edit Test Role' : 'Test Role Baru'} visible={testRoleDialogOpen} onHide={() => setTestRoleDialogOpen(false)} style={{ width: '25rem' }}>
        <div className="flex flex-column gap-3">
          {testRoleError && <small className="p-error">{testRoleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="test-role-name">Nama Test Role</label>
            <InputText id="test-role-name" value={testRoleName} onChange={(event) => setTestRoleName(event.target.value)} autoFocus />
          </div>
          <Button label="Simpan" size="small" onClick={() => void handleSaveTestRole()} />
        </div>
      </Dialog>
    </div>
  );
}
