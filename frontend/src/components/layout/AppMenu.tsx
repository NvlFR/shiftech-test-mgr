import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { AppMenuitem, AppMenuTreeItem, type MenuItemModel } from './AppMenuitem';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { useProjectPins } from '../../hooks/useProjectPins';
import { projectService } from '../../services/projectService';

const MAX_VISIBLE_PROJECTS = 10;

export function AppMenu({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { isAdmin } = useAuthContext();
  const { projects, reload } = useProjects({ status: 'active', sortField: 'name', sortDirection: 'asc' });
  const { isPinned, togglePin } = useProjectPins();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function openAddDialog() {
    setName('');
    setDescription('');
    setError(null);
    setAddDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    try {
      const created = await projectService.create({ name, description });
      setAddDialogOpen(false);
      await reload();
      onNavigate?.();
      navigate(`/projects/${created.id}`);
      toast.current?.show({ severity: 'success', summary: 'Project dibuat' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan project');
    }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    const pinDiff = Number(isPinned(b.id)) - Number(isPinned(a.id));
    if (pinDiff !== 0) return pinDiff;
    return a.name.localeCompare(b.name);
  });
  const visibleProjects = sortedProjects.slice(0, MAX_VISIBLE_PROJECTS);

  const trailingItems: MenuItemModel[] = [
    { label: 'Test Runs', icon: 'pi pi-play-circle', url: '/test-runs' },
    ...(isAdmin ? [{ label: 'User Management', icon: 'pi pi-users', url: '/users' }] : []),
  ];

  return (
    <>
    <Toast ref={toast} />
    <ul className="layout-menu">
      <AppMenuTreeItem label="Projects" icon="pi pi-folder" onAdd={openAddDialog} addLabel="Project Baru">
        {visibleProjects.map((project) => (
          <li key={project.id} className="layout-submenu-item">
            <NavLink
              to={`/projects/${project.id}`}
              onClick={onNavigate}
              className={({ isActive }) => `layout-menuitem-link layout-submenu-link ${isActive ? 'active-route' : ''}`}
            >
              <span className="layout-menuitem-text" title={project.name}>
                {project.name}
              </span>
            </NavLink>
            <button
              type="button"
              className={`layout-submenu-pin ${isPinned(project.id) ? 'pinned' : ''}`}
              title={isPinned(project.id) ? 'Lepas pin' : 'Pin project'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePin(project.id);
              }}
            >
              <i className={isPinned(project.id) ? 'pi pi-star-fill' : 'pi pi-star'} />
            </button>
          </li>
        ))}
        <li className="layout-submenu-item">
          <NavLink
            to="/"
            end
            onClick={onNavigate}
            className={({ isActive }) => `layout-menuitem-link layout-submenu-link layout-submenu-more ${isActive ? 'active-route' : ''}`}
          >
            <i className="pi pi-ellipsis-h" />
            <span className="layout-menuitem-text">Lihat semua project</span>
          </NavLink>
        </li>
      </AppMenuTreeItem>

      {trailingItems.map((item) => (
        <AppMenuitem key={item.url} item={item} onNavigate={onNavigate} />
      ))}
    </ul>

    <Dialog
      header="Project Baru"
      visible={addDialogOpen}
      onHide={() => setAddDialogOpen(false)}
      onShow={() => nameRef.current?.focus()}
      style={{ width: '30rem' }}
    >
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="add-project-name">Nama</label>
          <InputText
            id="add-project-name"
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="add-project-description">Deskripsi</label>
          <InputTextarea
            id="add-project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button label="Simpan" size="small" onClick={handleSave} />
      </div>
    </Dialog>
    </>
  );
}
