/**
 * Product type used for defining product details.
 */
export interface Product {
  avail: string;
  id: number;
  img: string;
  name: string;
  spec: string;
  price: number;
  priceText: string;
  rating: number;
  ratingCount: number;
  url: string;
}

/**
 * Notebook category type used for defining notebook categories.
 */
export interface NotebookCategory {
  imageUrl: string;
  id: string;
  label: string;
  url: string;
}
