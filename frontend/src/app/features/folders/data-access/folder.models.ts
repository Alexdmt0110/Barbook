export interface FolderReference {
  id: string;
  name: string;
}
export interface FolderDetail extends FolderReference {
  version: number;
  cocktailCount: number;
}
export interface FolderPage {
  items: FolderDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface FolderQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}
