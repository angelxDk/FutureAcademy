export function asString(value) {
    return String(value || '').trim();
}

export function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function normalizeEditorHtml(rawHtml) {
    const html = String(rawHtml || '').trim();
    if (!html) return '<p></p>';
    if (typeof document === 'undefined') return html;
    const container = document.createElement('div');
    container.innerHTML = html;
    container.querySelectorAll('script,style').forEach((node) => node.remove());
    return container.innerHTML || '<p></p>';
}

export function htmlToPlainText(rawHtml) {
    const html = String(rawHtml || '').trim();
    if (!html) return '';
    if (typeof document === 'undefined') {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    return asString(container.textContent || container.innerText || '');
}

export function plainTextToHtml(text) {
    const value = String(text || '').trim();
    if (!value) return '<p></p>';
    return value
        .split(/\n{2,}/)
        .map((block) => `<p>${escapeHtml(block).replaceAll('\n', '<br/>')}</p>`)
        .join('');
}

export function htmlToMarkdown(rawHtml) {
    const html = normalizeEditorHtml(rawHtml);
    if (!html) return '';
    let markdown = html;
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<\/p>/gi, '\n\n');
    markdown = markdown.replace(/<p[^>]*>/gi, '');
    markdown = markdown.replace(/<\/li>/gi, '\n');
    markdown = markdown.replace(/<li[^>]*>/gi, '- ');
    markdown = markdown.replace(/<ul[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ul>/gi, '\n');
    markdown = markdown.replace(/<ol[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ol>/gi, '\n');
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');
    markdown = markdown.replace(/<[^>]+>/g, '');
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    return markdown.trim();
}
