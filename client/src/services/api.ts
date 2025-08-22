import axios from 'axios';
import { Client, Item, Alias, Quote, QuoteItem, QuoteWithItems } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Clients API
export const clientsAPI = {
  getAll: (): Promise<Client[]> => api.get('/clients').then(res => res.data),
  create: (client: Omit<Client, 'id' | 'created_at'>): Promise<{ id: number; message: string }> => 
    api.post('/clients', client).then(res => res.data),
};

// Items API
export const itemsAPI = {
  getAll: (): Promise<Item[]> => api.get('/items').then(res => res.data),
  search: (query: string): Promise<Item[]> => 
    api.get(`/search/items?q=${encodeURIComponent(query)}`).then(res => res.data),
};

// Aliases API
export const aliasesAPI = {
  getAll: (): Promise<Alias[]> => api.get('/aliases').then(res => res.data),
};

// Quotes API
export const quotesAPI = {
  getAll: (): Promise<Quote[]> => api.get('/quotes').then(res => res.data),
  getById: (id: number): Promise<QuoteWithItems> => api.get(`/quotes/${id}`).then(res => res.data),
  create: (quote: Quote, items: QuoteItem[]): Promise<{ id: number; message: string }> => 
    api.post('/quotes', { quote, items }).then(res => res.data),
  parseText: (text: string): Promise<QuoteItem[]> => 
    api.post('/parse-quote', { text }).then(res => res.data),
  exportPDF: (quoteId: number): Promise<Blob> => 
    api.post('/export-pdf', { quoteId }, { responseType: 'blob' }).then(res => res.data),
  remove: (id: number): Promise<{ ok: boolean }> =>
      api.delete(`/quotes/${id}`).then(res => res.data),
};

export default api;
