const axios = require('axios');

async function testAPI() {
  console.log('🧪 בודק API...');
  
  try {
    // בדיקת פריטים
    console.log('📦 בודק /api/items...');
    const itemsResponse = await axios.get('http://localhost:5000/api/items');
    console.log(`✅ התקבלו ${itemsResponse.data.length} פריטים`);
    
    // בדיקת לקוחות
    console.log('👥 בודק /api/clients...');
    const clientsResponse = await axios.get('http://localhost:5000/api/clients');
    console.log(`✅ התקבלו ${clientsResponse.data.length} לקוחות`);
    
    // בדיקת כינויים
    console.log('🏷️ בודק /api/aliases...');
    const aliasesResponse = await axios.get('http://localhost:5000/api/aliases');
    console.log(`✅ התקבלו ${aliasesResponse.data.length} כינויים`);
    
    console.log('🎉 ה-API עובד מצוין!');
    console.log('\n📋 סיכום:');
    console.log(`   Frontend: http://localhost:3000`);
    console.log(`   Backend API: http://localhost:5000/api/`);
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת API:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 וודא שהשרת רץ על פורט 5000');
    }
  }
}

testAPI();

