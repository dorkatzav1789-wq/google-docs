const { dbFunctions } = require('./supabase-database.js');

async function testConnection() {
  console.log('🔍 בודק חיבור...');
  
  try {
    const items = await dbFunctions.getAllItems();
    console.log('✅ חיבור עובד! נמצאו', items.length, 'פריטים');
    
    if (items.length === 0) {
      console.log('📦 אין פריטים - צריך לטעון נתונים');
      
      // ננסה לטעון פריט אחד
      console.log('🧪 מנסה לטעון פריט לדוגמה...');
      const itemId = await dbFunctions.addItem('פריט בדיקה', 'פריט לבדיקה', 100);
      console.log('✅ פריט נוסף בהצלחה! ID:', itemId);
      
      // נבדוק שוב
      const itemsAfter = await dbFunctions.getAllItems();
      console.log('📊 עכשיו יש', itemsAfter.length, 'פריטים');
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    console.error('פרטים:', error);
  }
}

testConnection();


