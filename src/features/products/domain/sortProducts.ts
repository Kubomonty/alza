import type { ProductTab } from './productTabs';

import { Product } from './models';

/**
 * Sorts products based on the active product tab - top and bestsellers return unsorted lists
 *
 * @param {Product[]} products Products to sort
 * @param {ProductTab} tab Active product tab
 * @returns {Product[]}
 */
export function sortProducts(products: Product[], tab: ProductTab): Product[] {
  const copy = [...products];

  switch (tab) {
    case 'price_asc':
      return copy.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return copy.sort((a, b) => b.price - a.price);
    case 'bestsellers':
      return copy;
    case 'top':
    default:
      return copy;
  }
}
