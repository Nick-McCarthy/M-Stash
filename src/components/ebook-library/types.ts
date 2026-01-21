export interface Ebook {
  id: number;
  title: string;
  author: string;
  address: string;
}

export interface EbooksResponse {
  ebooks: Ebook[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

