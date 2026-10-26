export interface RecipeLifecycle {
  id: string;
  slug: string;
  name: string;
  contentVersion: number;
  organizationVersion: number;
  deletedAt: string | null;
  restoreUntil: string | null;
  canRestore: boolean;
}
export interface TrashPage {
  items: RecipeLifecycle[];
  total: number;
  page: number;
  pageSize: number;
}
