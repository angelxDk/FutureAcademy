import DOMPurify from 'dompurify';
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
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['data-type', 'data-checked'],
        FORBID_TAGS: ['iframe', 'style', 'form', 'button', 'img', 'video', 'audio'],
        FORBID_ATTR: ['style']
    }) || '<p></p>';
}

export function htmlToPlainText(rawHtml) {
    const html = String(rawHtml || '').trim();
    if (!html) return '';
    if (typeof document === 'undefined') {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    container.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')));
    container.querySelectorAll('p,div,li,h1,h2,h3,h4,blockquote,pre').forEach(node => node.append(document.createTextNode('\n')));
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
