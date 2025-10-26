const { supabase } = require('./supabase-database.js');

async function clearTestData() {
  console.log('🗑️ מוחק פריט בדיקה...');
  
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('name', 'פריט בדיקה');
    
    if (error) throw error;
    
    console.log('✅ פריט בדיקה נמחק');
    
    // נבדוק כמה פריטים נשארו
    const { data: items } = await supabase.from('items').select('count');
    console.log('📦 נשארו', items?.length || 0, 'פריטים');
    
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
  }
}

clearTestData();



