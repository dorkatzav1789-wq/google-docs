const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// פרטי החיבור ל-Supabase
const supabaseUrl = 'https://nxukhhhdkuhdxmwbqmfr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dWtoaGhka3VoZHhtd2JxbWZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTg1MDgwOSwiZXhwIjoyMDcxNDI2ODA5fQ.yhWr-A0oZ1jmWJ3tWSfhCG8WEwrghNgNZDDZubyNlfI';

// יצירת לקוח Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// חיבור ל-SQLite
const dbPath = path.join(__dirname, 'server/quotes.db');
const db = new sqlite3.Database(dbPath);

// פונקציה לקריאת נתונים מ-SQLite
function getDataFromSQLite(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// פונקציה להעברת נתונים ל-Supabase
async function migrateData() {
  console.log('🚀 מתחיל העברת נתונים ל-Supabase...');
  
  try {
    // העברת פריטים
    console.log('📦 מעביר פריטים...');
    const items = await getDataFromSQLite('items');
    if (items.length > 0) {
      const { error } = await supabase
        .from('items')
        .insert(items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          created_at: item.created_at
        })));
      
      if (error) {
        console.error('❌ שגיאה בהעברת פריטים:', error);
      } else {
        console.log(`✅ הועברו ${items.length} פריטים`);
      }
    }

    // העברת לקוחות
    console.log('👥 מעביר לקוחות...');
    const clients = await getDataFromSQLite('clients');
    if (clients.length > 0) {
      const { error } = await supabase
        .from('clients')
        .insert(clients.map(client => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          company: client.company,
          company_id: client.company_id,
          created_at: client.created_at
        })));
      
      if (error) {
        console.error('❌ שגיאה בהעברת לקוחות:', error);
      } else {
        console.log(`✅ הועברו ${clients.length} לקוחות`);
      }
    }

    // העברת כינויים
    console.log('🏷️ מעביר כינויים...');
    const aliases = await getDataFromSQLite('aliases');
    if (aliases.length > 0) {
      const { error } = await supabase
        .from('aliases')
        .insert(aliases.map(alias => ({
          id: alias.id,
          alias: alias.alias,
          item_name: alias.item_name,
          price_override: alias.price_override,
          created_at: alias.created_at
        })));
      
      if (error) {
        console.error('❌ שגיאה בהעברת כינויים:', error);
      } else {
        console.log(`✅ הועברו ${aliases.length} כינויים`);
      }
    }

    // העברת הצעות מחיר
    console.log('📄 מעביר הצעות מחיר...');
    const quotes = await getDataFromSQLite('quotes');
    if (quotes.length > 0) {
      const { error } = await supabase
        .from('quotes')
        .insert(quotes.map(quote => ({
          id: quote.id,
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
          created_at: quote.created_at
        })));
      
      if (error) {
        console.error('❌ שגיאה בהעברת הצעות מחיר:', error);
      } else {
        console.log(`✅ הועברו ${quotes.length} הצעות מחיר`);
      }
    }

    // העברת פריטי הצעות מחיר
    console.log('📋 מעביר פריטי הצעות מחיר...');
    const quoteItems = await getDataFromSQLite('quote_items');
    if (quoteItems.length > 0) {
      const { error } = await supabase
        .from('quote_items')
        .insert(quoteItems.map(item => ({
          id: item.id,
          quote_id: item.quote_id,
          item_name: item.item_name,
          item_description: item.item_description,
          unit_price: item.unit_price,
          quantity: item.quantity,
          discount: item.discount,
          total: item.total
        })));
      
      if (error) {
        console.error('❌ שגיאה בהעברת פריטי הצעות מחיר:', error);
      } else {
        console.log(`✅ הועברו ${quoteItems.length} פריטי הצעות מחיר`);
      }
    }

    console.log('✅ העברת הנתונים הושלמה בהצלחה!');
    
  } catch (error) {
    console.error('❌ שגיאה בהעברת נתונים:', error);
  } finally {
    db.close();
  }
}

// הרצת ההעברה
migrateData();

