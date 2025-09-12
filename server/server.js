// server/server.js
"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// מודולים פנימיים
const { dbFunctions } = require("./supabase-database");
const { initializeDatabase } = require("./initData");

// Puppeteer – תומך גם בשרת (Lambda/Render) וגם בלוקאלי
const chromium = require("@sparticuz/chromium");
let puppeteer;
try {
  // בפרודקשן (serverless) משתמשים ב-puppeteer-core
  puppeteer = require("puppeteer-core");
} catch (_) {
  // בלוקאלי – fallback ל puppeteer מלא
  puppeteer = require("puppeteer");
}


const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ===================== Middleware ===================== //
app.use(cors());
app.use(express.json());

// ===================== Static ===================== //

// React build (אם קיים)
// React build (אם קיים)
const clientBuild = path.join(__dirname, "../client/build");
app.use(express.static(clientBuild));

// קבצים סטטיים של השרת (למשל תמונות ל-PDF)
const serverStatic = path.join(__dirname, "static");
app.use("/static", express.static(serverStatic));

// הוספת routes ישירים לתמונות (לנוחות)
app.get("/pdf1.png", (req, res) => {
  res.sendFile(path.join(__dirname, "static/pdf1.png"));
});

app.get("/pdf2.png", (req, res) => {
  res.sendFile(path.join(__dirname, "static/pdf2.png"));
});

app.get("/static/pdf1.png", (req, res) => {
  res.sendFile(path.join(__dirname, "static/pdf1.png"));
});

app.get("/static/pdf2.png", (req, res) => {
  res.sendFile(path.join(__dirname, "static/pdf2.png"));
});
// ===================== Init Data ===================== //
(async () => {
  try {
    await initializeDatabase();
    console.log("✅ Database initialized (or already seeded).");
  } catch (e) {
    console.error("❌ initializeDatabase failed:", e?.message || e);
  }
})();

// ===================== API ROUTES ===================== //

