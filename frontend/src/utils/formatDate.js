/**
 * Format a date string/object to UTC display.
 *
 * formatDateTime → "21 Feb 2026, 5:30 PM UTC"
 * formatDate     → "21 Feb 2026"
 */

export function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
    }) + ' UTC';
}

export function formatDateTimeInZone(dateStr, timeZone = 'UTC', suffix = timeZone) {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
    }) + ` ${suffix}`;
}

export function formatDateInZone(dateStr, timeZone = 'UTC') {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone,
    });
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
}
