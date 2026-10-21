import { draftObject, draftString } from '../../../../core/drafts/draft-values';
import { CocktailSummaryFolder } from '../../data-access/cocktail.models';
export interface OrganizationDraft {
  folderIds: string[];
  folders: CocktailSummaryFolder[];
  tagNames: string[];
  newFolderName: string;
  newTagName: string;
}
export function isOrganizationDraft(value: unknown): value is OrganizationDraft {
  return (
    draftObject(value) &&
    Array.isArray(value['folderIds']) &&
    value['folderIds'].length <= 1000 &&
    value['folderIds'].every(draftString) &&
    Array.isArray(value['folders']) &&
    value['folders'].length <= 1000 &&
    value['folders'].every(
      (f) => draftObject(f) && draftString(f['id']) && draftString(f['name']),
    ) &&
    Array.isArray(value['tagNames']) &&
    value['tagNames'].length <= 20 &&
    value['tagNames'].every(draftString) &&
    draftString(value['newFolderName']) &&
    draftString(value['newTagName'])
  );
}
