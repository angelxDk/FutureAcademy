import { asString, normalizeEditorHtml, htmlToPlainText, plainTextToHtml, htmlToMarkdown, escapeHtml } from './text';

export function recordExportBase(record, subjectNameFormatter, dateFormatter) {
    const subject = subjectNameFormatter(record.subjectId);
    const contentHtml = normalizeEditorHtml(record.contentHtml || plainTextToHtml(record.content || ''));
    return {
        safeFileName: asString(record.title || 'registro').replace(/\s+/g, '_').toLowerCase(),
        title: asString(record.title),
        type: asString(record.type),
        subject: asString(subject),
        dueDate: dateFormatter(record.dueDate),
        status: asString(record.status),
        contentHtml,
        contentText: htmlToPlainText(contentHtml),
        contentMarkdown: htmlToMarkdown(contentHtml)
    };
}

export function buildDocxParagraphs(contentHtml, { Paragraph, TextRun, HeadingLevel }) {
    if (typeof document === 'undefined') {
        return [new Paragraph(htmlToPlainText(contentHtml) || '')];
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = normalizeEditorHtml(contentHtml);
    const blocks = wrapper.querySelectorAll('h1,h2,h3,p,li,blockquote');
    const paragraphs = [];

    blocks.forEach((node) => {
        const text = asString(node.textContent || '');
        if (!text) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'h1') {
            paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }));
            return;
        }
        if (tag === 'h2') {
            paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }));
            return;
        }
        if (tag === 'h3') {
            paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] }));
            return;
        }
        if (tag === 'blockquote') {
            const p = new Paragraph({ children: [new TextRun({ text, italics: true, color: '555555' })] });
            paragraphs.push(p);
            return;
        }
        if (tag === 'li') {
            paragraphs.push(new Paragraph({ text, bullet: { level: 0 } }));
            return;
        }
        paragraphs.push(new Paragraph(text));
    });

    if (!paragraphs.length) {
        paragraphs.push(new Paragraph(''));
    }
    return paragraphs;
}

export async function buildRecordDocxBlob(record, subjectNameFormatter, dateFormatter) {
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
    const base = recordExportBase(record, subjectNameFormatter, dateFormatter);
    const contentParagraphs = buildDocxParagraphs(base.contentHtml, { Paragraph, TextRun, HeadingLevel });
    const doc = new Document({
        sections: [
            {
                children: [
                    new Paragraph({
                        heading: HeadingLevel.HEADING_1,
                        children: [new TextRun(base.title || 'Registro')]
                    }),
                    new Paragraph(`Tipo: ${base.type}`),
                    new Paragraph(`Matéria: ${base.subject}`),
                    new Paragraph(`Data limite: ${base.dueDate}`),
                    new Paragraph(`Status: ${base.status}`),
                    new Paragraph(''),
                    new Paragraph({
                        heading: HeadingLevel.HEADING_2,
                        children: [new TextRun('Conteúdo')]
                    }),
                    ...contentParagraphs
                ]
            }
        ]
    });

    const blob = await Packer.toBlob(doc);
    return {
        filename: `${base.safeFileName || 'registro'}.docx`,
        blob
    };
}

