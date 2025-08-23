const { createClient } = require('@supabase/supabase-js');

// פרטי החיבור ל-Supabase
const supabaseUrl = 'https://nxukhhhdkuhdxmwbqmfr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWtoaGhka3VoZHhtd2JxbWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg1MDgwOSwiZXhwIjoyMDcxNDI2ODA5fQ.yhWr-A0oZ1jmWJ3tWSfhCG8WEwrghNgNZDDZubyNlfI';

// יצירת לקוח Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// פונקציות עזר
const dbFunctions = {
  // הוספת פריט למחירון
  addItem: async (name, description, price) => {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([{ name, description, price }])
        .select();
      
      if (error) throw error;
      return data[0].id;
    } catch (error) {
      throw error;
    }
  },
  // ===== מחיקת הצעת מחיר =====
  deleteQuote: async (id) => {
    try {
      // מוחק קודם את הפריטים
      const { error: itemsError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);
      if (itemsError) throw itemsError;

      // מוחק את ההצעה עצמה
      const { error: quoteError } = await supabase
          .from('quotes')
          .delete()
          .eq('id', id);
      if (quoteError) throw quoteError;

      return true;
    } catch (error) {
      throw error;
    }
  },


  // קבלת כל הפריטים
  getAllItems: async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // הוספת כינוי
  addAlias: async (alias, itemName, priceOverride = null) => {
    try {
      const { data, error } = await supabase
        .from('aliases')
        .insert([{ alias, item_name: itemName, price_override: priceOverride }])
        .select();
      
      if (error) throw error;
      return data[0].id;
    } catch (error) {
      throw error;
    }
  },

  // קבלת כל הכינויים
  getAllAliases: async () => {
    try {
      const { data, error } = await supabase
        .from('aliases')
        .select('*')
        .order('alias');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // הוספת לקוח
  addClient: async (name, phone, company, companyId) => {
    const { data, error } = await supabase
        .from('clients')
        .insert([{ name, phone, company, company_id: companyId }])
        .select()
        .single(); // מחזיר שורה אחת או טעות

    if (error) {
      // לוג מפורט יעזור:
      console.error('Supabase addClient error:', error);
      throw error; // לשרת יגיעו message/details/hint/code
    }
    if (!data) {
      throw new Error('Insert succeeded but no row returned');
    }
    return data.id;
  },


  // קבלת כל הלקוחות
  getAllClients: async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // שמירת הצעת מחיר
  saveQuote: async (quoteData) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          client_id: quoteData.client_id,
          event_name: quoteData.event_name,
          event_date: quoteData.event_date,
          event_hours: quoteData.event_hours,
          special_notes: quoteData.special_notes,
          discount_percent: quoteData.discount_percent,
          total_before_discount: quoteData.total_before_discount,
          discount_amount: quoteData.discount_amount,
          total_after_discount: quoteData.total_after_discount,
          vat_amount: quoteData.vat_amount,
          final_total: quoteData.final_total
        }])
        .select();
      
      if (error) throw error;
      return data[0].id;
    } catch (error) {
      throw error;
    }
  },

  // שמירת פריטי הצעה
  saveQuoteItems: async (quoteId, items) => {
    try {
      const itemsToInsert = items.map(item => ({
        quote_id: quoteId,
        item_name: item.name,
        item_description: item.description,
        unit_price: item.unit_price,
        quantity: item.quantity,
        discount: item.discount,
        total: item.total
      }));

      const { error } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);
      
      if (error) throw error;
      return quoteId;
    } catch (error) {
      throw error;
    }
  },

  // קבלת כל הצעות המחיר
  getAllQuotes: async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // עיבוד הנתונים לפורמט הרצוי
      return (data || []).map(quote => ({
        ...quote,
        client_name: quote.clients?.name,
        client_company: quote.clients?.company
      }));
    } catch (error) {
      throw error;
    }
  },

  // קבלת הצעת מחיר לפי ID
  getQuoteById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          clients!inner(name, phone, company, company_id)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // עיבוד הנתונים לפורמט הרצוי
      return {
        ...data,
        client_name: data.clients?.name,
        client_phone: data.clients?.phone,
        client_company: data.clients?.company,
        client_company_id: data.clients?.company_id
      };
    } catch (error) {
      throw error;
    }
  },

  // קבלת פריטי הצעת מחיר
  getQuoteItems: async (quoteId) => {
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // חיפוש פריטים
  searchItems: async (searchTerm) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      
      if (itemsError) throw itemsError;

      const { data: aliases, error: aliasesError } = await supabase
        .from('aliases')
        .select('*')
        .ilike('alias', `%${searchTerm}%`);
      
      if (aliasesError) throw aliasesError;

      // עיבוד התוצאות
      const results = [...(items || [])];
      
      if (aliases && aliases.length > 0) {
        for (const alias of aliases) {
          const originalItem = items?.find(item => item.name === alias.item_name);
          if (originalItem) {
            results.push({
              ...originalItem,
              price: alias.price_override || originalItem.price,
              matched_alias: alias.alias
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  },

  // ===== פונקציות לעובדים =====
// dbFunctions.addEmployee
  addEmployee: async (employeeData) => {
    try {
      // כאן employeeData כבר מנורמל לפי הראוט
      const { data, error } = await supabase
          .from('employees')
          .insert([employeeData])
          .select()
          .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase addEmployee error:', error);
      throw error;
    }
  },

  getAllEmployees: async () => {
    try {
      const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, phone, email, hourly_rate, is_active, created_at')
          .order('first_name', { ascending: true })
          .order('last_name',  { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },


  updateEmployee: async (id, employeeData) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  },

  // ===== פונקציות לשעות עבודה =====
  addWorkHours: async (workHoursData) => {
    try {
      const { data, error } = await supabase
        .from('work_hours')
        .insert([workHoursData])
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  getWorkHoursByEmployee: async (employeeId, startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('work_hours')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

// ===== getMonthlyReport: בחירה לפי טווח תאריכים, לא EXTRACT =====
  getMonthlyReport: async (year, month) => {
    try {
      const y = Number(year);
      const m = Number(month);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end   = new Date(Date.UTC(y, m, 1));

      const startStr = start.toISOString().slice(0, 10); // YYYY-MM-DD
      const endStr   = end.toISOString().slice(0, 10);   // YYYY-MM-DD

      // אם יש לכם foreign key employees(id) ומוגדר relationship בשם employees
      const { data, error } = await supabase
          .from('work_hours')
          .select(`
        id,
        employee_id,
        work_date,
        hours_worked,
        hourly_rate,
        daily_total,
        notes,
        employees(name, hourly_rate)
      `)
          .gte('work_date', startStr)
          .lt('work_date', endStr)
          .order('work_date');

      if (error) throw error;

      const workHours = Array.isArray(data) ? data : [];

      const total_hours  = workHours.reduce((s, wh) => s + Number(wh.hours_worked || 0), 0);
      const total_amount = workHours.reduce((s, wh) => s + Number(wh.daily_total  || 0), 0);
      const employee_count = new Set(
          workHours.map(wh => (wh.employees?.name || wh.employee_id))
      ).size;

      return {
        work_hours: workHours,
        summary: { total_hours, total_amount, employee_count }
      };
    } catch (err) {
      throw err;
    }
  },
}

module.exports = { supabase, dbFunctions };

