const { dbFunctions } = require('./supabase-database');

// הנתונים שלך
const itemsData = [
  { name: "דגדשג", description: "דשגשדג", price: 123 },
  { name: "תאורן", description: "מפעיל תאורה", price: 1500 },
  { name: "מסך אולם סוויט חלון אחד ללא רזולום", description: "פתיחת חלון אחד לטובת מצגות או סרטונים – מידות FULL HD 1920/1080,גודל 7X4 מטר, סורס HDMI אחד כולל מחשב מצגות+קליקר להעברת שקופיות - ללא מערכת רזולום", price: 2500 },
  { name: "מסך אולם SWEET חלון אחד ללא רזולום", description: "פתיחת חלון אחד לטובת מצגות או סרטונים – מידות FULL HD 1920/1080,גודל 7X4 מטר, סורס HDMI אחד כולל מחשב מצגות+קליקר להעברת שקופיות - ללא מערכת רזולום", price: 2500 },
  { name: "חרא", description: "חראי", price: 123 },
  { name: "תוספת מערכת רזולום+שדרוג למסך מלא סוויט", description: "שדרוג למסך מלא, תמונה או סרטון על כל המסך 5888/1024,גודל 23X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים", price: 2500 },
  { name: "תוספת מערכת רזולום+שדרוג למסך מלא SWEET", description: "שדרוג למסך מלא, תמונה או סרטון על כל המסך 5888/1024,גודל 23X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים", price: 2500 },
  { name: "מסך אולם גוי חלון אחד ללא רזולום", description: "פתיחת חלון אחד לטובת מצגות או סרטונים – מידות FULL HD 1920/1080, גודל 7X4 מטר, סורס HDMI אחד, כולל מחשב מצגות+קליקר להעברת שקופיות - ללא מערכת רזולום", price: 3000 },
  { name: "מסך אולם JOY חלון אחד", description: "פתיחת חלון אחד לטובת מצגות או סרטונים – מידות FULL HD 1920/1080, גודל 7X4 מטר, סורס HDMI אחד, כולל מחשב מצגות+קליקר להעברת שקופיות - ללא מערכת רזולום", price: 3000 },
  { name: "מסך 55 אינץ על סטנד רצפתי", description: "מסך 55\" על סטנד רצפתי בגב אולם לטובת פרומטר", price: 1500 },
  { name: "תוספת מערכת רזולום+שדרוג למסך מלא גוי", description: "שדרוג למסך מלא, תמונה או סרטון על כל המסך 9984/1024, גודל 40X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 3000 },
  { name: "תוספת מערכת רזולום+שדרוג למסך מלא JOY", description: "שדרוג למסך מלא, תמונה או סרטון על כל המסך 9984/1024, גודל 40X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 3000 },
  { name: "מסך אולם גוי פיצול A", description: "אולם A מידות 4000/1024, גודל 17X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 4000 },
  { name: "מסך אולם גוי פיצול B", description: "אולם B מידות 6000/1024, גודל 23X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 4000 },
  { name: "מסך אולם JOY פיצול A", description: "אולם A מידות 4000/1024, גודל 17X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 4000 },
  { name: "מסך אולם JOY פיצול B", description: "אולם B מידות 6000/1024, גודל 23X4 מטר, תוספת מערכת הפעלה רזולום, פתיחת חלונות והרצת וידאו על כל המסך, העלאת חומרים ממספר מרצים SOURCE 1", price: 4000 },
  { name: "טכנאי רזולום וסאונד", description: "טכנאי צמוד רזולום+סאונד", price: 2000 },
  { name: "טכנאי רזולום מקצועי", description: "מפעיל וידאו מקצועי", price: 2000 },
  { name: "טכנאי רזולום", description: "מפעיל וידאו מקצועי", price: 2000 },
  { name: "תצוגת מגיש 42 אינץ רצפתי", description: "מסך 42\" מוניטור לרצפת במה על סטנד בזווית 45 מעלות +2 מחשבים ברשת אחד פודיום אחד בעמדת קונטרול לטובת תצוגת מגיש Presentor view", price: 1000 },
  { name: "טיימר 42 אינץ רצפתי", description: "מסך 42\" מוניטור לרצפת במה בזווית 45 מעלות טיימר+מחשב", price: 1000 },
  { name: "תאורן מקצועי", description: "תאורן מקצועי", price: 2000 },
  { name: "פודיום דיגיטלי", description: "פודיום עם מסך 55\" מובנה בצורה אנכית בקדמת הפודיום, לטובת הצגה דיגיטאלית של שמות המרצים+מחשב להעברת שקופיות של שמות המרצים", price: 3000 },
  { name: "מסך 55 אינץ אינץ להקרנת תוכנית הכנס בכניסה לאולם", description: "", price: 1000 },
  { name: "הגברה 250 איש", description: "הגברה לכנס מתאים עד 200 איש, זוג רמקולים קולונה \"BOSE L1 Pro32\" בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, סאב של BOSE 600 WATT 15 inch, רביעיית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 2800 },
  { name: "הגברה 200 איש", description: "הגברה לכנס מתאים עד 200 איש, זוג רמקולים קולונה \"BOSE L1 Pro32\" בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, סאב של BOSE 600 WATT 15 inch, רביעיית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 2500 },
  { name: "הגברה 150 איש", description: "הגברה לכנס מתאים עד 150 איש בישיבת תיאטרון, זוג רמקולים \"BOSE S1 PRO 6.5inch 160 וואט\" בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, רביעיית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 1500 },
  { name: "כרטיס לכידה HDMI Magwell לחיבור Source נוסף למסך לד", description: "סורס נוסף כרטיס לוכד HDMI Magwell לטובת חיבור צלם וידאו למעגל סגור/מתמלל למסך/מפעיל VJ חיצוני", price: 1500 },
  { name: "הגברה 350 איש", description: "הגברה לכנס מתאים עד 350 איש, זוג רמקולים קולונה \"BOSE L1 Pro32\" בקידמת הבמה, זוג רמקולים S1 PRO של \"BOSE 8 פיזורים סייד פיל, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים,קומפרסור, סאב של BOSE 600 WATT , שמיניית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 3200 },
  { name: "הגברה 300 איש", description: "הגברה לכנס מתאים עד 300 איש, זוג רמקולים PA קולונה \"BOSE L1 Pro32\" בקידמת הבמה, רמקול פרונט פיל BOSE S1PRO, שני רמקולים היקפיים סייד פיל BOSE S1 PRO בצידי הקהל, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר, קומפרסור וחותך תדרים, זוג סאבים של BOSE 600 WATT 15inch, שמיניית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 3000 },
  { name: "הגברה 450 איש", description: "הגברה לכנס מתאים עד 450 איש, זוג רמקולים PA קולונה \"BOSE L1 Pro32\" בקידמת הבמה, רמקול פרונט פיל BOSE S1PRO, שני רמקולים היקפיים סייד פיל BOSE S1 PRO בצידי הקהל, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר, קומפרסור וחותך תדרים, זוג סאבים של BOSE 600 WATT 15inch, שמיניית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 4250 },
  { name: "הגברה 400 איש", description: "הגברה לכנס מתאים עד 400 איש, זוג רמקולים קולונה \"BOSE L1 Pro32\" בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, סאב של BOSE 600 WATT 15inch, זוג רמקולים סייד פיל BOSE S1 PRO 6.5inch\", רביעיית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, רמקול מוניטור BOSE S1 PRO 6.5inch,כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 3900 },
  { name: "הגברה 500 איש", description: "הגברה לכנס מתאים עד 500 איש, רביעיית רמקולים קולונה \"BOSE L1 Pro32\" בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, זוג סאבים של BOSE 600 WATT 15\", זוג רמקולים סייד פיל \"BOSE S1 PRO 6.5\", שמיניית רמקולים אחוריים EV 10\", מיקרופון חוטי 1 SM-58, רמקול מוניטור BOSE S1 PRO 6.5\",כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 5000 },
  { name: "הגברה מעל 500 איש (מתאים עד 1000 אורחים)", description: "הגברה לכנס מתאים עד 1000 איש, רביעיית רמקולים קולונה BOSE L1 Pro32 בקידמת הבמה, מיקסר דיגיטלי SoundCraft ui 16 כולל איקיולייזר וחותך תדרים, רביעיית סאבים של BOSE 600 WATT 15inch, זוג רמקולים סייד פיל 160 וואט BOSE S1 PRO 6.5inch, שמיניית רמקולים אחוריים EV 10inch, מיקרופון חוטי 1 SM-58, רמקול מוניטור BOSE S1 PRO 6.5inch, רמקול פרונט פיל BOSE S1 PRO 6.5 , כרטיס קול לחיבור מחשב למערכת PA, הרצת סרטים, מוזיקת רקע קבלת פנים.", price: 6500 },
  { name: "תוספת הגברה למעל 500 איש", description: "שישיית רמקולים היקפיים אחוריים ElectroVoice 10inch", price: 1000 },
  { name: "מדונה צבע גוף", description: "מדונה Mipro אלחוטי צבע גוף כולל משדר", price: 500 },
  { name: "מיקרופון אלחוטי", description: "מיקרופון אלחוטי Mipro ACT 580 כולל משדר", price: 400 },
  { name: "2 מחשבים ברשת קונטרול+פודיום Presentor view", description: "2 מחשבים ברשת, אחד בעמדת הקונטרול ואחד על הפודיום לטובת תצוגת מגיש Presentor view", price: 500 },
  { name: "טכנאי בקליין", description: "טכנאי בקליין צמוד לכל האירוע", price: 1500 },
  { name: "בקליינר", description: "טכנאי בקליין צמוד לכל האירוע", price: 1500 },
  { name: "סאונדמן מקצועי", description: "סאונדמן מקצועי", price: 2000 },
  { name: "סאונדמן", description: "טכנאי סאונד", price: 2000 },
  { name: "טכנאי סאונד מקצועי", description: "סאונדמן מקצועי", price: 2000 },
  { name: "טכנאי סאונד", description: "טכנאי סאונד", price: 2000 },
  { name: "תאורת נואם ובמה", description: "תאורת שטיפה נואם ובמה", price: 1500 },
  { name: "אור אולם", description: "תאורה מדומרת לבן חם בכל האולם (ללא עלות)", price: 1500 },
  { name: "מנהל צוות", description: "מנהל צוות", price: 2500 },
  { name: "נקודת חשמל לצורך תערוכה", description: "נקודת חשמל לצורך תערוכה", price: 150 },
  { name: "פלזמה 55 אינץ על סטנד רצפתי", description: "כולל הקמה פירוק וכבל HDMI ף ללא מחשב", price: 1400 },
  { name: "פלזמה 65 אינץ על סטנד רצפתי", description: "כולל הקמה פירוק וכבל HDMI ף ללא מחשב", price: 1650 },
  { name: "פלזמה 75 אינץ על סטנד רצפתי", description: "כולל הקמה פירוק וכבל HDMI ף ללא מחשב", price: 1850 },
  { name: "מקרן לייזר 5000 ניטס+מחשב נייד", description: "מקרן לייזר 5000 ניטס+מחשב נייד, כולל תלייה בגובה+פירוק+2 הובלות", price: 2500 },
  { name: "טיימר במה מקצועי", description: "טיימר במה מקצועי בגודל 27.2*6.2 ס\"מ (3 וחצי אינץ) כולל שעון עצר, טיימר, סטופר, שעון עולמי, שעון מקומי+שלט לתפעול מרחוק", price: 1000 },
  { name: "חבילת בסיס 200", description: "חבילת בסיס כוללת חלון במסך, הגברה 200 אורחים, תאורת נואם ובמה, טכנאי צמוד", price: 7000 },
  { name: "חבילת בסיס 150", description: "חבילת בסיס כוללת חלון במסך, הגברה ל150 אורחים, תאורת נואם ובמה, טכנאי צמוד", price: 6500 },
  { name: "הקלטת אודיו", description: "הקלטת אודיו של המליאה לDISKONKEY בקובץ MP3", price: 500 },
  { name: "מחשבים ברשת", description: "2 מחשבים ברשת אחד על הפודיום אחד בעמדת קונטרול", price: 500 },
  { name: "מסך הקרנה", description: "מסך הקרנה למקרן כולל הקמה+פירוק", price: 500 },
  { name: "חיבור דיג'יי פנים אולם", description: "חיבור דיג'יי למערכת הגברה ElectroVoice+ שני סאבים B&C 800 watts לטובת מוזיקת רקע/מסיבה", price: 2000 },
  { name: "מוזיקת רקע+כרוז SWEET", description: "מערכת סראונד היקפית שישיית רמקולים ElectroVoice 10\" עבור מוזיקת רקע לתערוכה - פנים אולם", price: 1000 },
  { name: "מוזיקת רקע+כרוז JOY", description: "מערכת סראונד היקפית שמיניית רמקולים ElectroVoice 10\" עבור מוזיקת רקע לתערוכה - פנים אולם", price: 1000 },
  { name: "כרוז לגן קבלת פנים", description: "רמקול מוגבר+מיקרופון המשמש כמערכת כריזה לקבלת פנים", price: 500 },
  { name: "תערוכה", description: "שימוש באולם A לצורך תערוכה וא. בוקר+ צהריים, מוזיקת רקע וכרוז בתערוכה, שימוש במסך, תאורה מדומרת לבן חם, מוזיקת רקע וכרוז לקבלת פנים", price: 3346 },
  { name: "תאורה חכמה", description: "שימוש בכל התאורה החכמה הקיימת באולם 1", price: 3500 },
  { name: "מפעיל תאורה", description: "מפעיל תאורה", price: 1500 }
];

const clientsData = [
  { name: "מאי", phone: "052-878-1312", company: "בלוסטון גרופ הפקות בע\"מ", company_id: "513923037" },
  { name: "אלזה", phone: "052-830-6725", company: "אדוונטורס פ.א", company_id: "515956084" },
  { name: "צביקה", phone: "054-458-8917", company: "BIT Production", company_id: "512320946" },
  { name: "שרון", phone: "052-577-1151", company: "מכון התקנים", company_id: "511449878" },
  { name: "אטי", phone: "054-243-1995", company: "רשת מכללות עתיד", company_id: "511508186" },
  { name: "עומר", phone: "054-654-4285", company: "מנטבר הפקות", company_id: "512523812" },
  { name: "מילי", phone: "054-763-7263", company: "מרכז השלטון המקומי", company_id: "520029844" },
  { name: "ידנה", phone: "052-360-6066", company: "אימגן גרופ", company_id: "לא צוין" },
  { name: "ינון", phone: "050-787-7090", company: "ICON", company_id: "לא צוין" },
  { name: "אייל", phone: "052-323-1545", company: "סופרפוש / סופרפרש", company_id: "511252629" },
  { name: "עומר", phone: "052-818-0012", company: "סופרפוש", company_id: "511252629" },
  { name: "ענת רביב", phone: "054-748-1125", company: "סימנס אלקטרוניק דיזיין אוטומיישן", company_id: "511592883" },
  { name: "צליל", phone: "054-398-2240", company: "ספרה הפקות", company_id: "516378130" },
  { name: "גילי", phone: "052-348-8472", company: "ספרה הפקות", company_id: "516378130" },
  { name: "מירב", phone: "054-250-0930", company: "העמותה לקידום מקצועי עובדי המזון והפרמצבטיקה", company_id: "580467942" },
  { name: "ליאת", phone: "052-339-0776", company: "עמותת נגישות ישראל", company_id: "580341204" },
  { name: "גליה", phone: "054-973-7282", company: "איסתא ישראל", company_id: "513754812" },
  { name: "אורי", phone: "052-555-0719", company: "פרימיום טים בע\"מ", company_id: "512742297" },
  { name: "דנה", phone: "054-741-3341", company: "קונטרופ טכנולוגיות מדויקות בע\"מ", company_id: "511305682" },
  { name: "רונן רייבנבאך", phone: "050-400-0102", company: "רונן רייבנבאך בע\"מ", company_id: "514596584" },
  { name: "אביב", phone: "050-901-1150", company: "ש.ל.ה", company_id: "511313215" },
  { name: "שלומית וינר", phone: "054-313-0260", company: "שבשבת הפקות", company_id: "22038939" },
  { name: "עומר", phone: "054-429-8627", company: "וראיד מרב בע\"מ", company_id: "515789287" },
  { name: "מלי", phone: "052-828-0083", company: "שטראוס", company_id: "510909450" },
  { name: "עמית", phone: "052-484-4204", company: "שטיין שני הפקות אירועים בע\"מ", company_id: "515844207" },
  { name: "רוית", phone: "052-818-0224", company: "שטראוס בע\"מ", company_id: "לא צוין" },
  { name: "ירדן", phone: "054-638-6931", company: "עדי נגב-תיקון עולם", company_id: "580354637" },
  { name: "חגית", phone: "052-890-1744", company: "תלמה שלמה טראוול סולושיינס בע\"מ", company_id: "516325305" },
  { name: "שתיבי", phone: "054-819-1458", company: "שתיביז ייזום והפקה בע\"מ", company_id: "516584935" },
  { name: "מור", phone: "052-592-5929", company: "אמפי לייב בע\"מ", company_id: "515273365" },
  { name: "אסתר", phone: "058-559-0181", company: "כנס ישראל", company_id: "514053214" }
];

const aliasesData = [
  { alias: "מסך מלא גוי |2000|", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא JOY", price_override: 2000 },
  { alias: "חלונות גוי |2500|", item_name: "מסך אולם גוי חלון אחד ללא רזולום", price_override: 2500 },
  { alias: "תצוגת מגיש 42\"", item_name: "תצוגת מגיש 42 אינץ רצפתי", price_override: null },
  { alias: "מסך מלא כולל רזולום |4000|", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא JOY", price_override: 4000 },
  { alias: "תצוגת מגיש 42 |800|", item_name: "תצוגת מגיש 42 אינץ רצפתי", price_override: 800 },
  { alias: "טיימר 42\"", item_name: "טיימר 42 אינץ רצפתי", price_override: null },
  { alias: "מדונה", item_name: "מדונה צבע גוף", price_override: null },
  { alias: "אלחוטי", item_name: "מיקרופון אלחוטי", price_override: null },
  { alias: "מסך מלא גוי", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא גוי", price_override: null },
  { alias: "טיימר 600|", item_name: "טיימר 42 אינץ רצפתי", price_override: 600 },
  { alias: "מסך מלא כולל רזולום 4000|", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא JOY", price_override: 4000 },
  { alias: "תצוגת מגיש", item_name: "תצוגת מגיש 42 אינץ רצפתי", price_override: null },
  { alias: "חלון סוויט", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: null },
  { alias: "מסך מלא סוויט", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא סוויט", price_override: null },
  { alias: "הגברה 350", item_name: "הגברה 350 איש", price_override: null },
  { alias: "לפטופ על הפודיום", item_name: "2 מחשבים ברשת קונטרול+פודיום Presentor view", price_override: null },
  { alias: "סוויט חלון אחד", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: null },
  { alias: "SWEET חלון אחד ללא רזולום", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: null },
  { alias: "למסך מלא SWEET", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא סוויט", price_override: null },
  { alias: "חלונות גוי", item_name: "מסך אולם גוי חלון אחד ללא רזולום", price_override: null },
  { alias: "JOY חלון אחד", item_name: "מסך אולם JOY חלון אחד", price_override: null },
  { alias: "55 אינץ", item_name: "מסך 55 אינץ על סטנד רצפתי", price_override: null },
  { alias: "מסך מלא JOY", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא JOY", price_override: null },
  { alias: "אולם גוי פיצול A", item_name: "מסך אולם גוי פיצול A", price_override: null },
  { alias: "טיימר", item_name: "טיימר 42 אינץ רצפתי", price_override: null },
  { alias: "הגברה 250", item_name: "הגברה 250 איש", price_override: null },
  { alias: "הגברה 200", item_name: "הגברה 200 איש", price_override: null },
  { alias: "הגברה 150", item_name: "הגברה 150 איש", price_override: null },
  { alias: "כרטיס לכידה", item_name: "כרטיס לכידה HDMI Magwell לחיבור Source נוסף למסך לד", price_override: null },
  { alias: "Source נוסף למסך לד", item_name: "כרטיס לכידה HDMI Magwell לחיבור Source נוסף למסך לד", price_override: null },
  { alias: "הגברה 300", item_name: "הגברה 300 איש", price_override: null },
  { alias: "הגברה 450", item_name: "הגברה 450 איש", price_override: null },
  { alias: "הגברה 400", item_name: "הגברה 400 איש", price_override: null },
  { alias: "הגברה 500", item_name: "הגברה 500 איש", price_override: null },
  { alias: "הגברה מעל 500", item_name: "הגברה מעל 500 איש (מתאים עד 1000 אורחים)", price_override: null },
  { alias: "פלזמה 65 אינץ", item_name: "פלזמה 65 אינץ על סטנד רצפתי", price_override: null },
  { alias: "פלזמה 75 אינץ", item_name: "פלזמה 75 אינץ על סטנד רצפתי", price_override: null },
  { alias: "מסך מלא אולם גדול", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא גוי", price_override: null },
  { alias: "2 תצוגת מגיש 42\"", item_name: "תצוגת מגיש 42 אינץ רצפתי", price_override: null },
  { alias: "2 מדונות", item_name: "מדונה צבע גוף", price_override: null },
  { alias: "חלון מסך אולם סוויט 2200|", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: 2200 },
  { alias: "חלון מסך סוויט 2000|", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: 2000 },
  { alias: "מסך מלא אולם סוויט 2400|", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא SWEET", price_override: 2400 },
  { alias: "מקרן 2500|", item_name: "מקרן לייזר 5000 ניטס+מחשב נייד", price_override: 2500 },
  { alias: "חלון אולם סוויט 2200|", item_name: "מסך אולם סוויט חלון אחד ללא רזולום", price_override: 2200 },
  { alias: "מקרן 2200|", item_name: "מקרן לייזר 5000 ניטס+מחשב נייד", price_override: 2200 },
  { alias: "חלון אולם סוויט 2000|", item_name: "מסך אולם SWEET חלון אחד ללא רזולום", price_override: 2000 },
  { alias: "פרונט במה", item_name: "תאורת נואם ובמה", price_override: null },
  { alias: "סורס נוסף", item_name: "כרטיס לכידה HDMI Magwell לחיבור Source נוסף למסך לד", price_override: null },
  { alias: "מסך מלא אולם B|", item_name: "מסך אולם JOY פיצול B", price_override: null },
  { alias: "2 מדונה 350|", item_name: "מדונה צבע גוף", price_override: 350 },
  { alias: "מדונה 350|", item_name: "מדונה צבע גוף", price_override: 350 },
  { alias: "הגברה 1000 איש 5200|", item_name: "הגברה מעל 500 איש (מתאים עד 1000 אורחים)", price_override: 5200 },
  { alias: "מסך גוי חלון 2200|", item_name: "מסך אולם גוי חלון אחד ללא רזולום", price_override: 2200 },
  { alias: "3 מיק אלחוטי 300|", item_name: "מיקרופון אלחוטי", price_override: 300 },
  { alias: "הגברה לדיגיי", item_name: "חיבור דיג'יי פנים אולם", price_override: null },
  { alias: "2 מדונה 400|", item_name: "מדונה צבע גוף", price_override: 400 },
  { alias: "חלון אולם גוי 2500|", item_name: "מסך אולם גוי חלון אחד ללא רזולום", price_override: 2500 },
  { alias: "מסך מלא אולם גוי 2500|", item_name: "תוספת מערכת רזולום+שדרוג למסך מלא גוי", price_override: 2500 },
  { alias: "מיק", item_name: "מיקרופון אלחוטי", price_override: null },
  { alias: "42\"", item_name: "תצוגת מגיש 42 אינץ רצפתי", price_override: null },
  { alias: "פודיום", item_name: "פודיום דיגיטלי", price_override: null },
  { alias: "מסך 55 להקרנת תוכנית הכנס בכניסה לאולם", item_name: "מסך 55 אינץ אינץ להקרנת תוכנית הכנס בכניסה לאולם", price_override: null },
  { alias: "מסך מל קטן 22|", item_name: "מסך אולם SWEET חלון אחד ללא רזולום", price_override: 22 },
  { alias: "1 מפעיל תאורה 1000|", item_name: "מפעיל תאורה", price_override: 1000 },
  { alias: "3 אלחוטי 300|", item_name: "מיקרופון אלחוטי", price_override: 300 },
  { alias: "מסך מלא אולם גוי 2200|", item_name: "מסך אולם גוי חלון אחד ללא רזולום", price_override: 2200 }
];

// פונקציה לטעינת נתונים ראשוניים
async function initializeDatabase() {
  console.log('🚀 מתחיל לטעון נתונים...');
  
  try {
    // בדיקה אם כבר יש נתונים
    const existingItems = await dbFunctions.getAllItems();
    if (existingItems.length > 0) {
      console.log('✅ הנתונים כבר קיימים בדאטהבייס');
      return;
    }

    // טעינת פריטים
    console.log('📦 טוען פריטים...');
    for (const item of itemsData) {
      await dbFunctions.addItem(item.name, item.description, item.price);
    }

    // טעינת לקוחות
    console.log('👥 טוען לקוחות...');
    for (const client of clientsData) {
      await dbFunctions.addClient(client.name, client.phone, client.company, client.company_id);
    }

    // טעינת כינויים
    console.log('🏷️ טוען כינויים...');
    for (const alias of aliasesData) {
      await dbFunctions.addAlias(alias.alias, alias.item_name, alias.price_override);
    }

    // הוספת עובד לדוגמה עם שכר יומי
    console.log('👷 טוען עובד לדוגמה...');
    await dbFunctions.addEmployee({
      first_name: 'דור',
      last_name: 'קצב',
      phone: '052-489-1025',
      email: 'Dor.katzav.valley@gmail.com',
      daily_rate: 800,
      is_active: true
    });

    console.log('✅ כל הנתונים נטענו בהצלחה!');
    console.log(`📊 נטענו: ${itemsData.length} פריטים, ${clientsData.length} לקוחות, ${aliasesData.length} כינויים, 1 עובד`);

  } catch (error) {
    console.error('❌ שגיאה בטעינת נתונים:', error);
  }
}

module.exports = { initializeDatabase };

