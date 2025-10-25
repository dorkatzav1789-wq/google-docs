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

    console.log('Raw itemsData from DB:', itemsData); // לוג לבדיקה

    const mappedItems = (itemsData || []).map((item: any) => {
      console.log('Mapping item from DB:', { 
        id: item.id,
        item_name: item.item_name, 
        item_description: item.item_description,
        unit_price: item.unit_price 
      }); // לוג לבדיקה
      return {
        id: item.id,
        name: item.item_name,
        description: item.item_description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount,
        total: item.total,
      };
    });

    console.log('Final mapped items:', mappedItems); // לוג לבדיקה
    console.log('About to return from getById'); // לוג לבדיקה

    return {
      quote: {
        ...quoteData,
        client_name: quoteData.clients?.name,
        client_company: quoteData.clients?.company,
        client_phone: quoteData.clients?.phone,
        client_company_id: quoteData.clients?.company_id,
        extra_vat_discount_percent: quoteData.extra_vat_discount_percent ?? 0,
        extra_vat_discount_amount: quoteData.extra_vat_discount_amount ?? 0,
      },
      items: mappedItems,
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
        extra_vat_discount_percent: quote.extra_vat_discount_percent ?? 0,
        extra_vat_discount_amount: quote.extra_vat_discount_amount ?? 0,
      }])
      .select('id')
      .single();
    
    if (quoteError) throw quoteError;

    // Insert quote items
    console.log('Items to insert:', items); // לוג לבדיקה
    const itemsWithQuoteId = items.map(item => {
      console.log('Mapping item:', { name: item.name, description: item.description }); // לוג לבדיקה
      return {
        item_name: item.name || 'שם לא זמין',
        item_description: item.description || 'תיאור לא זמין',
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount,
        total: item.total,
        quote_id: quoteData.id,
      };
    });

    const { error: itemsError } = await getSupabaseAdmin()
      .from('quote_items')
      .insert(itemsWithQuoteId);
    
    if (itemsError) throw itemsError;

    return { id: quoteData.id, message: 'Quote created successfully' };
  },

  update: async (id: number, body: Partial<Quote>): Promise<Quote> => {
    const { data, error } = await getSupabaseAdmin()
      .from('quotes')
      .update(body)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Quote;
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
    // פירוש טקסט בפורמט: כמות שם_פריט מחיר|
    const lines = text.trim().split('\n').filter(line => line.trim());
    const items: QuoteItem[] = [];
    const unknown: Array<{
      line: string;
      quantity: number;
      raw_text: string;
      unit_price: number | null;
    }> = [];

    // קבלת כל הפריטים מהקטלוג
    const allItems = await itemsAPI.getAll();
    
    // קבלת כל ה-aliases
    const allAliases = await aliasesAPI.getAll();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // פורמט: כמות שם_פריט מחיר| או שם_פריט מחיר|
      const match = trimmedLine.match(/^(?:(\d+)\s+)?(.+?)\s+(\d+)\|?$/);
      
      if (match) {
        const quantity = match[1] ? parseInt(match[1]) : 1; // ברירת מחדל 1 אם לא כתבת כמות
        const name = match[2].trim();
        const unitPrice = parseInt(match[3]);
        
        // בדיקה אם זה alias
        const aliasMatch = allAliases.find(alias => 
          alias.alias.toLowerCase() === name.toLowerCase()
        );

        let existingItem;
        let finalPrice = unitPrice;

        if (aliasMatch) {
          // זה alias - מצא את הפריט המקושר
          existingItem = allItems.find(item => item.name === aliasMatch.item_name);
          
          // קביעת המחיר: מחיר שהמשתמש כתב > מחיר override של alias > מחיר קטלוג
          if (unitPrice > 0) {
            finalPrice = unitPrice;
          } else if (aliasMatch.price_override && aliasMatch.price_override > 0) {
            finalPrice = aliasMatch.price_override;
          } else if (existingItem) {
            finalPrice = existingItem.price;
          }

          if (existingItem) {
            items.push({
              name: existingItem.name, // השם הרשמי של הפריט
              description: existingItem.description, // התיאור הרשמי של הפריט
              unit_price: finalPrice,
              quantity: quantity,
              discount: 0,
              total: finalPrice * quantity,
            });
          } else {
            unknown.push({
              line: trimmedLine,
              quantity: quantity,
              raw_text: name,
              unit_price: unitPrice,
            });
          }
        } else {
          // לא alias - בדיקת פריט בקטלוג
          existingItem = allItems.find(item => 
            item.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(item.name.toLowerCase())
          );

          if (existingItem) {
            // פריט קיים - הוסף לרשימה
            items.push({
              name: existingItem.name,
              description: existingItem.description,
              unit_price: unitPrice,
              quantity: quantity,
              discount: 0,
              total: unitPrice * quantity,
            });
          } else {
            // פריט לא קיים - הוסף ל-unknown
            unknown.push({
              line: trimmedLine,
              quantity: quantity,
              raw_text: name,
              unit_price: unitPrice,
            });
          }
        }
      } else {
        // פורמט לא תקין - הוסף ל-unknown
        unknown.push({
          line: trimmedLine,
          quantity: 1,
          raw_text: trimmedLine,
          unit_price: null,
        });
      }
    }

    return {
      items,
      unknown,
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

  updateItem: async (itemId: number, updates: {
    item_name?: string;
    item_description?: string;
    unit_price?: number;
    quantity?: number;
    discount?: number;
    total?: number;
  }): Promise<{ ok: boolean }> => {
    const { error } = await getSupabaseAdmin()
      .from('quote_items')
      .update(updates)
      .eq('id', itemId);
    
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

  addItem: async (payload: {
    quote_id: number;
    item_name: string;
    item_description?: string;
    unit_price: number;
    quantity: number;
    discount?: number;
    total: number;
  }): Promise<{ id: number }> => {
    const { data, error } = await getSupabaseAdmin()
      .from('quote_items')
      .insert([{
        quote_id: payload.quote_id,
        item_name: payload.item_name,
        item_description: payload.item_description ?? '',
        unit_price: payload.unit_price,
        quantity: payload.quantity,
        discount: payload.discount ?? 0,
        total: payload.total,
      }])
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id };
  },

  deleteItem: async (itemId: number): Promise<{ ok: boolean }> => {
    const { error } = await getSupabaseAdmin()
      .from('quote_items')
      .delete()
      .eq('id', itemId);
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
  getMonthly: async (year: number, month: number, employeeId?: number | null): Promise<MonthlyReport> => {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    // Calculate the last day of the month properly
    const lastDay = new Date(year, month, 0).getDate(); // month is 1-based, so this gives us the last day of the previous month
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    // Build query with optional employee filter
    let query = getSupabaseClient()
      .from('work_hours')
      .select(`
        *,
        employees (
          first_name,
          last_name,
          hourly_rate
        )
      `)
      .gte('work_date', startDate)
      .lte('work_date', endDate);

    // Add employee filter if specified
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: workHoursData, error: workHoursError } = await query.order('work_date');

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
      daily_total: workHours.reduce((sum: number, wh: any) => sum + (wh.daily_total || 0), 0),
      employee_count: employees.length,
    };

    return {
      work_hours: workHours,
      employees,
      summary,
    };
  },

  exportMonthlyPdf: async (year: number, month: number, employeeId?: number | null): Promise<Blob> => {
    // Use the server API for PDF export
    const url = employeeId 
      ? `/api/reports/monthly/${year}/${month}/pdf?employeeId=${employeeId}`
      : `/api/reports/monthly/${year}/${month}/pdf`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('PDF export failed');
    }
    return response.blob();
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
