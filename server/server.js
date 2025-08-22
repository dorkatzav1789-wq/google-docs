const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const { dbFunctions } = require('./supabase-database');
const { initializeDatabase } = require('./initData');

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

// ייצוא PDF (השארתי כפי שהיה)
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { quoteId } = req.body;

    const quote = await dbFunctions.getQuoteById(quoteId);
    const items = await dbFunctions.getQuoteItems(quoteId);
    if (!quote) return res.status(404).json({ error: 'הצעת מחיר לא נמצאה' });

    const html = generateQuoteHTML(quote, items);

    // 🚀 הגדרות יציבות ל-Render
    const browser = await puppeteer.launch({
      headless: true, // או "new" אם אתה על Puppeteer 22+
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
      ],
      // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();

    // פחות רגיש לתלויות רשת פנימיות
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="quote-${quoteId}.pdf"`);
    res.end(pdf); // עדיף ל-binary
  } catch (error) {
    console.error('שגיאה בייצוא PDF:', error?.message, error?.stack);
    res.status(500).json({ error: error?.message || 'שגיאה בייצוא PDF' });
  }
});


// ------- generateQuoteHTML (כמו שהיה אצלך) -------
function generateQuoteHTML(quote, items) {
  const formatCurrency = (amount) => `₪${amount.toLocaleString()}`;
  const formatDate = (dateString) => {
    if (!dateString) return 'לא צוין';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };
  // ... (נשאר כמו בקובץ שלך, קיצרתי כאן לחיסכון במקום)
  return `<!DOCTYPE html> ... `;
}

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 השרת רץ על פורט ${PORT}`);
  console.log(`🌐 פתח את הדפדפן ולך ל: http://localhost:${PORT}`);
});