export function formatRecordText(record, format, subjectNameFormatter, dateFormatter) {
    const base = recordExportBase(record, subjectNameFormatter, dateFormatter);

    if (format === 'md') {
        return {
            filename: `${base.safeFileName || 'registro'}.md`,
            mime: 'text/markdown;charset=utf-8',
            content: `# ${base.title}\n\n- Tipo: ${base.type}\n- Matéria: ${base.subject}\n- Data limite: ${base.dueDate}\n- Status: ${base.status}\n\n## Conteúdo\n\n${base.contentMarkdown || base.contentText}\n`
        };
    }

    if (format === 'doc') {
        const safeTitle = escapeHtml(base.title);
        const safeType = escapeHtml(base.type);
        const safeSubject = escapeHtml(base.subject);
        const safeDueDate = escapeHtml(base.dueDate);
        const safeStatus = escapeHtml(base.status);
        const safeContent = base.contentHtml;

        return {
            filename: `${base.safeFileName || 'registro'}.doc`,
            mime: 'application/msword;charset=utf-8',
            content: `<html><head><meta charset="UTF-8"></head><body><h1>${safeTitle}</h1><p><strong>Tipo:</strong> ${safeType}</p><p><strong>Matéria:</strong> ${safeSubject}</p><p><strong>Data limite:</strong> ${safeDueDate}</p><p><strong>Status:</strong> ${safeStatus}</p><h2>Conteúdo</h2>${safeContent}</body></html>`
        };
    }

    return {
        filename: `${base.safeFileName || 'registro'}.txt`,
        mime: 'text/plain;charset=utf-8',
        content: `${base.title}\nTipo: ${base.type}\nMatéria: ${base.subject}\nData limite: ${base.dueDate}\nStatus: ${base.status}\n\n${base.contentText}`
    };
}

export function downloadFile(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export function printRecordAsPdf(record, subjectNameFormatter, dateFormatter, showToast) {
    const base = recordExportBase(record, subjectNameFormatter, dateFormatter);
    const safeTitle = escapeHtml(base.title || '');
    const safeType = escapeHtml(base.type || '');
    const safeSubject = escapeHtml(base.subject || '');
    const safeDueDate = escapeHtml(base.dueDate || '');
    const safeStatus = escapeHtml(base.status || '');
    const safeContent = base.contentHtml;
    const printable = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>body { font-family: Arial, sans-serif; margin: 2rem; } h1 { margin-bottom: .5rem; } p { margin: .3rem 0; } .content { white-space: pre-wrap; margin-top: 1rem; }</style></head><body><h1>${safeTitle}</h1><p><strong>Tipo:</strong> ${safeType}</p><p><strong>Matéria:</strong> ${safeSubject}</p><p><strong>Data limite:</strong> ${safeDueDate}</p><p><strong>Status:</strong> ${safeStatus}</p><div class="content">${safeContent}</div></body></html>`;

    const printWindow = window.open('', '_blank', 'width=860,height=720');
    if (!printWindow) {
        if (showToast) showToast('Não foi possível abrir a janela de impressão.');
        return;
    }
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

export async function exportRecord(record, subjectNameFormatter, dateFormatter, showToast) {
    const format = record.exportFormat || 'md';
    if (format === 'pdf') {
        printRecordAsPdf(record, subjectNameFormatter, dateFormatter, showToast);
        showToast('Janela de PDF aberta. Salve como PDF no diálogo de impressão.');
        return;
    }

    if (format === 'docx') {
        const { filename, blob } = await buildRecordDocxBlob(record, subjectNameFormatter, dateFormatter);
        downloadFile(filename, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        showToast(`Arquivo ${filename} exportado.`);
        return;
    }

    const { filename, mime, content } = formatRecordText(record, format, subjectNameFormatter, dateFormatter);
    downloadFile(filename, content, mime);
    showToast(`Arquivo ${filename} exportado.`);
}

export function sendRecordEmail(record, subjectNameFormatter, dateFormatter, showToast) {
    if (!record.emailTo) {
        showToast('Informe um e-mail de destino no registro.');
        return;
    }

    const format = record.exportFormat || 'md';
    const base = recordExportBase(record, subjectNameFormatter, dateFormatter);
    const subject = `Future Academy - ${record.title} (${format.toUpperCase()})`;
    const body = `Olá,\n\nResumo do trabalho:\n\n${base.contentText}\n\nObservação: para ${format.toUpperCase()}, use o botão Exportar no app.\n\nEnviado via Future Academy.`;
    window.location.href = `mailto:${record.emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('Cliente de e-mail aberto com conteúdo formatado.');
}
