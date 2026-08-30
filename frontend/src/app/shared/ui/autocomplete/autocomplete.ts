import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';

let autocompleteSequence = 0;

export interface UiAutocompleteOption {
  id: string;
  label: string;
  description?: string;
}

@Component({
  selector: 'app-ui-autocomplete',
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.css',
})
export class UiAutocomplete {
  private readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('autocompleteInput');

  private readonly instanceId = ++autocompleteSequence;

  readonly value = input.required<string>();

  readonly options = input<readonly UiAutocompleteOption[]>([]);

  readonly isLoading = input(false);

  readonly disabled = input(false);

  readonly minSearchLength = input(3);

  readonly placeholder = input('');

  readonly ariaLabel = input('Recherche');

  readonly valueChange = output<string>();

  readonly queryChange = output<string>();

  readonly optionSelected = output<UiAutocompleteOption>();

  readonly blurred = output<void>();

  readonly isOpen = signal(false);

  readonly activeIndex = signal(-1);

  readonly listboxId = `autocomplete-listbox-${this.instanceId}`;

  readonly panelVisible = computed(
    () => this.isOpen() && (this.isLoading() || this.options().length > 0),
  );

  onInput(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const value = target.value;

    this.valueChange.emit(value);
    this.queryChange.emit(value);
    this.activeIndex.set(-1);

    this.isOpen.set(value.trim().length >= this.minSearchLength());
  }

  onFocus(): void {
    if (this.value().trim().length >= this.minSearchLength()) {
      this.isOpen.set(true);
    }
  }

  onBlur(): void {
    this.close();
    this.blurred.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    const options = this.options();

    if (event.key === 'Escape') {
      if (this.isOpen()) {
        event.preventDefault();
        this.close();
      }

      return;
    }

    if (this.value().trim().length < this.minSearchLength()) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.isOpen.set(true);

      if (options.length === 0) {
        return;
      }

      this.activeIndex.update((currentIndex) =>
        currentIndex >= options.length - 1 ? 0 : currentIndex + 1,
      );

      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.isOpen.set(true);

      if (options.length === 0) {
        return;
      }

      this.activeIndex.update((currentIndex) =>
        currentIndex <= 0 ? options.length - 1 : currentIndex - 1,
      );

      return;
    }

    if (event.key === 'Enter') {
      const activeOption = options[this.activeIndex()];

      if (!activeOption) {
        return;
      }

      event.preventDefault();

      this.commitOption(activeOption);
    }
  }

  selectOption(event: MouseEvent, option: UiAutocompleteOption): void {
    event.preventDefault();

    this.commitOption(option);
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  activeDescendant(): string | null {
    const index = this.activeIndex();

    if (index < 0 || index >= this.options().length) {
      return null;
    }

    return this.optionId(index);
  }

  private commitOption(option: UiAutocompleteOption): void {
    this.valueChange.emit(option.label);

    this.optionSelected.emit(option);

    this.close();

    queueMicrotask(() => {
      this.inputElement()?.nativeElement.focus();
    });
  }

  private close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }
}
