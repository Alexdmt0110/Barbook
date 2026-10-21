import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DraftRecord, DraftStore } from './draft-store.service';

/** Each mounted form owns one lease. Old forms cannot write after logout/account change. */
export class FormDraft {
  private readonly lease;
  readonly candidate = signal<DraftRecord | null>(null);
  readonly pending = signal(false);
  readonly uncertain = signal(false);
  readonly conflict = signal(false);
  readonly dirty = signal(false);
  readonly submissionBlocked = signal(false);
  readonly invalid = signal(false);
  private value: unknown;
  constructor(
    readonly store: DraftStore,
    readonly key: string,
    private version: number,
    private readonly validate: (value: unknown, version: number) => boolean,
  ) {
    this.lease = store.lease();
    const candidate = store.find(this.lease, key);
    if (candidate && validate(candidate.value, candidate.version)) this.candidate.set(candidate);
    else if (candidate) {
      store.remove(this.lease, key);
      this.invalid.set(true);
    }
  }
  capture(value: unknown): void {
    if (this.candidate() || !this.store.valid(this.lease)) return;
    this.value = structuredClone(value);
    this.dirty.set(true);
    this.store.save(this.lease, this.key, this.version, this.value, this.uncertain());
  }
  restore(): unknown {
    // Re-read enforces TTL even if the prompt has been left open for 24 hours.
    const entry = this.store.find(this.lease, this.key);
    if (!this.candidate() || !entry || !this.validate(entry.value, entry.version)) {
      this.candidate.set(null);
      this.invalid.set(true);
      return null;
    }
    this.conflict.set(entry.version !== this.version);
    this.version = entry.version;
    this.value = entry.value;
    this.uncertain.set(entry.uncertain);
    this.candidate.set(null);
    this.dirty.set(true);
    return structuredClone(entry.value);
  }
  discard(): void {
    this.store.remove(this.lease, this.key);
    this.candidate.set(null);
    this.pending.set(false);
    this.dirty.set(false);
    this.uncertain.set(false);
    this.conflict.set(false);
  }
  begin(value: unknown): boolean {
    if (!this.store.valid(this.lease) || this.candidate() || this.uncertain() || this.conflict())
      return false;
    this.capture(value);
    if (!this.store.prepareMutation(this.lease, this.key, this.version, value)) {
      this.submissionBlocked.set(true);
      return false;
    }
    this.submissionBlocked.set(false);
    this.pending.set(true);
    this.uncertain.set(true);
    return true;
  }
  rejected(error: unknown): void {
    this.pending.set(false);
    if (error instanceof HttpErrorResponse && [400, 401, 403, 404, 409].includes(error.status)) {
      this.uncertain.set(false);
      this.store.setUncertain(this.lease, this.key, false);
    }
  }
  verifiedAbsent(): void {
    if (this.pending()) return;
    // User must explicitly inspect the library/server state first. Never sends a request.
    this.uncertain.set(false);
    this.store.setUncertain(this.lease, this.key, false);
  }
  folderSucceeded(): void {
    this.pending.set(false);
    this.verifiedAbsent();
  }
  succeeded(version = this.version): void {
    this.discard();
    this.version = version;
  }
  canLeave(): boolean {
    if (!this.store.valid(this.lease) || !this.dirty()) return true;
    return window.confirm(
      this.store.memoryOnly()
        ? 'Quitter ? Ce brouillon est seulement en mémoire et peut être perdu à l’actualisation.'
        : 'Quitter en conservant ce brouillon dans cet onglet pendant 24 heures maximum ?',
    );
  }
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.valid(this.lease) && this.dirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
