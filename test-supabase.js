const { dbFunctions } = require('./server/supabase-database');

async function testSupabaseConnection() {
  console.log('🧪 בודק חיבור ל-Supabase...');
  
  try {
    // בדיקת חיבור - קבלת פריטים
    console.log('📦 בודק קבלת פריטים...');
    const items = await dbFunctions.getAllItems();
    console.log(`✅ התקבלו ${items.length} פריטים`);
    
    // בדיקת חיבור - קבלת לקוחות
    console.log('👥 בודק קבלת לקוחות...');
    const clients = await dbFunctions.getAllClients();
    console.log(`✅ התקבלו ${clients.length} לקוחות`);
    
    // בדיקת חיבור - קבלת כינויים
    console.log('🏷️ בודק קבלת כינויים...');
    const aliases = await dbFunctions.getAllAliases();
    console.log(`✅ התקבלו ${aliases.length} כינויים`);
    
    // בדיקת חיבור - קבלת הצעות מחיר
    console.log('📄 בודק קבלת הצעות מחיר...');
    const quotes = await dbFunctions.getAllQuotes();
    console.log(`✅ התקבלו ${quotes.length} הצעות מחיר`);
    
    console.log('🎉 כל הבדיקות עברו בהצלחה! Supabase מחובר ופועל.');
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת החיבור:', error.message);
    console.error('פרטים נוספים:', error);
  }
}

// הרצת הבדיקה
testSupabaseConnection();
