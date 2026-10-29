import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { WorkspaceContext } from '../../core/workspaces/workspace-context';
export interface StockProduct {
  id: string;
  name: string;
  packaging: string;
  quantity: number;
  threshold: number;
  target: number;
  version: number;
  suggestedQuantity?: number | null;
}
export interface StockPage {
  items: StockProduct[];
  total: number;
  page: number;
  pageSize: number;
  accessVersion: number;
}
export interface StockReceipt {
  id: string;
  requestId: string;
  productId: string;
  kind: string;
  beforeQuantity: number;
  afterQuantity: number;
  productVersion: number;
  reason: string;
  createdAt: string;
}
export interface StockResult {
  product: StockProduct;
  receipt: StockReceipt;
}
export interface StockHistory {
  snapshotVersion: number;
  items: (Omit<StockReceipt, 'requestId' | 'productId'> & {
    delta: number;
    actor: { id: string; displayName: string };
  })[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CreateProduct {
  name: string;
  packaging: string;
  initialQuantity: number;
  threshold: number;
  target: number;
  requestId: string;
  expectedAccessVersion: number;
}
export interface StockChange {
  kind: 'ADD' | 'REMOVE' | 'SET';
  amount: number;
  reason: string;
  requestId: string;
  expectedProductVersion: number;
  expectedAccessVersion: number;
}
export interface StockSettings {
  threshold: number;
  target: number;
  expectedProductVersion: number;
  expectedAccessVersion: number;
}
@Injectable({ providedIn: 'root' })
export class InventoryApi {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContext);
  list(page = 1, reorder = false) {
    return this.workspace.request(`inventory/${reorder ? 'reorder' : 'products'}`, false, (url) =>
      this.http.get<StockPage>(url, { params: { page, pageSize: 25 } }),
    );
  }
  detail(id: string) {
    return this.workspace.request(`inventory/products/${encodeURIComponent(id)}`, false, (url) =>
      this.http.get<StockProduct & { accessVersion: number }>(url),
    );
  }
  history(id: string, page = 1) {
    return this.workspace.request(
      `inventory/products/${encodeURIComponent(id)}/movements`,
      false,
      (url) => this.http.get<StockHistory>(url, { params: { page, pageSize: 25 } }),
    );
  }
  receipt(id: string) {
    return this.workspace.request(`inventory/receipts/${encodeURIComponent(id)}`, false, (url) =>
      this.http.get<StockResult>(url),
    );
  }
  create(body: CreateProduct) {
    return this.workspace.request(
      'inventory/products',
      true,
      (url) => this.http.post<StockResult>(url, body),
      body.expectedAccessVersion,
    );
  }
  move(id: string, body: StockChange) {
    return this.workspace.request(
      `inventory/products/${encodeURIComponent(id)}/movements`,
      true,
      (url) => this.http.post<StockResult>(url, body),
      body.expectedAccessVersion,
    );
  }
  settings(id: string, body: StockSettings) {
    return this.workspace.request(
      `inventory/products/${encodeURIComponent(id)}`,
      true,
      (url) => this.http.put<StockProduct>(url, body),
      body.expectedAccessVersion,
    );
  }
}
