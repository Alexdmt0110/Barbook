import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
import { CocktailContentSnapshot } from '../cocktails/data-access/cocktail-content.models';
import { MeasurementUnit } from '../cocktails/data-access/cocktail.models';
export interface Quantity {
  numerator: string;
  denominator: string;
}
export interface BatchParameters {
  mode: 'PORTIONS' | 'VOLUME_ML';
  target: number;
  includedPositions: number[];
  rounding: { unit: Exclude<MeasurementUnit, 'TOP_UP'>; step: number }[];
}
export interface BatchCalculation {
  factor: Quantity;
  completePortions: string;
  basePerPortionMl: Quantity | null;
  baseVolumeMl: Quantity | null;
  targetVolumeMl: Quantity | null;
  volumeDifferenceMl: Quantity | null;
  remainingMl: Quantity | null;
  ingredients: BatchCalculatedLine[];
  garnishes: BatchCalculatedLine[];
}
export interface BatchCalculatedLine {
  position: number;
  ingredientName: string;
  unit: MeasurementUnit | null;
  originalAmount: number | null;
  included: boolean;
  exact: Quantity | null;
  rounded: Quantity | null;
  delta: Quantity | null;
  ratio: Quantity | null;
  unknown: string | null;
}
export interface BatchPreview {
  snapshot: { schemaVersion: 1; recipe: CocktailContentSnapshot };
  parameters: BatchParameters;
  calculation: BatchCalculation;
  accessVersion: number;
}
export interface BatchSummary {
  id: string;
  name: string;
  sourceCocktailId: string;
  sourceContentVersion: number;
  version: number;
  updatedAt: string;
}
export interface BatchPlan extends BatchPreview, BatchSummary {
  sourceChanged: boolean;
  creatorId: string;
  createdAt: string;
}
export type BatchCreate = BatchParameters & {
  name: string;
  sourceCocktailId: string;
  expectedContentVersion: number;
  expectedAccessVersion: number;
  requestId: string;
};
export type BatchUpdate = BatchParameters & {
  name: string;
  expectedPlanVersion: number;
  expectedAccessVersion: number;
};
@Injectable({ providedIn: 'root' })
export class BatchApi {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContext);
  list(page = 1) {
    return this.workspace.request('batch-plans', false, (url) =>
      this.http.get<{ items: BatchSummary[]; total: number; page: number; accessVersion: number }>(
        url,
        { params: { page, pageSize: 25 } },
      ),
    );
  }
  detail(id: string) {
    return this.workspace.request(`batch-plans/${encodeURIComponent(id)}`, false, (url) =>
      this.http.get<BatchPlan>(url),
    );
  }
  preview(body: BatchCreate | BatchUpdate, id?: string) {
    const { name: ignoredName, ...input } = body;
    void ignoredName;
    const clean = id ? input : { ...input };
    // Preview DTO excludes a creation key; it cannot create a plan.
    const payload = { ...clean } as Record<string, unknown>;
    delete payload['requestId'];
    return this.workspace.request(
      id ? `batch-plans/${encodeURIComponent(id)}/preview` : 'batch-plans/preview',
      false,
      (url) => this.http.post<BatchPreview>(url, payload),
    );
  }
  create(body: BatchCreate) {
    return this.workspace.request(
      'batch-plans',
      true,
      (url) => this.http.post<BatchPlan>(url, body),
      body.expectedAccessVersion,
    );
  }
  update(id: string, body: BatchUpdate) {
    return this.workspace.request(
      `batch-plans/${encodeURIComponent(id)}`,
      true,
      (url) => this.http.put<BatchPlan>(url, body),
      body.expectedAccessVersion,
    );
  }
  receipt(key: string) {
    return this.workspace.request(`batch-plan-receipts/${encodeURIComponent(key)}`, false, (url) =>
      this.http.get<BatchPlan>(url),
    );
  }
}
