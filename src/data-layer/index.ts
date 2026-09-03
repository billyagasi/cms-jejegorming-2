import { AppRepository } from './repository';
import { LocalRepository } from './local-repository';
import { ApiRepository } from './api-repository';

/**
 * Factory repository — dipilih via VITE_DATA_SOURCE.
 * - "local" (default Phase 1): localStorage
 * - "api" (Phase 2): Golang Gin REST + SSE
 */

const dataSource = (import.meta.env.VITE_DATA_SOURCE as string) || 'local';
const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080';

let repositoryInstance: AppRepository | null = null;

export function getRepository(): AppRepository {
  if (!repositoryInstance) {
    repositoryInstance = dataSource === 'api' ? new ApiRepository(apiUrl) : new LocalRepository();
  }
  return repositoryInstance;
}

/** Reset & regenerasi data dummy demo (hanya efektif pada LocalRepository). */
export function resetDemoData(): void {
  if (repositoryInstance instanceof LocalRepository) {
    repositoryInstance.resetDemoData();
  }
}

export type { AppRepository };
