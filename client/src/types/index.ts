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
  splits?: QuoteItem[];
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
  client_phone?: string | null;
  client_company_id?: string | null;
}

export interface QuoteWithItems {
  quote: Quote;
  items: QuoteItem[];
}

export interface Employee {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface WorkHours {
  id: number;
  employee_id: number;
  work_date: string;
  hours_worked: number;
  hourly_rate: number;
  daily_total: number;
  overtime_amount: number;
  notes?: string;
  event_type: 'business' | 'personal';

  // כשמחזירים מ-Supabase עם join:
  employees?: {
    name: string;
    hourly_rate?: number;
  } | null;

  // fallback אם תחזירו שם עובד בצורה שטוחה
  employee_name?: string | null;
}

export interface MonthlyReport {
  work_hours: WorkHours[];
  employees: Employee[];
  summary: {
    total_hours: number;
    daily_total: number;
    employee_count: number;
  };
}
export type NewWorkHoursInput = {
  employee_id: number;
  work_date: string;
  hours_worked: number;
  hourly_rate: number;
  daily_total: number;
  overtime_amount: number;
  notes?: string;
  event_type: 'business' | 'personal';
};

export interface Reminder {
  id?: number;
  quote_id: number;
  reminder_date: string;
  reminder_type: 'email' | 'sms' | 'push';
  email_addresses: string[];
  message?: string;
  is_sent: boolean;
  sent_at?: string;
  created_at?: string;
  updated_at?: string;
  // נתונים מ-join עם quotes
  quotes?: Array<{
    event_name: string;
    event_date: string;
    special_notes?: string;
  }>;
}

export type NewReminderInput = {
  quote_id: number;
  reminder_date: string;
  reminder_type: 'email' | 'sms' | 'push';
  email_addresses: string[];
  message?: string;
};


