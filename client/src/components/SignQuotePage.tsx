import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { signingAPI } from '../services/supabaseAPI';
import { QuoteWithItems, QuoteItem } from '../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type GroupedItem = QuoteItem & { splits: QuoteItem[] };

const formatCurrency = (amount: number) => `₪${Number(amount || 0).toLocaleString('he-IL')}`;
const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'לא צוין';
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL');
};

const SignQuotePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<QuoteWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<any>(null);

  const today = useMemo(() => new Date().toLocaleDateString('he-IL'), []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setError('קישור לא תקין');
        setLoading(false);
        return;
      }
      try {
        const result = await signingAPI.getByToken(token);
        if (!active) return;
        setData(result);
        if (result.quote.signing_status === 'signed') {
          setDone(true);
        }
      } catch (e) {
        console.error('שגיאה בטעינת הצעה לחתימה:', e);
        if (active) setError('לא ניתן לטעון את ההצעה. ייתכן שהקישור פג תוקף.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  // קיבוץ פריטים רגילים יחד עם הפיצולים שלהם
  const groupedItems = useMemo<GroupedItem[]>(() => {
    if (!data) return [];
    const all = data.items || [];
    const regular = all.filter((it) => !it.name?.startsWith('פיצול '));
    const splits = all.filter((it) => it.name?.startsWith('פיצול '));
    const result: GroupedItem[] = regular.map((it) => ({ ...it, splits: [] }));
    let idx = 0;
    splits.forEach((split) => {
      if (idx < result.length) {
        result[idx].splits.push(split);
      }
      idx++;
    });
    return result;
  }, [data]);

  const totals = useMemo(() => {
    if (!data) {
      return { subtotal: 0, discountAmount: 0, totalAfterDiscount: 0, extraDiscountAmount: 0, totalAfterExtra: 0, vat: 0, final: 0 };
    }
    const subtotal = (data.items || []).reduce((sum, it) => sum + Number(it.total || 0), 0);
    const discountPercent = Number(data.quote.discount_percent || 0);
    const discountAmount = Math.round(subtotal * (discountPercent / 100));
    const totalAfterDiscount = subtotal - discountAmount;
    const extraPercent = Number(data.quote.extra_vat_discount_percent || 0);
    const extraDiscountAmount = Math.round(totalAfterDiscount * (extraPercent / 100));
    const totalAfterExtra = Math.max(totalAfterDiscount - extraDiscountAmount, 0);
    const vat = Math.round(totalAfterExtra * 0.18);
    const final = totalAfterExtra + vat;
    return { subtotal, discountAmount, totalAfterDiscount, extraDiscountAmount, totalAfterExtra, vat, final };
  }, [data]);

  // אתחול לוח החתימה (signature_pad) כשהמודל נפתח
  useEffect(() => {
    if (!showPad) return;
    let cancelled = false;
    let pad: any = null;

    (async () => {
      const { default: SignaturePad } = await import('signature_pad');
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;

      // התאמת רזולוציית הקנבס לצפיפות המסך לחתימה חדה
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(ratio, ratio);

      pad = new SignaturePad(canvas, {
        penColor: '#111827',
        backgroundColor: 'rgba(255,255,255,0)',
      });
      signaturePadRef.current = pad;
    })();

    return () => {
      cancelled = true;
      try { pad?.off?.(); } catch (_) { /* noop */ }
      signaturePadRef.current = null;
    };
  }, [showPad]);

  const handleClearSignature = () => {
    try { signaturePadRef.current?.clear?.(); } catch (_) { /* noop */ }
  };

  const handleConfirmSignature = () => {
    try {
      const pad = signaturePadRef.current;
      if (!pad || pad.isEmpty()) {
        alert('אנא חתמו במסגרת לפני האישור');
        return;
      }
      const sig: string = pad.toDataURL('image/png');
      setSignatureDataUrl(sig);
      setShowPad(false);
    } catch (e) {
      console.error('שגיאה בקריאת החתימה:', e);
      alert('שגיאה בקריאת החתימה');
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!token || !data) return;
    if (!signedBy.trim()) {
      alert('אנא הזינו את שמכם המלא');
      return;
    }
    if (!signatureDataUrl) {
      alert('אנא הוסיפו חתימה');
      return;
    }
    if (!docRef.current) return;

    try {
      setSubmitting(true);

      const element = docRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `signed-quote-${data.quote.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };

      const worker: any = html2pdf().set(opt).from(element);
      const pdfBlob: Blob = await worker.outputPdf('blob');

      await signingAPI.saveSignature(token, {
        signatureDataUrl,
        signedBy: signedBy.trim(),
        pdfBlob,
      });

      setDone(true);
    } catch (e) {
      console.error('שגיאה בשמירת החתימה:', e);
      alert('אירעה שגיאה בשמירת החתימה. אנא נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  }, [token, data, signedBy, signatureDataUrl]);

  if (loading) {
    return (
      <div style={{ direction: 'rtl', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 48, height: 48, border: '4px solid #2563eb', borderBottomColor: 'transparent', borderRadius: '50%', margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: '#374151' }}>טוען את ההצעה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ direction: 'rtl', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <p style={{ marginTop: 12, color: '#374151' }}>{error}</p>
        </div>
      </div>
    );
  }

  const quote = data!.quote;

  return (
    <div style={{ direction: 'rtl', minHeight: '100vh', background: '#f3f4f6', padding: '24px 12px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {done ? (
          <div style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 12 }}>תודה רבה!</h1>
            <p style={{ color: '#4b5563', marginTop: 8 }}>
              הצעת המחיר נחתמה בהצלחה ונשמרה. נציג שלנו יחזור אליכם בהקדם.
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', textAlign: 'center' }}>
                אישור וחתימה על הצעת מחיר
              </h1>
              <p style={{ color: '#6b7280', textAlign: 'center', marginTop: 6, fontSize: 14 }}>
                אנא עברו על פרטי ההצעה, חתמו ואשרו בתחתית העמוד
              </p>
            </div>

            {/* תצוגת ההצעה (משמשת גם כמקור ל-PDF) */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <QuoteDocument
                ref={docRef}
                quote={quote}
                groupedItems={groupedItems}
                totals={totals}
                today={today}
                signedBy={signedBy}
                signatureDataUrl={signatureDataUrl}
              />
            </div>

            {/* אזור הפעולות */}
            <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginTop: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                שם החותם המלא
              </label>
              <input
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="שם מלא"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
              />

              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPad(true)}
                  style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}
                >
                  ✍️ {signatureDataUrl ? 'עדכן חתימה' : 'חתום כאן'}
                </button>

                {signatureDataUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>תצוגה מקדימה:</span>
                    <img src={signatureDataUrl} alt="חתימה" style={{ height: 40 }} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ marginTop: 20, width: '100%', padding: '14px', background: submitting ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'שולח...' : '✅ אשר ושלח הצעה חתומה'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* מודל חתימה - pdfme */}
      {showPad && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 12 }}
        >
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>חתמו במסגרת</h3>
              <button type="button" onClick={() => setShowPad(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: 240, display: 'block', borderRadius: 8, cursor: 'crosshair' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button type="button" onClick={handleClearSignature} style={{ padding: '10px 18px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>
                🧹 נקה
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={handleConfirmSignature} style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  אישור חתימה
                </button>
                <button type="button" onClick={() => setShowPad(false)} style={{ padding: '10px 18px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ===== מסמך ההצעה (תצוגה + מקור ל-PDF) =====
interface QuoteDocumentProps {
  quote: QuoteWithItems['quote'];
  groupedItems: GroupedItem[];
  totals: {
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
    extraDiscountAmount: number;
    totalAfterExtra: number;
    vat: number;
    final: number;
  };
  today: string;
  signedBy: string;
  signatureDataUrl: string | null;
}

const QuoteDocument = React.forwardRef<HTMLDivElement, QuoteDocumentProps>(
  ({ quote, groupedItems, totals, today, signedBy, signatureDataUrl }, ref) => {
    const hasDiscount = (Number(quote.discount_percent) || 0) > 0 || (Number(quote.discount_amount) || 0) > 0;
    const extraPercent = Number(quote.extra_vat_discount_percent || 0);

    return (
      <div ref={ref} style={{ background: '#fff', padding: 32, direction: 'rtl', fontFamily: 'Arial, sans-serif', color: '#1a202c' }}>
        <div style={{ textAlign: 'left', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{today}</div>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src="/pdf3.png" alt="logo" style={{ maxWidth: 180, width: '100%', height: 'auto', margin: '0 auto' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src="/pdf1.png" alt="banner" style={{ maxWidth: 560, width: '100%', height: 'auto', margin: '0 auto' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{quote.event_name}</h2>
        </div>

        {/* פרטי אירוע ולקוח */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>פרטי האירוע</h3>
            <Field label="תאריך:" value={formatDate(quote.event_date)} />
            {quote.event_hours && <Field label="שעות:" value={quote.event_hours} />}
            {!!quote.client_company_id && <Field label="ח״פ:" value={quote.client_company_id} ltr />}
            {quote.special_notes && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11, color: '#718096', display: 'block', marginBottom: 6 }}>הערות מיוחדות:</span>
                <div style={{ background: '#f7fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 10, lineHeight: 1.4 }}>{quote.special_notes}</div>
              </div>
            )}
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>פרטי לקוח</h3>
            <Field label="שם:" value={quote.client_name || ''} />
            {!!quote.client_company && <Field label="חברה:" value={quote.client_company} />}
            {!!quote.client_phone && <Field label="טלפון:" value={quote.client_phone} ltr />}
          </div>
        </div>

        {/* טבלת פריטים */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#e9eef2' }}>
              <th style={{ ...thStyle, width: '50%', textAlign: 'right' }}>תיאור הפריט</th>
              <th style={thStyle}>מחיר יחידה</th>
              <th style={thStyle}>כמות</th>
              <th style={thStyle}>הנחה</th>
              <th style={thStyle}>סה"כ</th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.map((item, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{item.name}</div>
                    {item.description && <div style={{ color: '#555', fontSize: 10 }}>{item.description}</div>}
                  </td>
                  <td style={tdStyle}>{formatCurrency(item.unit_price)}</td>
                  <td style={tdStyle}>{item.quantity}</td>
                  <td style={tdStyle}>{item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}</td>
                  <td style={tdStyle}>{formatCurrency(item.total)}</td>
                </tr>
                {item.splits.map((split, si) => (
                  <tr key={`s-${index}-${si}`} style={{ background: '#f8f9fa' }}>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: 24 }}>
                      <div style={{ fontSize: 10, color: '#0066cc' }}>{split.name}</div>
                      {split.description && <div style={{ fontSize: 9, color: '#555' }}>{split.description}</div>}
                    </td>
                    <td style={tdStyle}>{formatCurrency(split.unit_price)}</td>
                    <td style={tdStyle}>{split.quantity}</td>
                    <td style={tdStyle}>{split.discount > 0 ? `-${formatCurrency(split.discount)}` : '-'}</td>
                    <td style={tdStyle}>{formatCurrency(split.total)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}

            <tr style={{ background: '#fde8d7', fontWeight: 700 }}>
              <td style={{ ...tdStyle, textAlign: 'right' }}>סה"כ לפני מע"מ</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}>{formatCurrency(totals.subtotal)}</td>
            </tr>
            {hasDiscount && (
              <>
                <tr style={{ background: '#e6f3d8', fontWeight: 700 }}>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>הנחה ({quote.discount_percent}%)</td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}>-{formatCurrency(totals.discountAmount)}</td>
                  <td style={tdStyle}>-{formatCurrency(totals.discountAmount)}</td>
                </tr>
                <tr style={{ background: '#fde8d7', fontWeight: 700 }}>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>סה"כ לאחר הנחה</td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}>{formatCurrency(totals.totalAfterDiscount)}</td>
                </tr>
              </>
            )}
            {extraPercent > 0 && (
              <tr style={{ background: '#e6f3d8', fontWeight: 700 }}>
                <td style={{ ...tdStyle, textAlign: 'right' }}>הנחה למחיר סופי ({extraPercent}%)</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}>-{formatCurrency(totals.extraDiscountAmount)}</td>
              </tr>
            )}
            <tr style={{ background: '#fde8d7', fontWeight: 700 }}>
              <td style={{ ...tdStyle, textAlign: 'right' }}>מחיר לפני מע"מ</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}>{formatCurrency(totals.totalAfterExtra)}</td>
            </tr>
            <tr style={{ background: '#fde8d7', fontWeight: 700 }}>
              <td style={{ ...tdStyle, textAlign: 'right' }}>18% מע"מ</td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}></td>
              <td style={tdStyle}>{formatCurrency(totals.vat)}</td>
            </tr>
            <tr style={{ background: '#fde8d7', fontWeight: 700, fontSize: 14 }}>
              <td style={{ ...tdStyle, textAlign: 'right', borderBottom: 'none' }}>סה"כ כולל מע"מ</td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td style={{ ...tdStyle, borderBottom: 'none' }}>{formatCurrency(totals.final)}</td>
            </tr>
          </tbody>
        </table>

        {/* אזור החתימה */}
        <div style={{ marginTop: 24, borderTop: '2px solid #e2e8f0', paddingTop: 16, breakInside: 'avoid' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>אישור וחתימת הלקוח</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <Field label="שם החותם:" value={signedBy || '________________'} />
              <Field label="תאריך:" value={today} />
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#718096', display: 'block', marginBottom: 6 }}>חתימה:</span>
              <div style={{ border: '1px solid #cbd5e0', borderRadius: 8, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                {signatureDataUrl ? (
                  <img src={signatureDataUrl} alt="חתימה" style={{ maxHeight: 84, maxWidth: '100%' }} />
                ) : (
                  <span style={{ color: '#cbd5e0', fontSize: 12 }}>טרם נחתם</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
          <div><strong>בברכה,</strong> דור קצב</div>
          <div>מנהל מערכות מולטימדיה, תאורה, הגברה, מסכי לד</div>
          <div>📞 052-489-1025</div>
          <div>✉️ Dor.katzav.valley@gmail.com</div>
        </div>
      </div>
    );
  }
);
QuoteDocument.displayName = 'QuoteDocument';

const Field: React.FC<{ label: string; value: string; ltr?: boolean }> = ({ label, value, ltr }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <span style={{ fontSize: 11, color: '#718096' }}>{label}</span>
    <span style={{ fontSize: 11, fontWeight: 500, color: '#2d3748', direction: ltr ? 'ltr' : 'rtl' }}>{value}</span>
  </div>
);

const thStyle: React.CSSProperties = {
  padding: '12px 10px',
  textAlign: 'center',
  borderBottom: '2px solid #d0d8e0',
  fontWeight: 700,
  color: '#333',
};

const tdStyle: React.CSSProperties = {
  padding: '10px',
  textAlign: 'center',
  borderBottom: '1px solid #e0e0e0',
};

export default SignQuotePage;