// ------- Items -------
app.get("/api/items", async (_req, res) => {
  try {
    const items = await dbFunctions.getAllItems();
    res.json(items || []);
  } catch (e) {
    console.error("GET /api/items error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { name, description, price } = req.body || {};
    if (!name || price == null || isNaN(Number(price))) {
      return res.status(400).json({ error: "name & price required" });
    }
    const id = await dbFunctions.addItem(name.trim(), description || "", Number(price));
    res.status(201).json({ id, name: name.trim(), description: description || "", price: Number(price) });
  } catch (e) {
    console.error("POST /api/items error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

// ------- Aliases -------
app.post("/api/aliases", async (req, res) => {
  try {
    const { alias, item_name, price_override } = req.body || {};
    if (!alias || !item_name) {
      return res.status(400).json({ error: "alias & item_name required" });
    }
    const id = await dbFunctions.addAlias(alias.trim(), item_name.trim(), price_override ?? null);
    res.status(201).json({ id, alias: alias.trim(), item_name: item_name.trim(), price_override: price_override ?? null });
  } catch (e) {
    console.error("POST /api/aliases error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

// ------- Clients -------
app.get("/api/clients", async (_req, res) => {
  try {
    const clients = await dbFunctions.getAllClients();
    res.json(clients || []);
  } catch (e) {
    console.error("GET /api/clients error:", e);
    res.status(500).json({ error: e?.message || "Server error" });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone, company, company_id } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "שם לקוח הוא שדה חובה" });
    }
    const clientId = await dbFunctions.addClient(
        name.trim(),
        phone ?? null,
        company ?? null,
        company_id ?? null
    );
    res.status(201).json({ id: clientId, message: "לקוח נוסף בהצלחה" });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

// ------- Quotes -------
app.post("/api/quotes", async (req, res) => {
  try {
    const { quote, items } = req.body || {};
    if (!quote || !Array.isArray(items)) {
      return res.status(400).json({ error: "quote & items required" });
    }

    const quoteId = await dbFunctions.saveQuote(quote);
    await dbFunctions.saveQuoteItems(quoteId, items);

    res.json({ id: quoteId, message: "הצעת מחיר נשמרה בהצלחה" });
  } catch (error) {
    console.error("POST /api/quotes error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

app.get("/api/quotes", async (_req, res) => {
  try {
    const quotes = await dbFunctions.getAllQuotes();
    res.json(quotes || []);
  } catch (error) {
    console.error("GET /api/quotes error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

app.get("/api/quotes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "מזהה הצעה לא תקין" });

    const quote = await dbFunctions.getQuoteById(id);
    if (!quote) return res.status(404).json({ error: "הצעת מחיר לא נמצאה" });

    const items = await dbFunctions.getQuoteItems(id);
    res.json({ quote, items: items || [] });
  } catch (error) {
    console.error("GET /api/quotes/:id error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

app.delete("/api/quotes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "מזהה הצעה לא תקין" });

    await dbFunctions.deleteQuote(id);
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/quotes error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

// ------- Items Search (DB) -------
app.get("/api/search/items", async (req, res) => {
  try {
    const q = (req.query?.q || "").toString().trim();
    if (!q) return res.json([]);
    const results = await dbFunctions.searchItems(q);
    res.json(results || []);
  } catch (error) {
    console.error("GET /api/search/items error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

// ------- Parse Quote -------
app.post("/api/parse-quote", async (req, res) => {
  try {
    const text = (req.body?.text || "").toString();
    if (!text.trim()) return res.json({ items: [], unknown: [] });

    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    const items = (await dbFunctions.getAllItems()) || [];
    const aliases = (await dbFunctions.getAllAliases()) || [];

    const matched = [];
    const unknown = [];

    for (const line of lines) {
      const m = line.match(/^(\d+)\s+(.+?)\s+(\d+)\|?$/);
      if (!m) {
        unknown.push({ line, quantity: 1, raw_text: line, unit_price: null });
        continue;
      }

      const [, qtyStr, itemText, priceStr] = m;
      const quantity = parseInt(qtyStr, 10);
      const typedUnit = parseInt(priceStr, 10); // ⬅️ פירוש חדש: מחיר ליחידה שנכתב

      const alias = aliases.find(a =>
          a.alias.toLowerCase() === itemText.toLowerCase() ||
          itemText.toLowerCase().includes(a.alias.toLowerCase())
      );

      let item = null;
      if (alias) {
        item = items.find(i => i.name === alias.item_name);
      } else {
        item = items.find(i =>
            i.name.toLowerCase().includes(itemText.toLowerCase()) ||
            itemText.toLowerCase().includes(i.name.toLowerCase())
        );
      }

      if (item) {
        // מחיר ליחידה בפועל: עדיפות למה שהמשתמש כתב, אח״כ דריסת אליאס, אחרת מחיר הבסיס
        const unitBase = Number(item.price || 0);
        const unitFromAlias = alias?.price_override ?? null;
        const appliedUnit = Number.isFinite(typedUnit)
            ? typedUnit
            : (unitFromAlias ?? unitBase);

        const total = appliedUnit * quantity;

        matched.push({
          name: item.name,
          description: item.description,
          unit_price: appliedUnit,
          quantity,
          discount: 0,
          total,
          matched_text: itemText
        });
      } else {
        // לא זוהה: נשמור את המספר כמחיר ליחידה שהמשתמש התכוון אליו
        unknown.push({
          line,
          quantity,
          raw_text: itemText,
          unit_price: Number.isFinite(typedUnit) ? typedUnit : null,
        });
      }
    }

    res.json({ items: matched, unknown });
  } catch (error) {
    console.error("POST /api/parse-quote error:", error);
    res.status(500).json({ error: error?.message || "Server error" });
  }
});

// ===================== PDF Export ===================== //
app.post("/api/export-pdf", async (req, res) => {
  try {
    const quoteId = Number(req.body?.quoteId);
    if (!quoteId) return res.status(400).json({ error: "quoteId is required" });

    const quote = await dbFunctions.getQuoteById(quoteId);
    if (!quote) return res.status(404).json({ error: "הצעת מחיר לא נמצאה" });

    const items = (await dbFunctions.getQuoteItems(quoteId)) || [];

    // טעינת התמונות כ-base64 (חובה לפרודקשן)
    let pdf1Base64, pdf2Base64;
    try {
      const pdf1Path = path.join(__dirname, "static/pdf1.png");
      const pdf2Path = path.join(__dirname, "static/pdf2.png");
      
      console.log("🔍 מחפש תמונות ב:", pdf1Path, pdf2Path);
      console.log("📁 קובץ pdf1 קיים:", fs.existsSync(pdf1Path));
      console.log("📁 קובץ pdf2 קיים:", fs.existsSync(pdf2Path));
      
      pdf1Base64 = fs.readFileSync(pdf1Path).toString("base64");
      pdf2Base64 = fs.readFileSync(pdf2Path).toString("base64");
      
      console.log("✅ תמונות נטענו בהצלחה!");
      console.log("📏 גודל pdf1 (base64):", pdf1Base64.length, "תווים");
      console.log("📏 גודל pdf2 (base64):", pdf2Base64.length, "תווים");
      console.log("🔍 pdf1 מתחיל ב:", pdf1Base64.substring(0, 50));
      console.log("🔍 pdf2 מתחיל ב:", pdf2Base64.substring(0, 50));
      
    } catch (error) {
      console.error("❌ שגיאה בטעינת תמונות:", error);
      console.error("📋 פרטי השגיאה:", error.message);
      // אם התמונות לא קיימות, השתמש בתמונות ריקות או הסר אותן
      pdf1Base64 = "";
      pdf2Base64 = "";
    }

    const html = generateQuoteHTML(quote, items, pdf1Base64, pdf2Base64);
    
    console.log("📄 HTML נוצר בהצלחה!");
    console.log("📏 אורך HTML:", html.length, "תווים");
    console.log("🖼️ האם יש תמונות ב-HTML:", html.includes("data:image/png;base64"));
    console.log("🖼️ האם יש pdf1 ב-HTML:", html.includes("pdf1"));
    console.log("🖼️ האם יש pdf2 ב-HTML:", html.includes("pdf2"));

    // הגדרות הפעלה לסביבות שונות
    const isServerless = !!process.env.AWS_REGION || !!process.env.LAMBDA_TASK_ROOT || process.env.PUPPETEER_EXECUTABLE_PATH;

    const launchOptions = isServerless
        ? {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath()),
          headless: chromium.headless,
        }
        : {
          headless: "new",
          // בלוקאלי puppeteer מלא יודע להביא executablePath לבד; אל תגדיר אם לא צריך
        };

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // לוודא גישה לתמונות סטטיות ע"י baseURL
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
      preferCSSPageSize: false,
    });

    await browser.close();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="quote-${quoteId}.pdf"`);
    return res.send(pdf);
  } catch (err) {
    console.error("שגיאה בייצוא PDF:", err?.message, err?.stack);
    res.status(500).json({ error: "PDF export failed" });
  }
});

// ===================== React Fallback ===================== //
// אם זה שרת פרונט+בק – החזרת index.html לראוטים שאינם API/סטטי
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/static/")) return next();
  try {
    return res.sendFile(path.join(clientBuild, "index.html"));
  } catch {
    return res.status(404).send("Not found");
  }
});

// ===================== Helpers ===================== //
function generateQuoteHTML(quote, items, pdf1Base64, pdf2Base64) {
  const formatCurrency = (n) =>
      typeof n === "number" && !isNaN(n) ? `₪${n.toLocaleString("he-IL")}` : "-";

  const formatDate = (dateString) => {
    if (!dateString) return "לא צוין";
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? "לא צוין" : d.toLocaleDateString("he-IL");
  };

  // אם יש לכם פרטי בנק ב-quote.bank
  const bank = quote?.bank || null;

  // חשוב: שימוש ב-/static/pdf1.png כדי שהדפדפן של Puppeteer ימצא את הקובץ
  // שים את התמונה ב: server/static/pdf1.png
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>הצעת מחיר #${quote.id ?? ""}</title>
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    html, body { background:#fff; color:#111827; font-family:"Heebo","Segoe UI",Arial,Tahoma,sans-serif; margin:0; padding:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    @page { size:A4; margin:16mm 14mm 18mm 14mm; }
    @media print { thead {display:table-header-group;} tfoot{display:table-footer-group;} .no-print{display:none !important;} a[href]:after{content:"" !important;} }
    .sheet { padding:0; }
    .logo-top { display:flex; align-items:center; justify-content:space-between; margin:0 0 8px 0; }
    .logo svg { width:180px; height:auto; display:block; }
    .event-date { color:#374151; font-size:13.5px; }

    .header { display:grid; grid-template-columns:1fr; gap:12px; padding-bottom:10px; margin-bottom:14px; border-bottom:2px solid #3b82f6; }
    .brand-block { display:flex; flex-direction:column; gap:6px; }
    .brand-title { margin:0; font-size:26px; color:#1e40af; font-weight:800; letter-spacing:.2px; }
    .brand-meta { font-size:13px; color:#374151; line-height:1.45; }

    .info { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px; }
    .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
    .card-title { margin:0 0 8px 0; font-weight:800; color:#374151; font-size:15px; }
    .row { margin:6px 0; }
    .label { font-weight:700; color:#6b7280; }

    .blue-card { background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; }
    .blue-card .card-title { color:#1e3a8a; }
    .blue-card .label { color:#1f2a5a; }

    table { width:100%; border-collapse:collapse; margin:10px 0 8px 0; font-size:14px; table-layout:fixed; }
    th, td { border:1px solid #d1d5db; padding:9px 8px; text-align:right; vertical-align:top; }
    thead th { background:#f3f4f6; color:#374151; font-weight:700; }
    .num { direction:ltr; unicode-bidi:bidi-override; text-align:left; }

    .summary { margin-top:14px; border-top:2px solid #e5e7eb; padding-top:10px; font-size:15px; }
    .sum-row { display:flex; justify-content:space-between; margin:6px 0; }
    .grand-banner { margin-top:10px; background:#eef2ff; border:1px solid #c7d2fe; border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; font-weight:800; font-size:18px; }

    .sections { display:grid; grid-template-columns:2fr 1fr; gap:16px; margin-top:14px; }
    .section { border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; }
    .section h3 { margin:0 0 8px 0; font-size:15px; color:#374151; }

    .signature-block { border-top:1px dashed #9ca3af; margin-top:24px; padding-top:12px; font-size:13px; color:#374151; line-height:1.6; }
    .footer { margin-top:18px; color:#6b7280; font-size:12.5px; }
    .page-break { page-break-before:always; }
  </style>
</head>
<body>

  <div class="sheet">
    <div class="logo-top">
      <div class="logo">
        <!-- שים כאן SVG לוגו אם תרצה, או השאר ריק -->
        <!-- דוגמה: <svg viewBox="0 0 100 20" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-size="14">My Logo</text></svg> -->
      </div>
      <div class="event-date"></div>
    </div>

    <div class="header">
      <div class="brand-block">
        <h1 class="brand-title">הצעת מחיר</h1>
        <div class="brand-meta">מספר הצעה: ${quote.id ?? ""}</div>
        ${pdf1Base64 ? `<img src="data:image/png;base64,${pdf1Base64}" alt="header-img" style="max-width:220px; height:auto;">` : ''}
      </div>
    </div>

    <div class="info">
      <div class="card blue-card">
        <h2 class="card-title">פרטי האירוע</h2>
        <div class="row"><span class="label">שם האירוע:</span> ${quote.event_name ?? ""}</div>
        <div class="row"><span class="label">תאריך:</span> ${formatDate(quote.event_date)}</div>
        ${quote.event_hours ? `<div class="row"><span class="label">שעות:</span> ${quote.event_hours}</div>` : ""}
        ${quote.special_notes ? `<div class="row"><span class="label">הערות:</span> ${quote.special_notes}</div>` : ""}
      </div>

      <div class="card blue-card">
        <h2 class="card-title">פרטי לקוח</h2>
        <div class="row"><span class="label">שם:</span> ${quote.client_name ?? ""}</div>
        ${quote.client_company ? `<div class="row"><span class="label">חברה:</span> ${quote.client_company}</div>` : ""}
        ${quote.client_phone ? `<div class="row"><span class="label">טלפון:</span> ${quote.client_phone}</div>` : ""}
        ${quote.client_company_id ? `<div class="row"><span class="label">ח.פ / ע.מ:</span> ${quote.client_company_id}</div>` : ""}
      </div>
    </div>

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
        ${items
      .map((i) => {
        const unit = Number(i.unit_price) || 0;
        const qty = Number(i.quantity) || 0;
        const disc = Number(i.discount) || 0;
        const total = Number(i.total) || unit * qty - disc;
        return `
          <tr>
            <td>${i.item_name ?? i.name ?? ""}</td>
            <td>${i.item_description ?? i.description ?? ""}</td>
            <td class="num">${formatCurrency(unit)}</td>
            <td class="num">${qty}</td>
            <td class="num">${disc > 0 ? `-${formatCurrency(disc)}` : "-"}</td>
            <td class="num">${formatCurrency(total)}</td>
          </tr>`;
      })
      .join("")}
      </tbody>
    </table>

    <div class="summary">
      <div class="sum-row">
        <span>סה"כ לפני הנחה:</span>
        <span class="num">${formatCurrency(Number(quote.total_before_discount) || 0)}</span>
      </div>

      ${
      quote.discount_percent && Number(quote.discount_percent) > 0
          ? `
        <div class="sum-row">
          <span>הנחה (${Number(quote.discount_percent)}%):</span>
          <span class="num">-${formatCurrency(Number(quote.discount_amount) || 0)}</span>
        </div>
        <div class="sum-row">
          <span>סה"כ אחרי הנחה:</span>
          <span class="num">${formatCurrency(Number(quote.total_after_discount) || 0)}</span>
        </div>
      `
          : ""
  }

      <div class="sum-row">
        <span>מע"מ (${quote.vat_rate ?? 18}%):</span>
        <span class="num">+${formatCurrency(Number(quote.vat_amount) || 0)}</span>
      </div>

      <div class="grand-banner">
        <span>סה"כ כולל מע"מ:</span>
        <span class="num">${formatCurrency(Number(quote.final_total) || 0)}</span>
      </div>
    </div>

    ${
      quote.terms || quote.notes
          ? `
      <div class="section" style="margin-top:12px;">
        <h3>הבהרות ותנאים</h3>
        <div style="white-space:pre-wrap; line-height:1.6; font-size:13.5px; color:#374151;">
          ${(quote.terms ? quote.terms + "\n" : "") + (quote.notes ?? "")}
        </div>
      </div>
    `
          : ""
  }

    <div class="footer">נוצר ב: ${formatDate(quote.created_at)}</div>

    <div class="signature-block">
      <div><strong>בברכה,</strong> דור קצב</div>
      <div>מנהל מערכות מולטימדיה, תאורה, הגברה, מסכי לד</div>
      <div>📞 052-489-1025</div>
      <div>✉️ Dor.katzav.valley@gmail.com</div>
    </div>
  </div>

  <div class="sheet page-break">
    <div class="logo-top">
      <div class="logo"></div>
      <div class="event-date">${formatDate(quote.event_date)}</div>
    </div>
${pdf2Base64 ? `<img src="data:image/png;base64,${pdf2Base64}" alt="header-img" style="max-width:220px; height:auto;">` : ''}
    <div class="sections">
      <div class="section">
        <h3>אישור הזמנה</h3>
        <p>אשר/י בחתימה שהפרטים לעיל מאושרים וכי ידוע לך שהמחירים אינם כוללים הובלה/עומסים חריגים אלא אם צוין אחרת.</p>
        <p>שם מלא: ____________________ חתימה: ____________ תאריך: ${formatDate(new Date())}</p>
      </div>
      <div class="section">
        <h3>פרטי תשלום</h3>
        ${
      bank
          ? `
          <div class="row"><span class="label">בנק:</span> ${bank.name || ""}</div>
          <div class="row"><span class="label">מס' סניף:</span> ${bank.branch || ""}</div>
          <div class="row"><span class="label">מס' חשבון:</span> ${bank.account || ""}</div>
          <div class="row"><span class="label">שם בעל החשבון:</span> ${bank.owner || ""}</div>
        `
          : `<p>פרטי תשלום יסופקו לפי הצורך.</p>`
  }
      </div>
    </div>
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
          <td>${fmtNis(wh.daily_rate)}</td>
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
        <th>שכר יומי</th>
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

// קבלת העובד של המשתמש המחובר
app.get('/api/employees/current', async (req, res) => {
  try {
    const user = await dbFunctions.getUserByEmail(req.headers['x-user-email']);
    if (!user) {
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }
    const employee = await dbFunctions.getEmployeeByEmail(user.email);
    if (!employee) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }
    res.json(employee);
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
      return res.status(400).json({ error: 'שכר לשעה חייב להיות מספר לא־שלילי' });
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

// מחיקת עובד
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'מזהה עובד לא תקין' });
    }
    await dbFunctions.deleteEmployee(id);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/employees/:id error:', error);
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

// ===== Reminders routes =====
// קבלת כל התזכורות
app.get('/api/reminders', async (req, res) => {
  try {
    const reminders = await dbFunctions.getAllReminders();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת תזכורות לפי הצעת מחיר
app.get('/api/reminders/quote/:quoteId', async (req, res) => {
  try {
    const quoteId = Number(req.params.quoteId);
    if (!quoteId) return res.status(400).json({ error: "מזהה הצעה לא תקין" });

    const reminders = await dbFunctions.getRemindersByQuote(quoteId);
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// הוספת תזכורת
app.post('/api/reminders', async (req, res) => {
  try {
    const { quote_id, reminder_date, reminder_type, email_addresses, message } = req.body;
    
    if (!quote_id || !reminder_date || !reminder_type) {
      return res.status(400).json({ error: "שדות חובה: quote_id, reminder_date, reminder_type" });
    }

    const reminderData = {
      quote_id: Number(quote_id),
      reminder_date,
      reminder_type,
      email_addresses: email_addresses || [],
      message: message || null,
      is_sent: false
    };

    const reminder = await dbFunctions.addReminder(reminderData);
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// עדכון תזכורת
app.put('/api/reminders/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "מזהה תזכורת לא תקין" });

    const reminder = await dbFunctions.updateReminder(id, req.body);
    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// מחיקת תזכורת
app.delete('/api/reminders/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "מזהה תזכורת לא תקין" });

    await dbFunctions.deleteReminder(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// יצירת תזכורת אוטומטית עבור הצעת מחיר
app.post('/api/reminders/auto/:quoteId', async (req, res) => {
  try {
    const quoteId = Number(req.params.quoteId);
    if (!quoteId) return res.status(400).json({ error: "מזהה הצעה לא תקין" });

    // קבלת פרטי ההצעה
    const quote = await dbFunctions.getQuoteById(quoteId);
    if (!quote) return res.status(404).json({ error: "הצעת מחיר לא נמצאה" });

    if (!quote.event_date) {
      return res.status(400).json({ error: "לא ניתן ליצור תזכורת ללא תאריך אירוע" });
    }

    const reminder = await dbFunctions.createAutoReminder(quoteId, quote.event_date);
    if (!reminder) {
      return res.status(409).json({ error: "תזכורת כבר קיימת עבור הצעה זו" });
    }

    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת תזכורות שצריכות להישלח
app.get('/api/reminders/pending', async (req, res) => {
  try {
    const reminders = await dbFunctions.getPendingReminders();
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// סימון תזכורת כנשלחה
app.post('/api/reminders/:id/mark-sent', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "מזהה תזכורת לא תקין" });

    const reminder = await dbFunctions.markReminderAsSent(id);
    res.json(reminder);
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
