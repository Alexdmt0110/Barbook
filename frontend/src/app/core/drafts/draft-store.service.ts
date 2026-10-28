import { inject, Injectable, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';

export const DRAFT_KEY = 'barbook.drafts.v1';
export const DRAFT_TTL = 24 * 60 * 60 * 1000;
const MAX_BYTES = 500_000;
const MAX_ENTRIES = 20;
export interface DraftOwner {
  userId: string;
  workspaceId: string;
}
export interface DraftRecord {
  key: string;
  version: number;
  savedAt: number;
  expiresAt: number;
  uncertain: boolean;
  value: unknown;
}
export interface DraftLease {
  readonly owner: DraftOwner;
  readonly generation: number;
}
interface Envelope {
  schema: 1;
  owner: DraftOwner;
  entries: DraftRecord[];
}
const sameOwner = (a: DraftOwner | null, b: DraftOwner | null): boolean =>
  !!a && !!b && a.userId === b.userId && a.workspaceId === b.workspaceId;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Untrusted per-tab data. A lease is issued only after the server confirms /me. */
@Injectable({ providedIn: 'root' })
export class DraftStore {
  private readonly storage = inject(BrowserStorageService);
  private owner: DraftOwner | null = null;
  private active = false;
  private generation = 0;
  private entries: DraftRecord[] = [];
  private purgePending = false;
  private readonly pending = new Set<string>();
  readonly memoryOnly = signal(false);
  readonly purgeFailed = signal(false);

  confirmIdentity(owner: DraftOwner): void {
    // Change owner before retrying an inaccessible purge: memory may contain new
    // drafts from the interim owner and must never be reassigned to another one.
    if (this.owner && !sameOwner(this.owner, owner)) this.purge();
    if (this.purgePending) this.eraseStorage();
    if (!sameOwner(this.owner, owner)) {
      this.generation++;
      this.owner = { ...owner };
      this.entries = this.purgePending ? [] : this.read(owner);
    }
    this.active = true;
  }

  suspend(): void {
    this.generation++;
    this.active = false;
    this.pending.clear();
  }
  lease(): DraftLease | null {
    return this.active && this.owner
      ? { owner: { ...this.owner }, generation: this.generation }
      : null;
  }
  valid(lease: DraftLease | null): lease is DraftLease {
    return (
      !!lease &&
      this.active &&
      lease.generation === this.generation &&
      sameOwner(lease.owner, this.owner)
    );
  }
  belongsTo(owner: DraftOwner): boolean {
    return sameOwner(this.owner, owner);
  }

  hasDrafts(): boolean {
    this.prune();
    // Suspended drafts still require explicit confirmation before a voluntary switch.
    if (this.entries.length > 0) return true;
    const stored = this.storage.read('session', DRAFT_KEY);
    if (!stored) return false;
    try {
      if (stored.length > MAX_BYTES) return true;
      const envelope: unknown = JSON.parse(stored);
      // Inspect bounded metadata only. Do not activate/import another workspace's payload.
      return object(envelope) && Array.isArray(envelope['entries'])
        ? envelope['entries'].some((entry) => this.isRecord(entry, Date.now()))
        : true;
    } catch {
      return true;
    }
  }
  hasPendingMutation(): boolean {
    return this.pending.size > 0;
  }
  mutationStarted(lease: DraftLease | null, key: string): void {
    if (this.valid(lease)) this.pending.add(key);
  }
  mutationFinished(lease: DraftLease | null, key: string): void {
    if (this.valid(lease)) this.pending.delete(key);
  }

  find(lease: DraftLease | null, key: string): DraftRecord | null {
    if (!this.valid(lease)) return null;
    this.prune();
    const entry = this.entries.find((item) => item.key === key);
    return entry ? structuredClone(entry) : null;
  }

  save(
    lease: DraftLease | null,
    key: string,
    version: number,
    value: unknown,
    uncertain = false,
  ): boolean {
    if (!this.valid(lease)) return false;
    this.prune();
    const previous = this.entries.filter((entry) => entry.key !== key);
    const now = Date.now();
    const entry: DraftRecord = {
      key,
      version,
      savedAt: now,
      expiresAt: now + DRAFT_TTL,
      value,
      uncertain,
    };
    // Preserve invalid form values, but never allow unbounded browser state.
    let serialized: string;
    try {
      serialized = JSON.stringify(entry);
    } catch {
      this.memoryOnly.set(true);
      return false;
    }
    if (
      previous.length >= MAX_ENTRIES ||
      serialized.length > MAX_BYTES ||
      !this.isRecord(entry, now)
    ) {
      this.memoryOnly.set(true);
      return false;
    }
    this.entries = [...previous, structuredClone(entry)];
    return this.persist();
  }

  prepareMutation(lease: DraftLease | null, key: string, version: number, value: unknown): boolean {
    if (!this.valid(lease)) return false;
    // If the uncertain marker cannot be persisted, remove any older apparently
    // unsent snapshot before allowing a request. Otherwise a refresh could revive it.
    return this.save(lease, key, version, value, true) || this.eraseStorage();
  }

  setUncertain(lease: DraftLease | null, key: string, uncertain: boolean): void {
    if (!this.valid(lease)) return;
    this.prune();
    this.entries = this.entries.map((entry) =>
      entry.key === key ? { ...entry, uncertain } : entry,
    );
    this.persist();
  }

  remove(lease: DraftLease | null, key: string): void {
    if (!this.valid(lease)) return;
    this.entries = this.entries.filter((entry) => entry.key !== key);
    // An older persisted copy must not resurrect after an explicit discard.
    // Other entries remain in memory if only whole-key removal is available.
    if (!this.persist()) this.eraseStorage();
  }

  /** Local intent, before the HTTP logout. Invalidates even previously captured callbacks. */
  purge(): void {
    this.generation++;
    this.active = false;
    this.owner = null;
    this.entries = [];
    this.pending.clear();
    this.eraseStorage();
  }

  private eraseStorage(): boolean {
    const removed =
      this.storage.remove('session', DRAFT_KEY) || this.storage.write('session', DRAFT_KEY, '');
    this.purgePending = !removed;
    this.purgeFailed.set(!removed);
    return removed;
  }
  private prune(): void {
    const now = Date.now();
    const previous = this.entries.length;
    this.entries = this.entries.filter((entry) => this.isRecord(entry, now));
    if (this.entries.length !== previous) this.persist();
  }
  private persist(): boolean {
    if (!this.owner) return false;
    if (this.purgePending && !this.eraseStorage()) {
      this.memoryOnly.set(true);
      return false;
    }
    const envelope: Envelope = { schema: 1, owner: this.owner, entries: this.entries };
    const raw = JSON.stringify(envelope);
    const stored = raw.length <= MAX_BYTES && this.storage.write('session', DRAFT_KEY, raw);
    this.memoryOnly.set(!stored);
    return stored;
  }
  private read(owner: DraftOwner): DraftRecord[] {
    const raw = this.storage.read('session', DRAFT_KEY);
    if (!raw) return [];
    try {
      if (raw.length > MAX_BYTES) throw new Error('size');
      const parsed: unknown = JSON.parse(raw);
      if (
        !object(parsed) ||
        parsed['schema'] !== 1 ||
        !object(parsed['owner']) ||
        parsed['owner']['userId'] !== owner.userId ||
        parsed['owner']['workspaceId'] !== owner.workspaceId ||
        !Array.isArray(parsed['entries']) ||
        parsed['entries'].length > MAX_ENTRIES
      )
        throw new Error('schema');
      const now = Date.now();
      const entries = parsed['entries'].filter((entry): entry is DraftRecord =>
        this.isRecord(entry, now),
      );
      if (new Set(entries.map((entry) => entry.key)).size !== entries.length)
        throw new Error('duplicates');
      if (entries.length !== parsed['entries'].length) {
        const cleaned: Envelope = { schema: 1, owner, entries };
        this.memoryOnly.set(!this.storage.write('session', DRAFT_KEY, JSON.stringify(cleaned)));
      }
      return entries;
    } catch {
      this.eraseStorage();
      return [];
    }
  }
  private isRecord(value: unknown, now: number): value is DraftRecord {
    return (
      object(value) &&
      typeof value['key'] === 'string' &&
      value['key'].length > 0 &&
      value['key'].length <= 200 &&
      Number.isSafeInteger(value['version']) &&
      (value['version'] as number) >= 0 &&
      typeof value['savedAt'] === 'number' &&
      Number.isSafeInteger(value['savedAt']) &&
      value['savedAt'] > 0 &&
      value['savedAt'] <= now &&
      value['expiresAt'] === value['savedAt'] + DRAFT_TTL &&
      (value['expiresAt'] as number) > now &&
      typeof value['uncertain'] === 'boolean' &&
      Object.hasOwn(value, 'value')
    );
  }
}
