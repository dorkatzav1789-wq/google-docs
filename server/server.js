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
app.get('/api/items', async (req, res) => {
  try {
    const items = await dbFunctions.getAllItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// כינויים
app.get('/api/aliases', async (req, res) => {
  try {
    const aliases = await dbFunctions.getAllAliases();
    res.json(aliases);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
app.post('/api/parse-quote', async (req, res) => {
  try {
    const { text } = req.body;
    const lines = text.split('\n').filter(line => line.trim());

    const items = await dbFunctions.getAllItems();
    const aliases = await dbFunctions.getAllAliases();

    const parsedItems = [];

    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(.+?)\s+(\d+)\|?$/);
      if (match) {
        const [, quantity, itemText, price] = match;

        const alias = aliases.find(a =>
            a.alias.toLowerCase() === itemText.toLowerCase() ||
            itemText.toLowerCase().includes(a.alias.toLowerCase())
        );

        let item;
        let finalPrice = parseInt(price);

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
          const totalPrice = finalPrice;
          const discount = (unitPrice * parseInt(quantity)) - totalPrice;

          parsedItems.push({
            name: item.name,
            description: item.description,
            unit_price: unitPrice,
            quantity: parseInt(quantity),
            discount: Math.max(0, discount),
            total: totalPrice,
            matched_text: itemText
          });
        }
      }
    }

    res.json(parsedItems);
  } catch (error) {
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


// Serve React app
app.get('/', (req, res) => {
  res.send('API is running 🚀');
});


app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על פורט ${PORT}`);
  console.log(`🌐 פתח את הדפדפן ולך ל: http://localhost:${PORT}`);
});
