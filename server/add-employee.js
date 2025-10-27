const { dbFunctions } = require('./supabase-database.js');

async function addEmployee() {
  console.log('👷 מוסיף עובד לדוגמה...');
  
  try {
    const employee = await dbFunctions.addEmployee({
      first_name: 'דור',
      last_name: 'קצב',
      phone: '052-489-1025',
      email: 'Dor.katzav.valley@gmail.com',
      hourly_rate: 100, // 800 שקל ליום = 100 שקל לשעה
      is_active: true
    });
    
    console.log('✅ עובד נוסף בהצלחה!', employee);
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

addEmployee();





