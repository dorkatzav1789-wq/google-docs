/**

  * @OnlyCurrentDoc

  * Version: 20.0 "The Unified & Stable Build"

  * This definitive version uses a robust two-file SPA model to fix all previous issues.

  * It includes a full CRM and the two-step PDF/Doc export process.

  */



// --- CONFIGURATION CONSTANTS ---

const PRICE_LIST_SHEET_NAME = "מחירון";

const ALIAS_SHEET_NAME = "כינויים";

const CLIENTS_SHEET_NAME = "לקוחות";

const VAT_RATE = 0.18;

const TEMPLATE_ID = "1gGxSCNzVPunDSp9Xe49d9U9II9ZF7duh5grkkSCzjxk";

const TARGET_FOLDER_ID = "16PxfEtrfjmi-l5KFRQvgrdO20mxffYDm";



// --- FOLDER MANAGEMENT FUNCTIONS ---
function findOrCreateFolder(parentFolder, folderName) {
    const folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
        return folders.next();
    } else {
        return parentFolder.createFolder(folderName);
    }
}

function createDateBasedFolder(eventDate) {
    try {
        const date = new Date(eventDate);
        const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
        const day = date.getDate();
        
        // שימוש בתיקייה הספציפית שלך
        const targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
        let monthFolder = findOrCreateFolder(targetFolder, monthYear);
        let dayFolder = findOrCreateFolder(monthFolder, day.toString());
        
        return dayFolder;
    } catch (e) {
        Logger.log(`Error creating date-based folder: ${e.message}`);
        // אם יש שגיאה, נחזור לתיקייה הראשית
        return DriveApp.getFolderById(TARGET_FOLDER_ID);
    }
}

function updateExistingTable(table, items) {
    try {
        const existingRows = table.getNumRows();
        const neededRows = items.length + 1; // +1 עבור כותרת
        
        // התאם מספר שורות בטבלה
        if (existingRows > neededRows) {
            // מחק שורות מיותרות (מהסוף)
            for (let i = existingRows - 1; i >= neededRows; i--) {
                table.removeRow(i);
            }
        } else if (existingRows < neededRows) {
            // הוסף שורות חסרות
            for (let i = existingRows; i < neededRows; i++) {
                table.appendTableRow();
            }
        }
        
        // עדכן את הנתונים בטבלה
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const row = table.getRow(i + 1); // +1 כי השורה הראשונה היא כותרת
            const total = ((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0);
            
            // עדכן את התאים (מימין לשמאל לפי התבנית שלך)
            if (row.getNumCells() >= 6) {
                row.getCell(0).setText(`${total.toLocaleString()} ₪`); // סה"כ
                row.getCell(1).setText(`${(item.discount || 0).toLocaleString()} ₪`); // הנחה
                row.getCell(2).setText(item.quantity || 1); // כמות
                row.getCell(3).setText(`${(item.unitPrice || 0).toLocaleString()} ₪`); // מחיר יחידה
                row.getCell(4).setText(item.description || ''); // תיאור הפריט
                row.getCell(5).setText(item.name || ''); // שם הפריט
            }
        }
        
        // עדכן עיצוב
        const ZEBRA_COLOR = "#deebf6";
        for (let i = 1; i < table.getNumRows(); i++) {
            const row = table.getRow(i);
            if (i % 2 !== 0) { 
                row.setBackgroundColor(ZEBRA_COLOR); 
            }
            for (let j = 0; j < row.getNumCells(); j++) { 
                row.getCell(j).setBorderWidth(0); 
            }
        }
        
    } catch (e) {
        Logger.log(`Error updating existing table: ${e.message}`);
    }
}



// --- UI AND WEB APP ENTRY POINTS ---

function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('interface').setTitle("עוזר הצעות מחיר").addMetaTag('viewport', 'width=device-width, initial-scale=1.0, user-scalable=no');
}

// פונקציית בדיקה פשוטה
function testFunction() {
    try {
        return { status: 'SUCCESS', message: 'המערכת עובדת!' };
    } catch (e) {
        return { status: 'ERROR', message: e.toString() };
    }
}



function onOpen() {

    SpreadsheetApp.getUi().createMenu('🤖 מנהל הצעות מחיר (V20)').addItem('פתח עוזר', 'showApp').addToUi();

}



