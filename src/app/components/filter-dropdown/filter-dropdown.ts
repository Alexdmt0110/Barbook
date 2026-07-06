import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-filter-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-dropdown.html',
  styleUrl: './filter-dropdown.css',
})
export class FilterDropdown {
  @Input({ required: true }) label = '';
  @Input() options: string[] = [];
  @Input() selected = 'all';
  @Input() allLabel = 'Tous';
  @Input() open = false;
  @Input() scrollable = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() selectedChange = new EventEmitter<string>();

  get selectedLabel(): string {
    return this.selected === 'all' ? this.allLabel : this.selected;
  }

  get hasActiveFilter(): boolean {
    return this.selected !== 'all';
  }

  selectOption(value: string): void {
    this.selectedChange.emit(value);
  }
}
