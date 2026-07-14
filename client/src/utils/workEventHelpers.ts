import type { WorkEvent, WorkEventSource } from '../types';

/** סגנון ויזואלי לפי מקור + מתחם (תחזוקה גוברת על הכל) */
export type EventVisualKind = 'sweet' | 'joy' | 'valley' | 'uptown' | 'maintenance';

export const EVENT_SOURCE_LABEL: Record<WorkEventSource, string> = {
  valley: 'VALLEY',
  uptown: 'UPTOWN',
};

/** מחלקות Tailwind לכרטיס/צ'יפ אירוע לפי סגנון */
export const EVENT_VISUAL_CLASSES: Record<
  EventVisualKind,
  { chip: string; card: string; label: string }
> = {
  sweet: {
    label: 'SWEET',
    chip: 'border-pink-400 bg-pink-50 text-pink-900 dark:border-pink-500 dark:bg-pink-950/60 dark:text-pink-100',
    card: 'border-pink-400 dark:border-pink-500 bg-white dark:bg-gray-900',
  },
  joy: {
    label: 'JOY',
    chip: 'border-teal-400 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-100',
    card: 'border-teal-400 dark:border-teal-500 bg-white dark:bg-gray-900',
  },
  valley: {
    label: 'VALLEY',
    chip: 'border-gray-400 bg-gray-100 text-gray-800 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200',
    card: 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900',
  },
  uptown: {
    label: 'UPTOWN',
    chip: 'border-[#d4af37] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-amber-50 shadow-sm',
    card: 'border-[#d4af37] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-amber-50',
  },
  maintenance: {
    label: 'תחזוקה',
    chip: 'border-green-500 bg-green-50 text-green-900 dark:border-green-500 dark:bg-green-950/60 dark:text-green-100',
    card: 'border-green-500 dark:border-green-500 bg-white dark:bg-gray-900',
  },
};

export const splitSubVenues = (subVenues: string | null): string[] =>
  (subVenues ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

const includesVenue = (venues: string[], keyword: string): boolean =>
  venues.some((v) => v.toUpperCase().includes(keyword));

/** קובע את הסגנון הוויזואלי לפי סיווג, מקור ומחרוזת מתחמים */
export const resolveEventVisualKind = (
  event: Pick<WorkEvent, 'source' | 'sub_venues' | 'event_type' | 'event_name'>
): EventVisualKind => {
  if (classifyEventForRoles(event) === 'maintenance') return 'maintenance';
  if (event.source === 'uptown') return 'uptown';

  const venues = splitSubVenues(event.sub_venues);
  if (includesVenue(venues, 'SWEET')) return 'sweet';
  if (includesVenue(venues, 'JOY')) return 'joy';
  return 'valley';
};

export const resolveEventVisual = (
  event: Pick<WorkEvent, 'source' | 'sub_venues' | 'event_type' | 'event_name'>
) => {
  const kind = resolveEventVisualKind(event);
  return { kind, ...EVENT_VISUAL_CLASSES[kind] };
};

// ---------- סיווג משמרות לפי תפקידים ----------

/**
 * קטגוריית הרשמה של אירוע:
 * business - אירועים עסקיים (סאונדמן / טכנאי לד בלבד)
 * regular - כל השאר (תאורן בלבד)
 * maintenance - תחזוקה (פתוח לכולם)
 */
export type EventRoleCategory = 'business' | 'regular' | 'maintenance';

const BUSINESS_KEYWORDS = ['כנס', 'אירוע חברה', 'יום הקמה', 'אירוע עסקי', 'תערוכה'];
const MAINTENANCE_KEYWORD = 'תחזוקה';

/** מפצל תפקידי עובד מרובים ("תאורן, סאונדמן") לרשימה */
export const splitJobTitles = (jobTitle: string | null | undefined): string[] =>
  (jobTitle ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** מסווג אירוע לקטגוריית הרשמה לפי סוג האירוע (עם fallback לשם) */
export const classifyEventForRoles = (
  event: Pick<WorkEvent, 'event_type' | 'event_name'>
): EventRoleCategory => {
  const text = `${event.event_type ?? ''} ${event.event_name ?? ''}`;
  if (text.includes(MAINTENANCE_KEYWORD)) return 'maintenance';
  if (BUSINESS_KEYWORDS.some((kw) => text.includes(kw))) return 'business';
  return 'regular';
};

export const EVENT_CATEGORY_ALLOWED_LABEL: Record<EventRoleCategory, string> = {
  business: 'סאונדמן / טכנאי לד',
  regular: 'תאורן',
  maintenance: 'כל העובדים',
};

const isSoundman = (title: string): boolean => title.includes('סאונד');
const isLedTech = (title: string): boolean =>
  title.includes('לד') || title.toUpperCase().includes('LED');
const isLightingTech = (title: string): boolean => title.includes('תאור');

/** האם עובד (לפי תפקידיו) רשאי להירשם לאירוע בקטגוריה נתונה */
export const isEmployeeEligible = (
  jobTitle: string | null | undefined,
  category: EventRoleCategory
): boolean => {
  if (category === 'maintenance') return true;

  const titles = splitJobTitles(jobTitle);
  if (category === 'business') {
    return titles.some((t) => isSoundman(t) || isLedTech(t));
  }
  return titles.some(isLightingTech);
};

/** שעת סף ל"הגעה מוקדמת" - משמרת שמתחילה לפניה מסומנת בתג אזהרה */
const EARLY_START_THRESHOLD = '19:30';

export const isEarlyStart = (startTime: string | null): boolean => {
  const time = formatTime(startTime);
  return time != null && time < EARLY_START_THRESHOLD;
};

export const parseIsoDate = (isoDate: string): Date | null => {
  const date = new Date(`${isoDate}T00:00:00`);
  return isNaN(date.getTime()) ? null : date;
};

export const formatWeekday = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  return date ? date.toLocaleDateString('he-IL', { weekday: 'long' }) : '';
};

export const formatShortDate = (isoDate: string): string => {
  const date = parseIsoDate(isoDate);
  return date
    ? date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : isoDate;
};

export const formatTime = (time: string | null): string | null => (time ? time.slice(0, 5) : null);

export const toIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getMonthRange = (year: number, monthIndex: number): { from: string; to: string } => {
  const from = toIsoDate(new Date(year, monthIndex, 1));
  const to = toIsoDate(new Date(year, monthIndex + 1, 0));
  return { from, to };
};

export const eventIdentityKey = (
  event: Pick<{ event_date: string; event_name: string; source?: WorkEventSource | null }, 'event_date' | 'event_name' | 'source'>
): string => `${event.event_date}|${event.event_name}|${event.source ?? 'valley'}`;

/**
 * מזהה מקור מקום עבודה משם גיליון.
 * גיליון1 / VALLEY → valley, גיליון2 / UPTOWN → uptown.
 * אם אין התאמה: אינדקס 0 = valley, 1 = uptown.
 */
export const detectSourceFromSheetName = (sheetName: string, sheetIndex: number): WorkEventSource => {
  const name = sheetName.trim().toLowerCase();

  if (
    name.includes('uptown') ||
    name.includes('אפטאון') ||
    name.includes('גיליון2') ||
    name.includes('גיליון 2') ||
    name === 'sheet2'
  ) {
    return 'uptown';
  }

  if (
    name.includes('valley') ||
    name.includes('קוונטום') ||
    name.includes('quantum') ||
    name.includes('גיליון1') ||
    name.includes('גיליון 1') ||
    name === 'sheet1'
  ) {
    return 'valley';
  }

  return sheetIndex === 1 ? 'uptown' : 'valley';
};
