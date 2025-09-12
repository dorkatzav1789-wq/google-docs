// services/supabaseAPI.ts - Direct Supabase API calls
import { getSupabaseClient, getSupabaseAdmin } from './supabaseClient';
import { Client, Item, Alias, Quote, QuoteItem, QuoteWithItems, NewWorkHoursInput, Reminder, NewReminderInput, Employee, WorkHours, MonthlyReport } from '../types';

// ---------- Clients ----------
export const clientsAPI = {
  getAll: async (): Promise<Client[]> => {
    const { data, error } = await getSupabaseClient()
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  create: async (client: Omit<Client, 'id' | 'created_at'>): Promise<{ id: number; message: string }> => {
    const { data, error } = await getSupabaseAdmin()
      .from('clients')
      .insert([client])
      .select('id')
      .single();
    
    if (error) throw error;
    return { id: data.id, message: 'Client created successfully' };
  },
};

// ---------- Items ----------
export const itemsAPI = {
  getAll: async (): Promise<Item[]> => {
    const { data, error } = await getSupabaseClient()
      .from('items')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  search: async (query: string): Promise<Item[]> => {
    const { data, error } = await getSupabaseClient()
      .from('items')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  create: async (payload: {
    name: string;
    description?: string;
    price: number;
  }): Promise<Item> => {
    const { data, error } = await getSupabaseAdmin()
      .from('items')
      .insert([payload])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },
};

// ---------- Aliases ----------
export const aliasesAPI = {
  getAll: async (): Promise<Alias[]> => {
    const { data, error } = await getSupabaseClient()
      .from('aliases')
      .select('*')
      .order('alias');
    
    if (error) throw error;
    return data || [];
  },

  create: async (payload: {
    alias: string;
    item_name: string;
    price_override?: number | null;
  }): Promise<Alias> => {
    const { data, error } = await getSupabaseAdmin()
      .from('aliases')
      .insert([payload])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },
};

// ---------- Quotes ----------
export const quotesAPI = {
  getAll: async (): Promise<Quote[]> => {
    const { data, error } = await getSupabaseClient()
      .from('quotes')
      .select(`
        *,
        clients!inner (
          name,
          company,
          phone,
          company_id
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to match the expected format
    return (data || []).map((quote: any) => ({
      ...quote,
      client_name: quote.clients?.name,
      client_company: quote.clients?.company,
      client_phone: quote.clients?.phone,
      client_company_id: quote.clients?.company_id,
    }));
  },

  getById: async (id: number): Promise<QuoteWithItems> => {
    // Get quote with client info
    const { data: quoteData, error: quoteError } = await getSupabaseClient()
      .from('quotes')
      .select(`
        *,
        clients!inner (
          name,
          company,
          phone,
          company_id
        )
      `)
      .eq('id', id)
      .single();
    
    if (quoteError) throw quoteError;

    // Get quote items
    const { data: itemsData, error: itemsError } = await getSupabaseClient()
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .order('id', { ascending: true }); // חזרה ל-id עד שהעמודה sort_order תהיה זמינה
    
    if (itemsError) throw itemsError;

    return {
      quote: {
        ...quoteData,
        client_name: quoteData.clients?.name,
        client_company: quoteData.clients?.company,
        client_phone: quoteData.clients?.phone,
        client_company_id: quoteData.clients?.company_id,
      },
      items: itemsData || [],
    };
  },

  create: async (quote: Quote, items: QuoteItem[]): Promise<{ id: number; message: string }> => {
    // Insert quote
    const { data: quoteData, error: quoteError } = await getSupabaseAdmin()
      .from('quotes')
      .insert([{
        client_id: quote.client_id,
        event_name: quote.event_name,
        event_date: quote.event_date,
        event_hours: quote.event_hours,
        special_notes: quote.special_notes,
        discount_percent: quote.discount_percent,
        total_before_discount: quote.total_before_discount,
        discount_amount: quote.discount_amount,
        total_after_discount: quote.total_after_discount,
        vat_amount: quote.vat_amount,
        final_total: quote.final_total,
      }])
      .select('id')
      .single();
    
    if (quoteError) throw quoteError;

    // Insert quote items
    const itemsWithQuoteId = items.map(item => ({
      ...item,
      quote_id: quoteData.id,
    }));

    const { error: itemsError } = await getSupabaseAdmin()
      .from('quote_items')
      .insert(itemsWithQuoteId);
    
    if (itemsError) throw itemsError;

    return { id: quoteData.id, message: 'Quote created successfully' };
  },

  parseText: async (text: string): Promise<{
    items: QuoteItem[];
    unknown: Array<{
      line: string;
      quantity: number;
      raw_text: string;
      unit_price: number | null;
    }>;
  }> => {
    // This is a simplified version - in a real app you'd want to implement text parsing
    // For now, we'll return empty arrays
    return {
      items: [],
      unknown: [],
    };
  },

  exportPDF: async (quoteId: number): Promise<Blob> => {
    // This would need to be implemented as a Supabase Edge Function
    // For now, we'll throw an error
    throw new Error('PDF export not implemented yet');
  },

  remove: async (id: number): Promise<{ ok: boolean }> => {
    const { error } = await getSupabaseAdmin()
      .from('quotes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { ok: true };
  },

  addSplit: async (quoteId: number, itemIndex: number, splitType: string): Promise<{ ok: boolean }> => {
    // יצירת פריט פיצול חדש - פשוט יותר עד שהעמודה parent_item_id תהיה זמינה
    const splitItem = {
      quote_id: quoteId,
      item_name: `פיצול ${splitType}`,
      item_description: '',
      unit_price: 0,
      quantity: 1,
      discount: 0,
      total: 0
    };

    const { error } = await getSupabaseAdmin()
      .from('quote_items')
      .insert([splitItem]);
    
    if (error) throw error;
    return { ok: true };
  },

  deleteSplit: async (quoteId: number, splitName: string): Promise<{ ok: boolean }> => {
    // מחיקת פיצול לפי שם הפיצול והצעה
    const { error } = await getSupabaseAdmin()
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId)
      .eq('item_name', splitName);
    
    if (error) throw error;
    return { ok: true };
  },
};

// ---------- Employees ----------
export const employeesAPI = {
  getAll: async (): Promise<Employee[]> => {
    const { data, error } = await getSupabaseClient()
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
      
  getCurrentUserEmployee: async (): Promise<Employee | null> => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) return null;

    const { data, error } = await getSupabaseClient()
      .from('employees')
      .select('*')
      .eq('email', user.email)
      .single();
    
    if (error) return null;
    return data;
  },

  create: async (employee: {
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    hourly_rate: number;
    is_active?: boolean;
  }): Promise<Employee> => {
    const { data, error } = await getSupabaseAdmin()
      .from('employees')
      .insert([employee])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: number, body: Partial<{
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    hourly_rate: number;
    is_active?: boolean;
  }>): Promise<Employee> => {
    const { data, error } = await getSupabaseAdmin()
      .from('employees')
      .update(body)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const { error } = await getSupabaseAdmin()
      .from('employees')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },
};

// ---------- Work Hours ----------
export const workHoursAPI = {
  create: async (workHours: NewWorkHoursInput): Promise<WorkHours> => {
    const { data, error } = await getSupabaseAdmin()
      .from('work_hours')
      .insert([workHours])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  getByEmployee: async (employeeId: number, startDate: string, endDate: string): Promise<WorkHours[]> => {
    const { data, error } = await getSupabaseClient()
      .from('work_hours')
      .select(`
        *,
        employees (
          name,
          hourly_rate
        )
      `)
      .eq('employee_id', employeeId)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date');
    
    if (error) throw error;
    return data || [];
  },
};

// ---------- Reports ----------
export const reportsAPI = {
  getMonthly: async (year: number, month: number): Promise<MonthlyReport> => {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    // Get work hours for the month
    const { data: workHoursData, error: workHoursError } = await getSupabaseClient()
      .from('work_hours')
      .select(`
        *,
        employees (
          name,
          hourly_rate
        )
      `)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date');

    if (workHoursError) throw workHoursError;

    // Get all employees
    const { data: employeesData, error: employeesError } = await getSupabaseClient()
      .from('employees')
      .select('*')
      .eq('is_active', true);

    if (employeesError) throw employeesError;

    // Calculate summary
    const workHours = workHoursData || [];
    const employees = employeesData || [];
    
    const summary = {
      total_hours: workHours.reduce((sum: number, wh: any) => sum + (wh.hours_worked || 0), 0),
      total_amount: workHours.reduce((sum: number, wh: any) => sum + (wh.total_amount || 0), 0),
      employee_count: employees.length,
    };

    return {
      work_hours: workHours,
      employees,
      summary,
    };
  },

  exportMonthlyPdf: async (year: number, month: number): Promise<Blob> => {
    // This would need to be implemented as a Supabase Edge Function
    throw new Error('PDF export not implemented yet');
  },
};

// ---------- Reminders ----------
export const remindersAPI = {
  getAll: async (): Promise<Reminder[]> => {
    const { data, error } = await getSupabaseClient()
      .from('reminders')
      .select(`
        *,
        quotes (
          event_name,
          event_date,
          special_notes
        )
      `)
      .order('reminder_date');
    
    if (error) throw error;
    return data || [];
  },

  getByQuote: async (quoteId: number): Promise<Reminder[]> => {
    const { data, error } = await getSupabaseClient()
      .from('reminders')
      .select('*')
      .eq('quote_id', quoteId)
      .order('reminder_date');
    
    if (error) throw error;
    return data || [];
  },

  create: async (reminder: NewReminderInput): Promise<Reminder> => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .insert([reminder])
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id: number, reminder: Partial<NewReminderInput>): Promise<Reminder> => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .update({ ...reminder, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id: number): Promise<{ success: boolean }> => {
    const { error } = await getSupabaseAdmin()
      .from('reminders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  },

  createAuto: async (quoteId: number): Promise<Reminder> => {
    // Create a default reminder for a quote
    const reminder: NewReminderInput = {
      quote_id: quoteId,
      reminder_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      reminder_type: 'email',
      email_addresses: [],
      message: 'Follow up on quote',
    };

    return remindersAPI.create(reminder);
  },

  getPending: async (): Promise<Reminder[]> => {
    const { data, error } = await getSupabaseClient()
      .from('reminders')
      .select(`
        *,
        quotes (
          event_name,
          event_date,
          special_notes
        )
      `)
      .eq('is_sent', false)
      .lte('reminder_date', new Date().toISOString())
      .order('reminder_date');
    
    if (error) throw error;
    return data || [];
  },

  markAsSent: async (id: number): Promise<Reminder> => {
    const { data, error } = await getSupabaseAdmin()
      .from('reminders')
      .update({ 
        is_sent: true, 
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  },
};
