import { useEffect, useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useThemeContext, type ThemeMode } from '../../hooks/useTheme';
import { useProjects } from '../../hooks/useProjects';

export function SettingsPage() {
  const { preferences, updatePreferences, loading } = useUserPreferences();
  const { setMode } = useThemeContext();
  const { projects } = useProjects({ status: 'active', sortField: 'name', sortDirection: 'asc' });
  const toast = useRef<Toast>(null);

  const [saving, setSaving] = useState(false);
  
  // Local state for the form so we don't spam the DB
  const [theme, setTheme] = useState<ThemeMode>(preferences?.theme ?? 'system');
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences?.notificationsEnabled ?? true);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(preferences?.defaultProjectId ?? null);

  // Sync when preferences load
  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      setNotificationsEnabled(preferences.notificationsEnabled);
      setDefaultProjectId(preferences.defaultProjectId);
    }
  }, [preferences]);

  const themeOptions = [
    { label: 'System Default', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  const projectOptions = [
    { label: '-- None --', value: null },
    ...projects.map(p => ({ label: p.name, value: p.id }))
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({ theme, notificationsEnabled, defaultProjectId });
      setMode(theme);
      toast.current?.show({ severity: 'success', summary: 'Saved', detail: 'Preferences updated successfully' });
    } catch (err: any) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface-ground h-full">
      <Toast ref={toast} />
      <PageHeader title="Settings" />
      <div className="p-fluid max-w-30rem">
        <Card>
          <div className="field mb-4">
            <label htmlFor="theme" className="font-medium block mb-2">Theme</label>
            <Dropdown 
              id="theme" 
              value={theme} 
              options={themeOptions} 
              onChange={(e) => setTheme(e.value)} 
              disabled={loading || saving}
            />
            <small className="text-secondary block mt-1">
              Choose your preferred visual theme.
            </small>
          </div>

          <div className="field mb-4">
            <label htmlFor="defaultProject" className="font-medium block mb-2">Default Project</label>
            <Dropdown 
              id="defaultProject" 
              value={defaultProjectId} 
              options={projectOptions} 
              onChange={(e) => setDefaultProjectId(e.value)} 
              disabled={loading || saving}
              filter
            />
            <small className="text-secondary block mt-1">
              This project will be loaded by default when you log in.
            </small>
          </div>

          <div className="field mb-4 flex align-items-center justify-content-between">
            <div>
              <label htmlFor="notifications" className="font-medium block mb-1">Email Notifications</label>
              <small className="text-secondary block">
                Receive emails for assignments and mentions.
              </small>
            </div>
            <InputSwitch 
              id="notifications" 
              checked={notificationsEnabled} 
              onChange={(e) => setNotificationsEnabled(e.value ?? false)} 
              disabled={loading || saving}
            />
          </div>

          <div className="flex justify-content-end mt-4">
            <Button 
              label="Save Preferences" 
              icon="pi pi-check" 
              onClick={handleSave} 
              loading={saving} 
              disabled={loading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
