import { Project } from '../types/kanban';
import { INITIAL_PROJECTS } from './initialData';

const STORAGE_KEY = 'simplete_projects_v1';
const ACTIVE_PROJECT_KEY = 'simplete_active_project_id';
const LEGACY_STORAGE_KEY = 'taskorbit_projects_v1';
const LEGACY_ACTIVE_PROJECT_KEY = 'taskorbit_active_project_id';

/** Read a key, copying any leftover TaskOrbit value into the Simplete key. */
export function readMigratedLocalStorage(key: string, legacyKey: string): string | null {
  try {
    const current = localStorage.getItem(key);
    if (current !== null) return current;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
      return legacy;
    }
  } catch {
    /* ignore quota / private mode */
  }
  return null;
}

export const storageService = {
  loadProjects(): Project[] {
    try {
      const data = readMigratedLocalStorage(STORAGE_KEY, LEGACY_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load projects from localStorage:', e);
    }
    this.saveProjects(INITIAL_PROJECTS);
    return INITIAL_PROJECTS;
  },

  saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  },

  loadActiveProjectId(projects: Project[]): string {
    const saved = readMigratedLocalStorage(ACTIVE_PROJECT_KEY, LEGACY_ACTIVE_PROJECT_KEY);
    if (saved && projects.some(p => p.id === saved)) {
      return saved;
    }
    return projects[0]?.id || '';
  },

  saveActiveProjectId(id: string): void {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  },

  exportProjectsJson(projects: Project[]): string {
    return JSON.stringify(projects, null, 2);
  },

  importProjectsJson(jsonString: string): Project[] {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].id || !parsed[0].columns) {
      throw new Error('Invalid project structure. Please check JSON format.');
    }
    this.saveProjects(parsed);
    return parsed;
  },

  resetToDefault(): Project[] {
    this.saveProjects(INITIAL_PROJECTS);
    return INITIAL_PROJECTS;
  }
};