function showApp() {

    const html = HtmlService.createHtmlOutputFromFile('Interface').setTitle('מנהל הצעות מחיר');

    SpreadsheetApp.getUi().showSidebar(html);

}



// --- SERVER-SIDE FUNCTIONS (Called by the client-side app) ---



function getInitialData() {

    const cache = CacheService.getScriptCache();

    const cachedData = cache.get('pricingData');

    if (cachedData) {

        return JSON.parse(cachedData);

    }



    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const priceListSheet = ss.getSheetByName(PRICE_LIST_SHEET_NAME);

    const aliasSheet = ss.getSheetByName(ALIAS_SHEET_NAME);

    const clientSheet = ss.getSheetByName(CLIENTS_SHEET_NAME);



    const priceList = priceListSheet ? priceListSheet.getDataRange().getValues().slice(1) : [];

    const aliases = aliasSheet ? aliasSheet.getDataRange().getValues().slice(1) : [];



    let clients = [];

    if (clientSheet && clientSheet.getLastRow() > 1) {

        const clientData = clientSheet.getDataRange().getValues();

        const headers = clientData[0].map(h => String(h).trim());

        const nameIndex = headers.indexOf("שם לקוח"), phoneIndex = headers.indexOf("מספר טלפון"), companyIndex = headers.indexOf("שם החברה"), idIndex = headers.indexOf("חפ");

        if (nameIndex !== -1) {

            clients = clientData.slice(1).map(row => ({ name: row[nameIndex] || '', phone: row[phoneIndex] || '', company: row[companyIndex] || '', id: row[idIndex] || '' }));

        }

    }



    const dataToCache = { priceList, aliases, clients };

    cache.put('pricingData', JSON.stringify(dataToCache), 3600); // Cache for 1 hour

    return dataToCache;

}



function learnAlias(alias, officialName) {

    try {

        const ss = SpreadsheetApp.getActiveSpreadsheet();

        let aliasSheet = ss.getSheetByName(ALIAS_SHEET_NAME);

        if (!aliasSheet) {

            aliasSheet = ss.insertSheet(ALIAS_SHEET_NAME);

            aliasSheet.appendRow(['כינוי', 'שם פריט רשמי']).getRange("A1:B1").setFontWeight("bold");

        }

        const data = aliasSheet.getDataRange().getValues();

        const aliasExists = data.slice(1).some(row => row[0] == alias);

        if (!aliasExists) {

            aliasSheet.appendRow([alias, officialName]);

            CacheService.getScriptCache().remove('pricingData');

            SpreadsheetApp.flush();

        }

        return { status: 'SUCCESS' };

    } catch (e) { return { status: 'ERROR', message: e.message }; }

}



function saveClientData(clientData) {

    if (!clientData || (!clientData.clientName && !clientData.companyName)) return;



    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let clientSheet = ss.getSheetByName(CLIENTS_SHEET_NAME);

    const headers = ["שם לקוח", "מספר טלפון", "שם החברה", "חפ"];



    if (!clientSheet) {

        clientSheet = ss.insertSheet(CLIENTS_SHEET_NAME);

        clientSheet.appendRow(headers).getRange("A1:D1").setFontWeight("bold");

    }



    const data = clientSheet.getDataRange().getValues();

    const idIndex = data.length > 0 ? data[0].indexOf("חפ") : -1;



    let clientExists = false;

    if (clientData.companyId && idIndex !== -1 && String(clientData.companyId).trim() !== '') {

        clientExists = data.slice(1).some(row => row[idIndex] == clientData.companyId);

    }



    if (!clientExists) {

        clientSheet.appendRow([clientData.clientName, clientData.phone, clientData.companyName, clientData.companyId]);

        CacheService.getScriptCache().remove('pricingData');

    }

}



/**

  * STEP 1: Creates a new Google Doc from the template and populates it with data.

  */

