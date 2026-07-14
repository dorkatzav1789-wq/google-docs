import * as XLSX from 'xlsx';
import type { NewWorkEventInput, WorkEventSource } from '../types';
import { detectSourceFromSheetName, eventIdentityKey } from './workEventHelpers';

/** שורה בודדת מהקובץ אחרי פירסור, כולל שגיאות אם יש */
export interface ParsedEventRow {
  rowNumber: number;
  sheetName: string;
  source: WorkEventSource;
  event: NewWorkEventInput | null;
  errors: string[];
}

export interface ParseWorkEventsResult {
  rows: ParsedEventRow[];
  /** מספר שורות שהוסרו כי הופיעו פעמיים בקובץ (אותו תאריך + שם + מקור) */
  duplicatesInFile: number;
  /** שגיאות ברמת הקובץ, למשל עמודת חובה חסרה */
  fileErrors: string[];
}

const COLUMN_MATCHERS: Array<{ field: keyof ColumnIndexes; keywords: string[] }> = [
  { field: 'date', keywords: ['תאריך'] },
  { field: 'name', keywords: ['שם'] },
  { field: 'type', keywords: ['סוג'] },
  { field: 'subVenues', keywords: ['מתחמ'] },
  { field: 'startTime', keywords: ['שעת', 'שעה'] },
  { field: 'neededEmployees', keywords: ['כמות', 'מכסה', 'נדרש'] },
];

interface ColumnIndexes {
  date: number;
  name: number;
  type: number;
  subVenues: number;
  startTime: number;
  neededEmployees: number;
}

/** מזהה את מיקום העמודות לפי שורת הכותרות (התאמה גמישה לפי מילות מפתח) */
const detectColumns = (headerRow: unknown[]): Partial<ColumnIndexes> => {
  const indexes: Partial<ColumnIndexes> = {};
  headerRow.forEach((cell, colIndex) => {
    const header = String(cell ?? '').trim();
    if (!header) return;
    for (const { field, keywords } of COLUMN_MATCHERS) {
      if (indexes[field] === undefined && keywords.some((kw) => header.includes(kw))) {
        indexes[field] = colIndex;
        break;
      }
    }
  });
  return indexes;
};

const normalizeText = (value: unknown): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

const pad = (n: number) => String(n).padStart(2, '0');

const parseCellDate = (value: unknown): string | null => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  if (typeof value === 'number' && isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }

  const text = normalizeText(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad(Number(isoMatch[2]))}-${pad(Number(isoMatch[3]))}`;
  }

  const dmyMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += 2000;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return null;
};

const parseCellTime = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  if (typeof value === 'number' && isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${pad(parsed.H)}:${pad(parsed.M)}`;
  }

  const text = normalizeText(value);
  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${pad(hours)}:${pad(minutes)}`;
  }

  return null;
};

/** ממיר ערך תא לכמות עובדים נדרשת (מספר שלם חיובי) */
const parseCellNeededEmployees = (value: unknown): number | null => {
  const num = Number(normalizeText(value));
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  return rounded > 0 ? rounded : null;
};

const parseSheetRows = (
  grid: unknown[][],
  sheetName: string,
  source: WorkEventSource,
  seenKeys: Set<string>
): { rows: ParsedEventRow[]; duplicates: number; fileErrors: string[] } => {
  if (grid.length < 2) {
    return { rows: [], duplicates: 0, fileErrors: [] };
  }

  const columns = detectColumns(grid[0]);
  const fileErrors: string[] = [];
  if (columns.date === undefined) fileErrors.push(`"${sheetName}": לא נמצאה עמודת "תאריך האירוע"`);
  if (columns.name === undefined) fileErrors.push(`"${sheetName}": לא נמצאה עמודת "שם האירוע"`);
  if (fileErrors.length) {
    return { rows: [], duplicates: 0, fileErrors };
  }

  const rows: ParsedEventRow[] = [];
  let duplicates = 0;

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const rowNumber = i + 1;

    const isEmptyRow = cells.every((cell) => normalizeText(cell) === '');
    if (isEmptyRow) continue;

    const errors: string[] = [];

    const eventDate = parseCellDate(cells[columns.date!]);
    if (!eventDate) errors.push('תאריך חסר או לא תקין');

    const eventName = normalizeText(cells[columns.name!]);
    if (!eventName) errors.push('שם אירוע חסר');

    const rawStartTime = columns.startTime !== undefined ? cells[columns.startTime] : '';
    const startTime = parseCellTime(rawStartTime);
    if (normalizeText(rawStartTime) && !startTime) {
      errors.push('שעת התחלה לא תקינה');
    }

    if (errors.length) {
      rows.push({ rowNumber, sheetName, source, event: null, errors });
      continue;
    }

    const event: NewWorkEventInput = {
      event_date: eventDate!,
      event_name: eventName,
      event_type: columns.type !== undefined ? normalizeText(cells[columns.type]) || null : null,
      sub_venues: columns.subVenues !== undefined ? normalizeText(cells[columns.subVenues]) || null : null,
      start_time: startTime,
      source,
      needed_employees:
        columns.neededEmployees !== undefined
          ? parseCellNeededEmployees(cells[columns.neededEmployees])
          : null,
    };

    const key = eventIdentityKey(event);
    if (seenKeys.has(key)) {
      duplicates++;
      continue;
    }
    seenKeys.add(key);

    rows.push({ rowNumber, sheetName, source, errors: [], event });
  }

  return { rows, duplicates, fileErrors: [] };
};

/**
 * מפרסר קובץ xlsx של אירועי עבודה מכל הגיליונות.
 * גיליון1 / VALLEY → valley, גיליון2 / UPTOWN → uptown.
 * עמודות חובה: תאריך האירוע, שם האירוע. השאר אופציונליות.
 */
export const parseWorkEventsXlsx = async (file: File): Promise<ParseWorkEventsResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });

  if (!workbook.SheetNames.length) {
    return { rows: [], duplicatesInFile: 0, fileErrors: ['הקובץ ריק - לא נמצא גיליון'] };
  }

  const rows: ParsedEventRow[] = [];
  const fileErrors: string[] = [];
  const seenKeys = new Set<string>();
  let duplicatesInFile = 0;

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const source = detectSourceFromSheetName(sheetName, sheetIndex);
    const parsed = parseSheetRows(grid, sheetName, source, seenKeys);

    rows.push(...parsed.rows);
    duplicatesInFile += parsed.duplicates;
    fileErrors.push(...parsed.fileErrors);
  });

  if (!rows.length && fileErrors.length) {
    return { rows: [], duplicatesInFile: 0, fileErrors };
  }

  return { rows, duplicatesInFile, fileErrors };
};
