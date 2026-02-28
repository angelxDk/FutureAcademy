export function todayISO() {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function nowTimeISO() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function parseDateTime(datePart, timePart) {
    if (!datePart || !timePart) {
        return null;
    }
    const date = new Date(`${datePart}T${timePart}:00`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}
