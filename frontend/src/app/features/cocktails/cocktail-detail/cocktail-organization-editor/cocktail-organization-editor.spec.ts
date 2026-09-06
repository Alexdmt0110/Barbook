import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import {
  CocktailOrganizationResult,
  CocktailSummaryFolder,
  CocktailSummaryTag,
  CreateCocktailFolderRequest,
  UpdateCocktailOrganizationRequest,
} from '../../data-access/cocktail.models';
import { CocktailsService } from '../../data-access/cocktails.service';
import { CocktailOrganizationEditor } from './cocktail-organization-editor';

class CocktailsServiceStub {
  readonly createdFolders: CreateCocktailFolderRequest[] = [];

  readonly organizationRequests: {
    slug: string;
    organization: UpdateCocktailOrganizationRequest;
  }[] = [];

  foldersResponse: Observable<CocktailSummaryFolder[]> = of([
    {
      id: 'folder-classics',
      name: 'Classiques',
    },
  ]);

  tagsResponse: Observable<CocktailSummaryTag[]> = of([
    {
      id: 'tag-classic',
      name: 'Classique',
      slug: 'classique',
    },
    {
      id: 'tag-citrus',
      name: 'Agrumes',
      slug: 'agrumes',
    },
  ]);

  createFolderHandler = (folder: CreateCocktailFolderRequest): Observable<CocktailSummaryFolder> =>
    of({
      id: 'folder-new',
      name: folder.name,
    });

  updateOrganizationHandler = (
    organization: UpdateCocktailOrganizationRequest,
  ): Observable<CocktailOrganizationResult> =>
    of({
      folder:
        organization.folderId === null
          ? null
          : {
              id: organization.folderId,
              name: 'Classiques',
            },
      tags: organization.tagNames.map((name, index) => ({
        id: `tag-${index + 1}`,
        name,
        slug: name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      })),
    });

  getPersonalFolders(): Observable<CocktailSummaryFolder[]> {
    return this.foldersResponse;
  }

  getPersonalTags(): Observable<CocktailSummaryTag[]> {
    return this.tagsResponse;
  }

  createPersonalFolder(folder: CreateCocktailFolderRequest): Observable<CocktailSummaryFolder> {
    this.createdFolders.push({
      ...folder,
    });

    return this.createFolderHandler(folder);
  }

  updatePersonalCocktailOrganization(
    slug: string,
    organization: UpdateCocktailOrganizationRequest,
  ): Observable<CocktailOrganizationResult> {
    this.organizationRequests.push({
      slug,
      organization: {
        folderId: organization.folderId,
        tagNames: [...organization.tagNames],
      },
    });

    return this.updateOrganizationHandler(organization);
  }
}

describe('CocktailOrganizationEditor', () => {
  let cocktailsService: CocktailsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocktailOrganizationEditor],
      providers: [
        {
          provide: CocktailsService,
          useClass: CocktailsServiceStub,
        },
      ],
    }).compileComponents();

    cocktailsService = TestBed.inject(CocktailsService) as unknown as CocktailsServiceStub;
  });

  it('loads catalogs and initializes the current organization', () => {
    const fixture = TestBed.createComponent(CocktailOrganizationEditor);

    fixture.componentRef.setInput('slug', 'daiquiri');

    fixture.componentRef.setInput('folder', {
      id: 'folder-classics',
      name: 'Classiques',
    });

    fixture.componentRef.setInput('tags', [
      {
        id: 'tag-classic',
        name: 'Classique',
        slug: 'classique',
      },
    ]);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.selectedFolderId()).toBe('folder-classics');

    expect(component.selectedTagNames()).toEqual(['Classique']);

    expect(component.availableFolders()).toEqual([
      {
        id: 'folder-classics',
        name: 'Classiques',
      },
    ]);

    expect(component.availableTags().map((tag) => tag.name)).toEqual(['Agrumes', 'Classique']);
  });

  it('creates a folder and selects it', () => {
    const fixture = TestBed.createComponent(CocktailOrganizationEditor);

    fixture.componentRef.setInput('slug', 'daiquiri');

    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      'input[aria-label="Nom du nouveau dossier"]',
    ) as HTMLInputElement;

    input.value = 'Favoris';

    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.create-folder-button',
    ) as HTMLButtonElement;

    button.click();

    fixture.detectChanges();

    expect(cocktailsService.createdFolders).toEqual([
      {
        name: 'Favoris',
      },
    ]);

    expect(fixture.componentInstance.selectedFolderId()).toBe('folder-new');

    expect(fixture.componentInstance.availableFolders()).toContainEqual({
      id: 'folder-new',
      name: 'Favoris',
    });
  });

  it('adds a new tag and saves the complete organization', () => {
    const fixture = TestBed.createComponent(CocktailOrganizationEditor);

    fixture.componentRef.setInput('slug', 'daiquiri');

    fixture.componentRef.setInput('folder', {
      id: 'folder-classics',
      name: 'Classiques',
    });

    fixture.componentRef.setInput('tags', [
      {
        id: 'tag-classic',
        name: 'Classique',
        slug: 'classique',
      },
    ]);

    fixture.detectChanges();

    const emittedOrganizations: CocktailOrganizationResult[] = [];

    fixture.componentInstance.organizationUpdated.subscribe((organization) => {
      emittedOrganizations.push(organization);
    });

    const input = fixture.nativeElement.querySelector(
      'input[aria-label="Nom du nouveau tag"]',
    ) as HTMLInputElement;

    input.value = ' Tropical ';

    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.add-tag-button') as HTMLButtonElement;

    addButton.click();

    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector(
      '.save-organization-button',
    ) as HTMLButtonElement;

    saveButton.click();

    fixture.detectChanges();

    expect(cocktailsService.organizationRequests).toEqual([
      {
        slug: 'daiquiri',
        organization: {
          folderId: 'folder-classics',
          tagNames: ['Classique', 'Tropical'],
        },
      },
    ]);

    expect(emittedOrganizations).toHaveLength(1);

    expect(fixture.nativeElement.textContent).toContain('Organisation enregistrée.');
  });

  it('removes an existing tag from the replacement state', () => {
    const fixture = TestBed.createComponent(CocktailOrganizationEditor);

    fixture.componentRef.setInput('slug', 'daiquiri');

    fixture.componentRef.setInput('tags', [
      {
        id: 'tag-classic',
        name: 'Classique',
        slug: 'classique',
      },
    ]);

    fixture.detectChanges();

    fixture.componentInstance.removeTag('Classique');

    expect(fixture.componentInstance.selectedTagNames()).toEqual([]);
  });

  it('renders a conflict error when a folder already exists', () => {
    cocktailsService.createFolderHandler = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
          }),
      );

    const fixture = TestBed.createComponent(CocktailOrganizationEditor);

    fixture.componentRef.setInput('slug', 'daiquiri');

    fixture.detectChanges();

    fixture.componentInstance.newFolderName.set('Classiques');

    fixture.componentInstance.createFolder();

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Un dossier portant ce nom existe déjà.');
  });
});