function exportToTemplate(exportData) {
    try {
        const { clientDetails, eventDetails, quote, specialNotes } = exportData;

        saveClientData(clientDetails);

        // יצירת תיקייה לפי תאריך האירוע
        const targetFolder = eventDetails.eventDate ? createDateBasedFolder(eventDetails.eventDate) : DriveApp.getFolderById(TARGET_FOLDER_ID);
        
        // יצירת מסמך חדש
        const dateForFileName = eventDetails.eventDate ? new Date(eventDetails.eventDate).toLocaleDateString('he-IL').replace(/\//g, '.') : new Date().toLocaleDateString('he-IL').replace(/\//g, '.');
        const fileName = `הצעת מחיר ${eventDetails.eventName || ''} כנס ${clientDetails.companyName || clientDetails.clientName} ${dateForFileName}`;
        const doc = DocumentApp.create(fileName);
        const body = doc.getBody();
        
        // הוספת תוכן למסמך
        body.appendParagraph('הצעת מחיר').setHeading(DocumentApp.ParagraphHeading.HEADING1);
        body.appendParagraph('');
        
        // פרטי לקוח
        body.appendParagraph('פרטי לקוח:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
        body.appendParagraph(`שם החברה: ${clientDetails.companyName || ''}`);
        body.appendParagraph(`שם איש קשר: ${clientDetails.clientName || ''}`);
        body.appendParagraph(`טלפון: ${clientDetails.phone || ''}`);
        body.appendParagraph(`ח"פ: ${clientDetails.companyId || ''}`);
        body.appendParagraph('');
        
        // פרטי אירוע
        body.appendParagraph('פרטי האירוע:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
        body.appendParagraph(`שם האירוע: ${eventDetails.eventName || ''}`);
        body.appendParagraph(`תאריך האירוע: ${eventDetails.eventDate || ''}`);
        body.appendParagraph(`שעות האירוע: ${eventDetails.eventHours || ''}`);
        body.appendParagraph(`תאריך הצעה: ${new Date().toLocaleDateString('he-IL')}`);
        body.appendParagraph('');
        
        // הערות מיוחדות
        if (specialNotes) {
            body.appendParagraph('הערות מיוחדות:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
            body.appendParagraph(specialNotes);
            body.appendParagraph('');
        }
        
        // טבלת פריטים
        body.appendParagraph('פרטי ההצעה:').setHeading(DocumentApp.ParagraphHeading.HEADING2);

        // יצירת טבלת פריטים
        if (quote.items.length > 0) {
            const tableData = [['שם הפריט', 'תיאור', 'מחיר יחידה', 'כמות', 'הנחה', 'סה"כ']];
            
            quote.items.forEach(item => {
                const total = ((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0);
                tableData.push([
                    item.name || '', 
                    item.description || '', 
                    `${(item.unitPrice || 0).toLocaleString()} ₪`, 
                    item.quantity || 1, 
                    `${(item.discount || 0).toLocaleString()} ₪`, 
                    `${total.toLocaleString()} ₪`
                ]);
            });
            
            const table = body.appendTable(tableData);
            table.getRow(0).editAsText().setBold(true);
            
            // עיצוב הטבלה
            for (let i = 1; i < table.getNumRows(); i++) {
                const row = table.getRow(i);
                if (i % 2 !== 0) { 
                    row.setBackgroundColor("#f8f9fa"); 
                }
            }
        }
        
        body.appendParagraph('');

        // סיכום
        const subtotal = quote.items.reduce((acc, item) => acc + (((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0)), 0);
        
        body.appendParagraph(`סה"כ לפני מע"מ: ${subtotal.toLocaleString()} ₪`);
        
        if (quote.discount > 0) {
            const discountAmount = subtotal * (quote.discount / 100);
            const subtotalAfterDiscount = subtotal - discountAmount;
            const vatAmount = subtotalAfterDiscount * VAT_RATE;
            const finalTotal = subtotalAfterDiscount + vatAmount;
            
            body.appendParagraph(`הנחה ${quote.discount}%: -${discountAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ לאחר הנחה: ${subtotalAfterDiscount.toLocaleString()} ₪`);
            body.appendParagraph(`מע"מ (18%): ${vatAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ כולל מע"מ: ${finalTotal.toLocaleString()} ₪`).setBold(true);
        } else {
            const vatAmount = subtotal * VAT_RATE;
            const finalTotal = subtotal + vatAmount;
            
            body.appendParagraph(`מע"מ (18%): ${vatAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ כולל מע"מ: ${finalTotal.toLocaleString()} ₪`).setBold(true);
        }

        doc.saveAndClose();
        
        // העברת המסמך לתיקייה הנכונה
        const docFile = DriveApp.getFileById(doc.getId());
        if (targetFolder.getId() !== DriveApp.getRootFolder().getId()) {
            targetFolder.addFile(docFile);
            DriveApp.getRootFolder().removeFile(docFile);
        }

        return { status: 'SUCCESS', docUrl: docFile.getUrl(), docId: docFile.getId() };



    } catch (e) {

        Logger.log(e);

        return { status: 'ERROR', message: `שגיאה ביצירת המסמך: ${e.message}` };

    }

}



/**

  * STEP 2: Takes an existing Google Doc ID and saves it as a PDF.

  */

function saveAsPdf(docId) {
    try {
        if (!docId) {
            throw new Error("לא סופק מזהה מסמך.");
        }

        const docFile = DriveApp.getFileById(docId);
        
        // נסה למצוא את התיקייה שבה נמצא המסמך
        let targetFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
        const fileParents = docFile.getParents();
        if (fileParents.hasNext()) {
            const parentFolder = fileParents.next();
            // אם המסמך נמצא בתיקייה מאורגנת לפי תאריכים, נשתמש בה
            if (parentFolder.getId() !== TARGET_FOLDER_ID) {
                targetFolder = parentFolder;
            }
        }
        
        const pdfBlob = docFile.getAs(MimeType.PDF);
        const pdfFile = targetFolder.createFile(pdfBlob).setName(docFile.getName() + ".pdf");

        return { status: 'SUCCESS', pdfUrl: pdfFile.getUrl() };

    } catch (e) {
        Logger.log(e);
        return { status: 'ERROR', message: `שגיאה בשמירת PDF: ${e.message}` };
    }
}

/**

 * ייצוא מהיר ל-PDF - יוצר מסמך ו-PDF בפעולה אחת

 */

function quickExportToPdf(exportData) {

    try {

        // שלב 1: יצירת המסמך

        const docResult = exportToTemplate(exportData);

        if (docResult.status !== 'SUCCESS') {

            return docResult;

        }

        

        // שלב 2: יצירת PDF

        const pdfResult = saveAsPdf(docResult.docId);

        if (pdfResult.status !== 'SUCCESS') {

            return pdfResult;

        }

        

        return { 

            status: 'SUCCESS', 

            pdfUrl: pdfResult.pdfUrl,

            docUrl: docResult.docUrl,

            message: 'המסמך וה-PDF נוצרו בהצלחה!'

        };



    } catch (e) {

        Logger.log(e);

        return { status: 'ERROR', message: `שגיאה בייצוא מהיר: ${e.message}` };

    }

}

/**

 * יצירת תצוגה מקדימה של המסמך (מסמך זמני)

 */

function previewDocument(exportData) {
    try {
        const { clientDetails, eventDetails, quote, specialNotes } = exportData;

        saveClientData(clientDetails);

        // יצירת מסמך חדש לתצוגה מקדימה
        const dateForFileName = eventDetails.eventDate ? new Date(eventDetails.eventDate).toLocaleDateString('he-IL').replace(/\//g, '.') : new Date().toLocaleDateString('he-IL').replace(/\//g, '.');
        const fileName = `[תצוגה מקדימה] הצעת מחיר ${eventDetails.eventName || ''} כנס ${clientDetails.companyName || clientDetails.clientName} ${dateForFileName}`;
        const doc = DocumentApp.create(fileName);
        const body = doc.getBody();
        
        // הוספת תוכן למסמך
        body.appendParagraph('הצעת מחיר - תצוגה מקדימה').setHeading(DocumentApp.ParagraphHeading.HEADING1);
        body.appendParagraph('');
        
        // פרטי לקוח
        body.appendParagraph('פרטי לקוח:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
        body.appendParagraph(`שם החברה: ${clientDetails.companyName || ''}`);
        body.appendParagraph(`שם איש קשר: ${clientDetails.clientName || ''}`);
        body.appendParagraph(`טלפון: ${clientDetails.phone || ''}`);
        body.appendParagraph(`ח"פ: ${clientDetails.companyId || ''}`);
        body.appendParagraph('');
        
        // פרטי אירוע
        body.appendParagraph('פרטי האירוע:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
        body.appendParagraph(`שם האירוע: ${eventDetails.eventName || ''}`);
        body.appendParagraph(`תאריך האירוע: ${eventDetails.eventDate || ''}`);
        body.appendParagraph(`שעות האירוע: ${eventDetails.eventHours || ''}`);
        body.appendParagraph(`תאריך הצעה: ${new Date().toLocaleDateString('he-IL')}`);
        body.appendParagraph('');
        
        // הערות מיוחדות
        if (specialNotes) {
            body.appendParagraph('הערות מיוחדות:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
            body.appendParagraph(specialNotes);
            body.appendParagraph('');
        }
        
        // טבלת פריטים
        body.appendParagraph('פרטי ההצעה:').setHeading(DocumentApp.ParagraphHeading.HEADING2);

        // יצירת טבלת פריטים
        if (quote.items.length > 0) {
            const tableData = [['שם הפריט', 'תיאור', 'מחיר יחידה', 'כמות', 'הנחה', 'סה"כ']];
            
            quote.items.forEach(item => {
                const total = ((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0);
                tableData.push([
                    item.name || '', 
                    item.description || '', 
                    `${(item.unitPrice || 0).toLocaleString()} ₪`, 
                    item.quantity || 1, 
                    `${(item.discount || 0).toLocaleString()} ₪`, 
                    `${total.toLocaleString()} ₪`
                ]);
            });
            
            const table = body.appendTable(tableData);
            table.getRow(0).editAsText().setBold(true);
            
            // עיצוב הטבלה
            for (let i = 1; i < table.getNumRows(); i++) {
                const row = table.getRow(i);
                if (i % 2 !== 0) { 
                    row.setBackgroundColor("#f8f9fa"); 
                }
            }
        }
        
        body.appendParagraph('');

        // סיכום
        const subtotal = quote.items.reduce((acc, item) => acc + (((item.unitPrice || 0) * (item.quantity || 1)) - (item.discount || 0)), 0);
        
        body.appendParagraph(`סה"כ לפני מע"מ: ${subtotal.toLocaleString()} ₪`);
        
        if (quote.discount > 0) {
            const discountAmount = subtotal * (quote.discount / 100);
            const subtotalAfterDiscount = subtotal - discountAmount;
            const vatAmount = subtotalAfterDiscount * VAT_RATE;
            const finalTotal = subtotalAfterDiscount + vatAmount;
            
            body.appendParagraph(`הנחה ${quote.discount}%: -${discountAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ לאחר הנחה: ${subtotalAfterDiscount.toLocaleString()} ₪`);
            body.appendParagraph(`מע"מ (18%): ${vatAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ כולל מע"מ: ${finalTotal.toLocaleString()} ₪`).setBold(true);
        } else {
            const vatAmount = subtotal * VAT_RATE;
            const finalTotal = subtotal + vatAmount;
            
            body.appendParagraph(`מע"מ (18%): ${vatAmount.toLocaleString()} ₪`);
            body.appendParagraph(`סה"כ כולל מע"מ: ${finalTotal.toLocaleString()} ₪`).setBold(true);
        }

        doc.saveAndClose();
        
        // העברת המסמך לתיקיית ברירת המחדל (לתצוגה מקדימה)
        const docFile = DriveApp.getFileById(doc.getId());

        return { status: 'SUCCESS', docUrl: docFile.getUrl(), docId: docFile.getId() };

    } catch (e) {

        Logger.log(e);

        return { status: 'ERROR', message: `שגיאה ביצירת תצוגה מקדימה: ${e.message}` };

    }

}

// --- USER PREFERENCES FUNCTIONS ---
function saveUserPreferences(preferences) {
    try {
        const cache = CacheService.getScriptCache();
        cache.put('userPreferences', JSON.stringify(preferences), 86400); // Cache for 24 hours
        return { status: 'SUCCESS' };
    } catch (e) {
        return { status: 'ERROR', message: e.message };
    }
}

function getUserPreferences() {
    try {
        const cache = CacheService.getScriptCache();
        const cached = cache.get('userPreferences');
        return cached ? JSON.parse(cached) : {};
    } catch (e) {
        return {};
    }
}