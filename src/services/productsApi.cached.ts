import { unstable_cache } from 'next/cache';

import type { ProductsRequest } from '@/features/products/domain/requests';

import { Product } from '@/features/products/domain/models';

import { fetchProducts } from './productsApi';

/**
 * Generates a stable cache key based on the product request parameters
 *
 * @param {ProductsRequest} req Products request parameters
 * @returns {string} A stable key for caching purposes
 */
function stableKey(req: ProductsRequest): string {
  return [req.categoryId, req.country, JSON.stringify(req.filterParameters ?? {})].join('|');
}

/**
 * Fetches products with caching based on the request parameters.
 *
 * @param {ProductsRequest} req Products request parameters
 * @returns {Promise<Product[]>} A promise that resolves to an array of products
 */
export async function getProducts(req: ProductsRequest): Promise<Product[]> {
  const key = stableKey(req);

  try {
    const cachedFn = unstable_cache(async () => fetchProducts(req), ['products', key], {
      revalidate: 120, // revalidate cache every 2 minutes
    });
    return await cachedFn();
  } catch (error) {
    console.error('Cache error:', error);
    // Fallback to direct fetch
    return fetchProducts(req);
  }
}
