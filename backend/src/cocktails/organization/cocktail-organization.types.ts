export interface CocktailOrganizationFolder {
  id: string;
  name: string;
}

export interface CocktailOrganizationTag {
  id: string;
  name: string;
  slug: string;
}

export interface CocktailOrganizationResult {
  folder: CocktailOrganizationFolder | null;
  folders: CocktailOrganizationFolder[];
  organizationVersion: number;
  tags: CocktailOrganizationTag[];
}
