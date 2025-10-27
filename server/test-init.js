const { initializeDatabase } = require('./initData.js');

console.log('🚀 מתחיל לבדוק...');

initializeDatabase()
  .then(() => {
    console.log('✅ סיום מוצלח!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ שגיאה:', err.message);
    console.error('פרטים:', err);
    process.exit(1);
  });




