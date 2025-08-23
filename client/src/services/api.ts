import axios from 'axios';
import { Client, Item, Alias, Quote, QuoteItem, QuoteWithItems } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://google-docs-dor.onrender.com/api';

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
  create: (payload: { name: string; description?: string; price: number; }): Promise<Item> =>
      api.post('/items', payload).then(res => res.data),
};

// Aliases API
export const aliasesAPI = {
  getAll: (): Promise<Alias[]> => api.get('/aliases').then(res => res.data),
  create: (payload: { alias: string; item_name: string; price_override?: number | null }): Promise<Alias> =>
      api.post('/aliases', payload).then(res => res.data),
};
type ParseQuoteResponse = {
  items: QuoteItem[];
  unknown: Array<{ line: string; quantity: number; raw_text: string; unit_price: number | null }>;
};

// Quotes API
export const quotesAPI = {
  getAll: (): Promise<Quote[]> => api.get('/quotes').then(res => res.data),
  getById: (id: number): Promise<QuoteWithItems> => api.get(`/quotes/${id}`).then(res => res.data),
  create: (quote: Quote, items: QuoteItem[]): Promise<{ id: number; message: string }> => 
    api.post('/quotes', { quote, items }).then(res => res.data),
  parseText: (text: string): Promise<ParseQuoteResponse> =>
      api.post('/parse-quote', { text }).then(res => res.data),
  exportPDF: (quoteId: number): Promise<Blob> => 
    api.post('/export-pdf', { quoteId }, { responseType: 'blob' }).then(res => res.data),
  remove: (id: number): Promise<{ ok: boolean }> =>
      api.delete(`/quotes/${id}`).then(res => res.data),


};

export const employeesAPI = {
  getAll: () => axios.get('/api/employees').then(res => res.data),
  create: (employee: any) => axios.post('/api/employees', employee).then(res => res.data),
  update: (id: number, employee: any) => axios.put(`/api/employees/${id}`, employee).then(res => res.data),
};

export const workHoursAPI = {
  create: (workHours: any) => axios.post('/api/work-hours', workHours).then(res => res.data),
  getByEmployee: (employeeId: number, startDate: string, endDate: string) => 
    axios.get(`/api/work-hours/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`).then(res => res.data),
};

// Reports API
export const reportsAPI = {
  getMonthly: (year: number, month: number) =>
      api.get(`/reports/monthly/${year}/${month}`).then(res => res.data),

  exportMonthlyPdf: (year: number, month: number): Promise<Blob> =>
      api.get(`/reports/monthly/${year}/${month}/pdf`, { responseType: 'blob' })
          .then(res => res.data),
};


export default api;
