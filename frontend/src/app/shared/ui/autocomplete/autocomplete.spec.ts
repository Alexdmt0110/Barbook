import { TestBed } from '@angular/core/testing';
import { UiAutocomplete, UiAutocompleteOption } from './autocomplete';

describe('UiAutocomplete', () => {
  const options: UiAutocompleteOption[] = [
    {
      id: 'lemon',
      label: 'Citron jaune',
      description: 'Sans alcool',
    },
    {
      id: 'lime',
      label: 'Citron vert',
      description: 'Sans alcool',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiAutocomplete],
    }).compileComponents();
  });

  it('does not show an empty result panel', () => {
    const fixture = TestBed.createComponent(UiAutocomplete);

    fixture.componentRef.setInput('value', 'kumquat');

    fixture.componentRef.setInput('options', []);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.isOpen.set(true);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.autocomplete-panel')).toBeNull();
  });

  it('shows available suggestions', () => {
    const fixture = TestBed.createComponent(UiAutocomplete);

    fixture.componentRef.setInput('value', 'cit');

    fixture.componentRef.setInput('options', options);

    fixture.detectChanges();

    fixture.componentInstance.onFocus();

    fixture.detectChanges();

    const renderedOptions = fixture.nativeElement.querySelectorAll('.autocomplete-option');

    expect(renderedOptions.length).toBe(2);

    expect(fixture.nativeElement.textContent).toContain('Citron jaune');

    expect(fixture.nativeElement.textContent).toContain('Citron vert');
  });

  it('navigates suggestions with the keyboard and selects with Enter', () => {
    const fixture = TestBed.createComponent(UiAutocomplete);

    fixture.componentRef.setInput('value', 'cit');

    fixture.componentRef.setInput('options', options);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    let selectedOption: UiAutocompleteOption | null = null;

    component.optionSelected.subscribe((option) => {
      selectedOption = option;
    });

    component.onFocus();

    component.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
      }),
    );

    expect(component.activeIndex()).toBe(0);

    component.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
      }),
    );

    expect(component.activeIndex()).toBe(1);

    component.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
      }),
    );

    expect(component.activeIndex()).toBe(0);

    component.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'Enter',
      }),
    );

    expect(selectedOption).toEqual(options[0]);

    expect(component.isOpen()).toBe(false);
  });

  it('closes the suggestions with Escape', () => {
    const fixture = TestBed.createComponent(UiAutocomplete);

    fixture.componentRef.setInput('value', 'cit');

    fixture.componentRef.setInput('options', options);

    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.onFocus();

    expect(component.isOpen()).toBe(true);

    component.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'Escape',
      }),
    );

    expect(component.isOpen()).toBe(false);

    expect(component.activeIndex()).toBe(-1);
  });
});
