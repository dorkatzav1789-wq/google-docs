const { dbFunctions } = require('./supabase-database.js');

async function checkData() {
  console.log('📊 בודק נתונים...');
  
  try {
    const items = await dbFunctions.getAllItems();
    console.log('📦 פריטים:', items.length);
    
    const clients = await dbFunctions.getAllClients();
    console.log('👥 לקוחות:', clients.length);
    
    const aliases = await dbFunctions.getAllAliases();
    console.log('🏷️ כינויים:', aliases.length);
    
    const employees = await dbFunctions.getAllEmployees();
    console.log('👷 עובדים:', employees.length);
    
    console.log('✅ כל הנתונים נטענו בהצלחה!');
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

checkData();



