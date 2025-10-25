const { createClient } = require('@supabase/supabase-js');

// פרטי החיבור ל-Supabase
const supabaseUrl = 'https://nykeobeablrlgdjvhoud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWtoaGhka3VoZHhtd2JxbWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg1MDgwOSwiZXhwIjoyMDcxNDI2ODA5fQ.yhWr-A0oZ1jmWJ3tWSfhCG8WEwrghNgNZDDZubyNlfI';

// יצירת לקוח Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// פונקציות עזר
const dbFunctions = {
  // הוספת פריט למחירון
  addItem: async (name, description, price) => {
    try {
      // Upsert לפי name כדי למנוע כפילויות ולתמוך ב-create-if-not-exists
      const { data, error } = await supabase
        .from('items')
        .upsert(
          [{ name, description, price }],
          { onConflict: 'name' }
        )
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      throw error;
    }
  },
  // ===== מחיקת הצעת מחיר =====
  deleteQuote: async (id) => {
    try {
      // מוחק קודם את הפריטים
      const {error: itemsError} = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);
      if (itemsError) throw itemsError;

      // מוחק את ההצעה עצמה
      const {error: quoteError} = await supabase
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
      const {data, error} = await supabase
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
      const {data, error} = await supabase
          .from('aliases')
          .insert([{alias, item_name: itemName, price_override: priceOverride}])
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
      const {data, error} = await supabase
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
    const {data, error} = await supabase
        .from('clients')
        .insert([{name, phone, company, company_id: companyId}])
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
      const {data, error} = await supabase
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
      const {data, error} = await supabase
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

      const {error} = await supabase
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
      const {data, error} = await supabase
          .from('quotes')
          .select(`
          *,
          clients!inner(name, company)
        `)
          .order('created_at', {ascending: false});

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
      const {data, error} = await supabase
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
      const {data, error} = await supabase
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
      const {data: items, error: itemsError} = await supabase
          .from('items')
          .select('*')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (itemsError) throw itemsError;

      const {data: aliases, error: aliasesError} = await supabase
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
      const {data, error} = await supabase
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

  getUserByEmail: async (email) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  getEmployeeByEmail: async (email) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  getAllEmployees: async () => {
    try {
      const {data, error} = await supabase
          .from('employees')
          .select('id, first_name, last_name, phone, email, hourly_rate, is_active, created_at')
          .order('first_name', {ascending: true})
          .order('last_name', {ascending: true});

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },


  updateEmployee: async (id, employeeData) => {
    try {
      const {data, error} = await supabase
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

  deleteEmployee: async (id) => {
    try {
      // מחיקת שעות העבודה של העובד
      const {error: workHoursError} = await supabase
          .from('work_hours')
          .delete()
          .eq('employee_id', id);
      
      if (workHoursError) throw workHoursError;

      // מחיקת העובד עצמו
      const {error: employeeError} = await supabase
          .from('employees')
          .delete()
          .eq('id', id);

      if (employeeError) throw employeeError;

      return true;
    } catch (error) {
      throw error;
    }
  },

  // ===== פונקציות לשעות עבודה =====
  addWorkHours: async (workHoursData) => {
    try {
      const {data, error} = await supabase
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
      const {data, error} = await supabase
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
  getMonthlyReport: async (year, month, employeeId = null) => {
    try {
      // טווח חודש [start, end)
      const mm = String(month).padStart(2, '0');
      const start = `${year}-${mm}-01`;
      const endDate = new Date(Date.UTC(year, month, 0)); // Last day of the current month
      const end = endDate.toISOString().slice(0, 10);

      console.log('Monthly report date range:', { start, end });

      // 1) מביאים שעות עבודה לחודש
      let query = supabase
          .from('work_hours')
          .select('id, employee_id, work_date, hours_worked, hourly_rate, daily_total, overtime_amount, notes, event_type')
          .gte('work_date', start)
          .lte('work_date', end);

      // Add employee filter if specified
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const {data: wh, error: whErr} = await query.order('work_date', {ascending: true});

      if (whErr) {
        console.error('Error fetching work hours:', whErr);
        throw whErr;
      }

      console.log('Work hours data:', wh);

      const workHours = wh || [];

      // אם אין נתונים – מחזירים סיכום ריק
      if (workHours.length === 0) {
        return {
          work_hours: [],
          employees: [],
          summary: {total_hours: 0, daily_total: 0, employee_count: 0}
        };
      }

      // 2) מביאים את העובדים הרלוונטיים בשאילתה אחת
      const ids = Array.from(new Set(workHours.map(r => r.employee_id))).filter(Boolean);
              const {data: emps, error: empErr} = await supabase
            .from('employees')
            .select('id, first_name, last_name, hourly_rate')
            .in('id', ids);

      if (empErr) throw empErr;

      const byId = new Map((emps || []).map(e => [e.id, e]));
          const fullName = (e) => {
      if (!e) return null;
      const fn = (e.first_name || '').trim();
      const ln = (e.last_name || '').trim();
      const combined = `${fn} ${ln}`.trim();
      return combined || null;
    };

      // 3) מחברים שם עובד ושכר יומי לתוצאה, כפי שהפרונט מצפה
      const enriched = workHours.map(row => {
        const emp = byId.get(row.employee_id);
        return {
          ...row,
          employees: emp ? {name: fullName(emp), hourly_rate: emp.hourly_rate} : null,
          employee_name: emp ? fullName(emp) : null,
        };
      });

      // 4) סיכומים
      const summary = {
        total_hours: enriched.reduce((s, r) => s + Number(r.hours_worked || 0), 0),
        daily_total: enriched.reduce((s, r) => s + Number(r.daily_total || 0), 0),
        employee_count: ids.length,
      };

      return {
        work_hours: enriched,
        employees: emps || [],
        summary
      };
    } catch (error) {
      console.error('getMonthlyReport error:', error);
      throw error;
    }
  },

  // ===== פונקציות לתזכורות =====
  // הוספת תזכורת
  addReminder: async (reminderData) => {
    try {
      const {data, error} = await supabase
          .from('reminders')
          .insert([reminderData])
          .select()
          .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Supabase addReminder error:', error);
      throw error;
    }
  },

  // קבלת כל התזכורות
  getAllReminders: async () => {
    try {
      const {data, error} = await supabase
          .from('reminders')
          .select(`
            *,
            quotes(event_name, event_date)
          `)
          .order('reminder_date', {ascending: true});

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // קבלת תזכורות לפי הצעת מחיר
  getRemindersByQuote: async (quoteId) => {
    try {
      const {data, error} = await supabase
          .from('reminders')
          .select('*')
          .eq('quote_id', quoteId)
          .order('reminder_date', {ascending: true});

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // עדכון תזכורת
  updateReminder: async (id, reminderData) => {
    try {
      const {data, error} = await supabase
          .from('reminders')
          .update({
            ...reminderData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  // מחיקת תזכורת
  deleteReminder: async (id) => {
    try {
      const {error} = await supabase
          .from('reminders')
          .delete()
          .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  },

  // קבלת תזכורות שצריכות להישלח (72 שעות לפני האירוע)
  getPendingReminders: async () => {
    try {
      const now = new Date();
      
      const {data, error} = await supabase
          .from('reminders')
          .select(`
            *,
            quotes(event_name, event_date, special_notes)
          `)
          .eq('is_sent', false)
          .gte('reminder_date', now.toISOString())
          .order('reminder_date', {ascending: true});

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  },

  // סימון תזכורת כנשלחה
  markReminderAsSent: async (id) => {
    try {
      const {data, error} = await supabase
          .from('reminders')
          .update({
            is_sent: true,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },

  // יצירת תזכורת אוטומטית עבור הצעת מחיר
  createAutoReminder: async (quoteId, eventDate) => {
    try {
      // חישוב תאריך התזכורת (72 שעות לפני האירוע)
      const eventDateTime = new Date(eventDate);
      const reminderDateTime = new Date(eventDateTime.getTime() - (72 * 60 * 60 * 1000));
      
      // בדיקה אם כבר קיימת תזכורת עבור הצעה זו
      const existingReminders = await dbFunctions.getRemindersByQuote(quoteId);
      if (existingReminders.length > 0) {
        return null; // כבר קיימת תזכורת
      }

      const reminderData = {
        quote_id: quoteId,
        reminder_date: reminderDateTime.toISOString(),
        reminder_type: 'email',
        email_addresses: [], // יועבר מהפרונט
        message: null, // יועבר מהפרונט או יוגדר אוטומטית
        is_sent: false
      };

      return await dbFunctions.addReminder(reminderData);
    } catch (error) {
      console.error('createAutoReminder error:', error);
      throw error;
    }
  },
}
module.exports = { supabase, dbFunctions };

