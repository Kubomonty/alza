/**
 * Filter parameters used for API requests.
 */
interface FilterParameters {
  branchId: string;
  id: number;
  isInStockOnly: boolean;
  newsOnly: boolean;
  orderBy: number;
  page: number;
  params: [];
  producers: unknown[];
  sendPrices: boolean;
  type: string;
  typeId: string;
  wearType: number;
}

export interface ProductsRequest {
  categoryId: string;
  country: 'CZ';
  filterParameters: FilterParameters;
}
