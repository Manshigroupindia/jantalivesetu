/**
 * Robust CSV parser and generator adhering to RFC 4180.
 * Handles quoted fields, inner commas, multiline values, and UTF-8 BOM.
 */

export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ''); // Strip BOM
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      // Skip empty blank lines
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Escapes a single CSV value according to RFC 4180.
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates CSV string from an array of objects
 */
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; label: string }[]
): string {
  const headerRow = columns.map((c) => escapeCSVValue(c.label)).join(',');
  const rows = data.map((item) =>
    columns
      .map((c) => {
        const val = (item as any)[c.key];
        return escapeCSVValue(val);
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Maps common CSV column names to standardized client fields
 */
export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach((h) => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (['fullname', 'name', 'clientname', 'customername', 'client', 'customer'].includes(clean)) {
      mapping.name = h;
    } else if (
      [
        'phone',
        'mobilenumber',
        'mobile',
        'phonenumber',
        'contact',
        'contactnumber',
        'whatsapp',
        'whatsappnumber',
      ].includes(clean)
    ) {
      mapping.phone = h;
    } else if (['company', 'companyname', 'organization', 'org', 'firm', 'business'].includes(clean)) {
      mapping.company = h;
    } else if (['email', 'emailaddress', 'mail'].includes(clean)) {
      mapping.email = h;
    } else if (['category', 'clientcategory', 'group', 'type'].includes(clean)) {
      mapping.category = h;
    } else if (['consent', 'whatsappconsent', 'optin', 'marketingconsent'].includes(clean)) {
      mapping.whatsappConsent = h;
    } else if (['status', 'clientstatus', 'active'].includes(clean)) {
      mapping.status = h;
    } else if (['notes', 'note', 'remarks', 'comment', 'description'].includes(clean)) {
      mapping.notes = h;
    }
  });

  return mapping;
}
