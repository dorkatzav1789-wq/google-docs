export interface Client {
  id: number;
  name: string;
  phone: string;
  company: string;
  company_id: string;
  created_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
  created_at: string;
}

export interface Alias {
  id: number;
  alias: string;
  item_name: string;
  price_override: number | null;
  created_at: string;
}

export interface QuoteItem {
  id?: number;
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total: number;
  matched_text?: string;
}

export interface Quote {
  id?: number;
  client_id: number;
  event_name: string;
  event_date: string;
  event_hours: string;
  special_notes: string;
  discount_percent: number;
  total_before_discount: number;
  discount_amount: number;
  total_after_discount: number;
  vat_amount: number;
  final_total: number;
  created_at?: string;
  client_name?: string;
  client_company?: string;
}

export interface QuoteWithItems {
  quote: Quote;
  items: QuoteItem[];
}

