const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbFunctions } = require('./supabase-database');
const { initializeDatabase } = require('./initData');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// טעינת נתונים ראשוניים
initializeDatabase();

// ===================== API ROUTES ===================== //

// פריטים
app.post('/api/items', async (req, res) => {
  try {
    const { name, description, price } = req.body;
    if (!name || price == null) return res.status(400).json({ error: 'name & price required' });
    const id = await dbFunctions.addItem(name, description || '', Number(price));
    res.status(201).json({ id, name, description: description || '', price: Number(price) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// כינויים
app.post('/api/aliases', async (req, res) => {
  try {
    const { alias, item_name, price_override } = req.body;
    if (!alias || !item_name) return res.status(400).json({ error: 'alias & item_name required' });
    const id = await dbFunctions.addAlias(alias, item_name, price_override ?? null);
    res.status(201).json({ id, alias, item_name, price_override: price_override ?? null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// לקוחות
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await dbFunctions.getAllClients();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    console.log('REQ BODY /api/clients:', req.body);
    const { name, phone, company, company_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'שם לקוח הוא שדה חובה' });
    }
    const clientId = await dbFunctions.addClient(
        name.trim(),
        phone ?? null,
        company ?? null,
        company_id ?? null
    );
    res.status(201).json({ id: clientId, message: 'לקוח נוסף בהצלחה' });
  } catch (error) {
    console.error('POST /api/clients error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

// הצעות מחיר
app.post('/api/quotes', async (req, res) => {
  try {
    const { quote, items } = req.body;

    const quoteId = await dbFunctions.saveQuote(quote);
    await dbFunctions.saveQuoteItems(quoteId, items);

    res.json({ id: quoteId, message: 'הצעת מחיר נשמרה בהצלחה' });
  } catch (error) {
    console.error('POST /api/quotes error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await dbFunctions.getAllQuotes();
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quote = await dbFunctions.getQuoteById(id);
    const items = await dbFunctions.getQuoteItems(id);
    if (!quote) return res.status(404).json({ error: 'הצעת מחיר לא נמצאה' });
    res.json({ quote, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ מחיקת הצעת מחיר (כולל פריטים)
app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'מזהה הצעה לא תקין' });

    await dbFunctions.deleteQuote(id);
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/quotes error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

// חיפוש פריטים (בגרסה הזו מה־DB)
app.get('/api/search/items', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const results = await dbFunctions.searchItems(String(q));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// פרסור טקסט הצעת מחיר (השארתי את הלוגיקה שלך)
// פרסור טקסט הצעת מחיר - מחזיר גם unknown
app.post('/api/parse-quote', async (req, res) => {
  try {
    const { text } = req.body;
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const items = await dbFunctions.getAllItems();
    const aliases = await dbFunctions.getAllAliases();

    const matched = [];
    const unknown = [];

    for (const line of lines) {
      // פורמט: כמות [טקסט פריט] מחיר|
      const m = line.match(/^(\d+)\s+(.+?)\s+(\d+)\|?$/);
      if (!m) {
        unknown.push({ line, quantity: 1, raw_text: line, unit_price: null });
        continue;
      }

      const [, qtyStr, itemText, priceStr] = m;
      const quantity = parseInt(qtyStr, 10);
      const typedTotal = parseInt(priceStr, 10);

      const alias = aliases.find(a =>
          a.alias.toLowerCase() === itemText.toLowerCase() ||
          itemText.toLowerCase().includes(a.alias.toLowerCase())
      );

      let item = null;
      let finalPrice = typedTotal;

      if (alias) {
        item = items.find(i => i.name === alias.item_name);
        if (alias.price_override) finalPrice = alias.price_override;
      } else {
        item = items.find(i =>
            i.name.toLowerCase().includes(itemText.toLowerCase()) ||
            itemText.toLowerCase().includes(i.name.toLowerCase())
        );
      }

      if (item) {
        const unitPrice = item.price;
        const discount = (unitPrice * quantity) - finalPrice;
        matched.push({
          name: item.name,
          description: item.description,
          unit_price: unitPrice,
          quantity,
          discount: Math.max(0, discount),
          total: finalPrice,
          matched_text: itemText
        });
      } else {
        unknown.push({
          line,
          quantity,
          raw_text: itemText,
          unit_price: typedTotal, // סכום כוללת/פר פריט? כאן נשמר כמחיר יעד לטבלה
        });
      }
    }

    res.json({ items: matched, unknown });
  } catch (error) {
    console.error('parse-quote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ייצוא PDF


app.post('/api/export-pdf', async (req, res) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ error: 'quoteId is required' });

    const quote = await dbFunctions.getQuoteById(quoteId);
    const items = await dbFunctions.getQuoteItems(quoteId);
    if (!quote) return res.status(404).json({ error: 'הצעת מחיר לא נמצאה' });

    const html = generateQuoteHTML(quote, items);

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,      // בדרך־כלל true בענן
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quote-${quoteId}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('שגיאה בייצוא PDF:', err?.message, err?.stack);
    res.status(500).json({ error: 'PDF export failed' });
  }
});



// ------- generateQuoteHTML (כמו שהיה אצלך) -------
function generateQuoteHTML(quote, items) {
  const formatCurrency = (n) =>
      typeof n === 'number' ? `₪${n.toLocaleString('he-IL')}` : '-';

  const formatDate = (dateString) => {
    if (!dateString) return 'לא צוין';
    const d = new Date(dateString);
    return d.toLocaleDateString('he-IL');
  };

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>הצעת מחיר #${quote.id ?? ''}</title>
  <style>
    body {
      font-family: Arial, "Segoe UI", Tahoma, sans-serif;
      margin: 0;
      padding: 20px;
      background: #fff;
      color: #111827; /* gray-900 */
      direction: rtl;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #3b82f6; /* blue-500 */
      padding-bottom: 12px;
    }
    .header h1 {
      margin: 0 0 4px 0;
      color: #1e40af; /* blue-800 */
      font-size: 26px;
    }
    .quote-info {
      display: flex;
      gap: 24px;
      margin-bottom: 18px;
    }
    .info-col {
      flex: 1;
      padding: 14px;
      background: #f9fafb; /* gray-50 */
      border: 1px solid #e5e7eb; /* gray-200 */
      border-radius: 8px;
    }
    .section-title {
      font-weight: 700;
      color: #374151; /* gray-700 */
      margin-bottom: 8px;
      font-size: 16px;
    }
    .row { margin: 6px 0; }
    .label { font-weight: 700; color: #6b7280; /* gray-500 */ }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 10px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #d1d5db; /* gray-300 */
      padding: 10px 8px;
      text-align: right;
      vertical-align: top;
    }
    thead th {
      background: #f3f4f6; /* gray-100 */
      color: #374151; /* gray-700 */
      font-weight: 700;
    }
    .summary {
      margin-top: 20px;
      border-top: 2px solid #e5e7eb; /* gray-200 */
      padding-top: 12px;
      font-size: 15px;
    }
    .sum-row {
      display: flex;
      justify-content: space-between;
      margin: 6px 0;
    }
    .total {
      font-weight: 800;
      font-size: 18px;
      border-top: 1px solid #d1d5db;
      padding-top: 8px;
      margin-top: 6px;
    }
    .footer {
      margin-top: 26px;
      text-align: center;
      color: #6b7280; /* gray-500 */
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>הצעת מחיר</h1>
    <div>מספר הצעה: ${quote.id ?? ''}</div>
  </div>

  <div class="quote-info">
    <div class="info-col">
      <div class="section-title">פרטי האירוע</div>
      <div class="row"><span class="label">שם האירוע:</span> ${quote.event_name ?? ''}</div>
      <div class="row"><span class="label">תאריך:</span> ${formatDate(quote.event_date)}</div>
      ${quote.event_hours ? `<div class="row"><span class="label">שעות:</span> ${quote.event_hours}</div>` : ''}
      ${quote.special_notes ? `<div class="row"><span class="label">הערות:</span> ${quote.special_notes}</div>` : ''}
    </div>

    <div class="info-col">
      <div class="section-title">פרטי לקוח</div>
      <div class="row"><span class="label">שם:</span> ${quote.client_name ?? ''}</div>
      ${quote.client_company ? `<div class="row"><span class="label">חברה:</span> ${quote.client_company}</div>` : ''}
      ${quote.client_phone ? `<div class="row"><span class="label">טלפון:</span> ${quote.client_phone}</div>` : ''}
      ${quote.client_company_id ? `<div class="row"><span class="label">ח.פ / ע.מ:</span> ${quote.client_company_id}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>שם הפריט</th>
        <th>תיאור</th>
        <th>מחיר יחידה</th>
        <th>כמות</th>
        <th>הנחה</th>
        <th>סה"כ</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `
        <tr>
          <td>${i.name ?? ''}</td>
          <td>${i.description ?? ''}</td>
          <td>${formatCurrency(i.unit_price)}</td>
          <td>${i.quantity ?? 0}</td>
          <td>${i.discount && i.discount > 0 ? `-${formatCurrency(i.discount)}` : '-'}</td>
          <td>${formatCurrency(i.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <div class="sum-row">
      <span>סה"כ לפני הנחה:</span>
      <span>${formatCurrency(quote.total_before_discount)}</span>
    </div>

    ${quote.discount_percent && quote.discount_percent > 0 ? `
      <div class="sum-row">
        <span>הנחה (${quote.discount_percent}%):</span>
        <span>-${formatCurrency(quote.discount_amount)}</span>
      </div>
      <div class="sum-row">
        <span>סה"כ אחרי הנחה:</span>
        <span>${formatCurrency(quote.total_after_discount)}</span>
      </div>
    ` : ''}

    <div class="sum-row">
      <span>מע"מ (18%):</span>
      <span>+${formatCurrency(quote.vat_amount)}</span>
    </div>

    <div class="sum-row total">
      <span>סה"כ כולל מע"מ:</span>
      <span>${formatCurrency(quote.final_total)}</span>
    </div>
  </div>

  <div class="footer">
    <div>נוצר ב: ${formatDate(quote.created_at)}</div>
  </div>
</body>
</html>`;
}
// ===== HTML generator for Monthly Work Hours PDF =====
function renderMonthlyReportHTML(report, year, month) {
  const safe = (v) => (v ?? '').toString();
  const fmtNum = (n) =>
      Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });
  const fmtNis = (n) =>
      '₪' + Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });

  // אם לא הגיע summary מהשרת – נחשב כאן גיבוי
  const totalHours =
      report?.summary?.total_hours ??
      (report?.work_hours || []).reduce((s, wh) => s + Number(wh.hours_worked || 0), 0);

  const totalAmount =
      report?.summary?.total_amount ??
      (report?.work_hours || []).reduce((s, wh) => s + Number(wh.daily_total || 0), 0);

  const employeeCount =
      report?.summary?.employee_count ??
      new Set((report?.work_hours || []).map((wh) => wh.employees?.name || wh.employee_id)).size;

  const rows = (report?.work_hours || [])
      .map(
          (wh) => `
        <tr>
          <td>${safe(wh.employees?.name || 'לא ידוע')}</td>
          <td>${safe(wh.work_date)}</td>
          <td>${fmtNum(wh.hours_worked)}</td>
          <td>${fmtNis(wh.hourly_rate)}</td>
          <td>${fmtNis(wh.daily_total)}</td>
          <td>${safe(wh.notes || '-')}</td>
        </tr>
      `
      )
      .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <title>דוח שעות עבודה - ${month}/${year}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: Arial, "Segoe UI", Tahoma, sans-serif; margin: 20px; color: #111827; background: #fff; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
    .header h1 { margin: 0; color: #1e40af; font-size: 26px; }
    .header h2 { margin: 6px 0 0; color: #374151; font-size: 18px; }

    .summary { display: flex; gap: 16px; margin: 18px 0 8px; }
    .card { flex: 1; border: 1px solid #e5e7eb; background: #f9fafb; border-radius: 8px; padding: 12px; }
    .card h3 { margin: 0 0 6px; font-size: 14px; color: #374151; }
    .card .val { font-size: 18px; font-weight: 700; }

    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: right; vertical-align: top; }
    thead th { background: #f3f4f6; color: #374151; font-weight: 700; }

    .footer { margin-top: 24px; text-align: center; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>דוח שעות עבודה</h1>
    <h2>חודש ${month}/${year}</h2>
  </div>

  <div class="summary">
    <div class="card">
      <h3>סה"כ שעות</h3>
      <div class="val">${fmtNum(totalHours)}</div>
    </div>
    <div class="card">
      <h3>סה"כ תשלום</h3>
      <div class="val">${fmtNis(totalAmount)}</div>
    </div>
    <div class="card">
      <h3>מספר עובדים</h3>
      <div class="val">${fmtNum(employeeCount)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>עובד</th>
        <th>תאריך</th>
        <th>שעות</th>
        <th>שכר לשעה</th>
        <th>סה"כ ליום</th>
        <th>הערות</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="6" style="text-align:center;color:#6b7280;">אין נתונים לחודש שנבחר</td></tr>`}
    </tbody>
  </table>

  <div class="footer">
    נוצר אוטומטית על־ידי מערכת הדוחות
  </div>
</body>
</html>`;
}


// ===== Employee routes =====
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await dbFunctions.getAllEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const employee = await dbFunctions.addEmployee(req.body);
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const employee = await dbFunctions.updateEmployee(req.params.id, req.body);
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== Work hours routes =====
app.post('/api/work-hours', async (req, res) => {
  try {
    const workHours = await dbFunctions.addWorkHours(req.body);
    res.json(workHours);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/work-hours/employee/:id', async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth()+1, 1));
      startDate = start.toISOString().slice(0,10);
      endDate   = end.toISOString().slice(0,10);
    }
    const workHours = await dbFunctions.getWorkHoursByEmployee(
        req.params.id, startDate, endDate
    );
    res.json(workHours);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/reports/monthly/:year/:month', async (req, res) => {
  try {
    const report = await dbFunctions.getMonthlyReport(
      parseInt(req.params.year), 
      parseInt(req.params.month)
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/reports/monthly/:year/:month/pdf', async (req, res) => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);

    const report = await dbFunctions.getMonthlyReport(year, month);
    const html = renderMonthlyReportHTML(report, year, month); // פונקציה שיוצרת HTML

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.emulateMediaType('screen');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top:'15mm', right:'15mm', bottom:'15mm', left:'15mm' } });
    await browser.close();

    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="work-hours-${year}-${month}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('monthly pdf error:', err);
    res.status(500).json({ error: 'PDF export failed' });
  }
});


// Serve React app
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});


app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על פורט ${PORT}`);
  console.log(`🌐 פתח את הדפדפן ולך ל: http://localhost:${PORT}`);
});
