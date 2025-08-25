const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbFunctions } = require('./supabase-database');
const { initializeDatabase } = require('./initData');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const app = express();
const PORT = process.env.PORT || 5000;

app.use("/static", express.static(path.join(process.cwd(), "server/static")));

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

    const bank = quote?.bank || null; // אם תרצה להזין פרטי בנק מה-DB

    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>הצעת מחיר #${quote.id ?? ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    html, body {
      background: #ffffff; color: #111827;
      font-family: "Heebo","Segoe UI",Arial,Tahoma,sans-serif;
      margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
    @media print {
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .no-print { display: none !important; }
      a[href]:after { content: "" !important; }
    }

    .sheet { padding: 0; }

    /* פס עליון עם SVG */
    .logo-top {
      display:flex; align-items:center; justify-content:space-between;
      margin: 0 0 8px 0;
    }
    .logo-top .event-date { color:#374151; font-size:13.5px; }
    .logo svg { width: 180px; height: auto; display:block; }

    /* כותרת */
    .header {
      display: grid; grid-template-columns: 1fr;
      gap: 12px; padding-bottom: 10px; margin-bottom: 14px;
      border-bottom: 2px solid #3b82f6;
    }
    .brand-block { display: flex; flex-direction: column; gap: 6px; }
    .brand-title { margin: 0; font-size: 26px; color: #1e40af; font-weight: 800; letter-spacing: 0.2px; }
    .brand-meta { font-size: 13px; color: #374151; line-height: 1.45; }

    /* תיבה כחולה קבועה "מאת:" */
    .from-box {
      margin-top: 6px;
      background: #eef2ff; border: 1px solid #c7d2fe;
      border-radius: 10px; padding: 8px 12px;
      font-size: 12.5px; color: #1f2937; line-height: 1.5;
    }
    .from-box .label { font-weight: 800; color: #1e40af; }

    /* כרטיסיות */
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 12px; }
    .card-title { margin: 0 0 8px 0; font-weight: 800; color: #374151; font-size: 15px; }
    .row { margin: 6px 0; }
    .label { font-weight: 700; color: #6b7280; }

    /* כרטיס כחול (כמו סה"כ כולל מע"מ) */
    .blue-card {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
    }
    .blue-card .card-title { color: #1e3a8a; }
    .blue-card .label { color: #1f2a5a; }

    /* טבלה */
    table { width: 100%; border-collapse: collapse; margin: 10px 0 8px 0; font-size: 14px; table-layout: fixed; }
    th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: right; vertical-align: top; }
    thead th { background: #f3f4f6; color: #374151; font-weight: 700; }
    .num { direction: ltr; unicode-bidi: bidi-override; text-align: left; }

    /* סיכום */
    .summary { margin-top: 14px; border-top: 2px solid #e5e7eb; padding-top: 10px; font-size: 15px; }
    .sum-row { display: flex; justify-content: space-between; margin: 6px 0; }
    .grand-banner {
      margin-top: 10px; background: #eef2ff; border: 1px solid #c7d2fe;
      border-radius: 10px; padding: 10px 12px; display:flex;
      justify-content:space-between; align-items:center; font-weight:800; font-size:18px;
    }

    /* תחתית: אישור + בנק */
    .sections { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-top: 14px; }
    .section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
    .section h3 { margin: 0 0 8px 0; font-size: 15px; color: #374151; }
    .approve-box { min-height: 84px; }
    .bank-row { display:flex; gap:10px; margin:6px 0; }
    .bank-row .label { min-width: 90px; }

    /* חתימה */
    .signature-block {
      border-top: 1px dashed #9ca3af;
      margin-top: 24px;
      padding-top: 12px;
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
    }
    .signature-block strong { font-weight: 700; }

    .footer { margin-top: 18px; color: #6b7280; font-size: 12.5px; }

    .page-break { page-break-before: always; }

    /* רשימות בתוך כחול */
    .blue-card ul { margin: 8px 0 0; padding: 0 18px 0 0; }
    .blue-card li { margin: 4px 0; }
  </style>
</head>
<body>

  <!-- עמוד 1: SVG בראש העמוד -->
  <div class="sheet">
    <div class="logo-top">
      <div class="logo">
        <!-- TODO: PASTE YOUR SVG HERE -->
       <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="303" height="122" viewBox="0 0 403 122">
                    <image xlink:href="data:image/png;base64,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" x="0" y="0" width="403" height="122"/>
                  </svg>
          <!-- <image xlink:href="data:image/png;base64,...." x="0" y="0" width="403" height="122"/> -->
        </svg>
      </div>
      <div class="event-date"></div>
    </div>

    <div class="header">
      <div class="brand-block">
        <h1 class="brand-title">הצעת מחיר</h1>
        <div class="brand-meta">מספר הצעה: ${quote.id ?? ''}</div>

        <!-- "מאת:" קבוע -->
<img src="http://localhost:5000/static/pdf1.png" >
      </div>
    </div>

    <!-- פרטי האירוע + פרטי לקוח ב"חלוניות כחולות" -->
    <div class="info">
      <div class="card blue-card">
        <h2 class="card-title">פרטי האירוע</h2>
        <div class="row"><span class="label">שם האירוע:</span> ${quote.event_name ?? ''}</div>
        <div class="row"><span class="label">תאריך:</span> ${formatDate(quote.event_date)}</div>
        ${quote.event_hours ? `<div class="row"><span class="label">שעות:</span> ${quote.event_hours}</div>` : ''}
        ${quote.special_notes ? `<div class="row"><span class="label">הערות:</span> ${quote.special_notes}</div>` : ''}
      </div>

      <div class="card blue-card">
        <h2 class="card-title">פרטי לקוח</h2>
        <div class="row"><span class="label">שם:</span> ${quote.client_name ?? ''}</div>
        ${quote.client_company ? `<div class="row"><span class="label">חברה:</span> ${quote.client_company}</div>` : ''}
        ${quote.client_phone ? `<div class="row"><span class="label">טלפון:</span> ${quote.client_phone}</div>` : ''}
        ${quote.client_company_id ? `<div class="row"><span class="label">ח.פ / ע.מ:</span> ${quote.client_company_id}</div>` : ''}
      </div>
    </div>

    <!-- טבלת פריטים -->
    <table>
      <thead>
        <tr>
          <th style="width:20%">שם הפריט</th>
          <th>תיאור</th>
          <th style="width:13%">מחיר יחידה</th>
          <th style="width:10%">כמות</th>
          <th style="width:12%">הנחה</th>
          <th style="width:15%">סה"כ</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => `
          <tr>
            <td>${i.item_name ?? i.name ?? ''}</td>
            <td>${i.item_description ?? i.description ?? ''}</td>
            <td class="num">${formatCurrency(i.unit_price)}</td>
            <td class="num">${i.quantity ?? 0}</td>
            <td class="num">${i.discount && i.discount > 0 ? `-${formatCurrency(i.discount)}` : '-'}</td>
            <td class="num">${formatCurrency(i.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- סיכומים -->
    <div class="summary">
      <div class="sum-row">
        <span>סה"כ לפני הנחה:</span>
        <span class="num">${formatCurrency(quote.total_before_discount)}</span>
      </div>
      ${quote.discount_percent && quote.discount_percent > 0 ? `
        <div class="sum-row">
          <span>הנחה (${quote.discount_percent}%):</span>
          <span class="num">-${formatCurrency(quote.discount_amount)}</span>
        </div>
        <div class="sum-row">
          <span>סה"כ אחרי הנחה:</span>
          <span class="num">${formatCurrency(quote.total_after_discount)}</span>
        </div>
      ` : ''}
      <div class="sum-row">
        <span>מע"מ (${quote.vat_rate ?? 18}%):</span>
        <span class="num">+${formatCurrency(quote.vat_amount)}</span>
      </div>

      <div class="grand-banner">
        <span>סה"כ כולל מע"מ:</span>
        <span class="num">${formatCurrency(quote.final_total)}</span>
      </div>
    </div>

    ${quote.terms || quote.notes ? `
      <div class="section" style="margin-top:12px;">
        <h3>הבהרות ותנאים</h3>
        <div style="white-space:pre-wrap; line-height:1.6; font-size:13.5px; color:#374151;">
          ${(quote.terms ? quote.terms + '\n' : '') + (quote.notes ?? '')}
        </div>
      </div>
    ` : ''}

    <div class="footer">
      נוצר ב: ${formatDate(quote.created_at)}
    </div>

    <div class="signature-block">
      <div><strong>בברכה,</strong> דור קצב</div>
      <div>מנהל מערכות מולטימדיה, תאורה, הגברה, מסכי לד</div>
      <div>📞 052-489-1025</div>
      <div>✉️ Dor.katzav.valley@gmail.com</div>
    </div>
  </div>

  <!-- עמוד 2: SVG למעלה + תאריך אירוע, ושתי חלוניות כחולות -->
  <div class="sheet page-break">
    <div class="logo-top">
      <div class="logo">
        <!-- אותו SVG למעלה -->
        <!-- TODO: PASTE YOUR SVG HERE (שוב) -->
       <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="303" height="122" viewBox="0 0 403 122">
                    <image xlink:href="data:image/png;base64,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" x="0" y="0" width="403" height="122"/>
                  </svg>
      </div>
      <div class="event-date"><strong>תאריך האירוע:</strong> ${formatDate(quote.event_date)}</div>
    </div>

    <img src="http://localhost:3000/static/pdf2.png">


    <!-- חלונית כחולה #3 – אישור הזמנה (שם/חתימה) -->
    <div class="card blue-card" style="margin-top: 12px;">
      <h2 class="card-title">אישור הזמנה</h2>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:6px; font-size:14px;">
        <div><span class="label">שם:</span> ______________________________</div>
        <div><span class="label">חתימה:</span> ______________________________</div>
      </div>
    </div>
  </div>

</body>
</html>
`;
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

// ===== Employees =====
app.post('/api/employees', async (req, res) => {
  try {
    const {
      first_name = '',
      last_name = '',
      phone = null,
      email = null,
      hourly_rate,
      name,           // אם בטעות נשלח name — נתחשב בו
      is_active,
    } = req.body || {};

    // ולידציה בסיסית
    const fn = String(first_name || '').trim();
    const ln = String(last_name || '').trim();
    const fullName = (name && String(name).trim()) || `${fn} ${ln}`.trim();
    if (!fullName) {
      return res.status(400).json({ error: 'יש להזין שם פרטי/משפחה או name' });
    }

    const rateNum = Number(hourly_rate);
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      return res.status(400).json({ error: 'hourly_rate חייב להיות מספר לא־שלילי' });
    }

    const payload = {
      first_name: fn || null, // לעמודות החדשות (אם יש)
      last_name: ln || null,
      phone: phone || null,
      email: email || null,
      hourly_rate: rateNum,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    };

    const created = await dbFunctions.addEmployee(payload);
    return res.json(created);
  } catch (err) {
    console.error('POST /api/employees error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
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
