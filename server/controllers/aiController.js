import { requireEnv, cleanErrorMessage } from '../utils.js';

function extractOpenAiText(data) {
    let answer = String(data?.output_text || '').trim();
    if (answer) return answer;

    if (!Array.isArray(data?.output)) return '';
    const collected = [];
    data.output.forEach((block) => {
        if (!Array.isArray(block?.content)) return;
        block.content.forEach((item) => {
            if ((item?.type === 'output_text' || item?.type === 'text') && item?.text) {
                collected.push(String(item.text));
            }
        });
    });
    return collected.join('\n').trim();
}

export const chatAssistant = async (req, res) => {
    try {
        const prompt = String(req.body?.prompt || '').trim();
        const communityName = String(req.body?.communityName || 'comunidade').trim();
        const recentHistory = String(req.body?.recentHistory || '').trim();
        const model = String(req.body?.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();

        if (!prompt) {
            return res.status(400).json({ error: 'Informe o campo prompt.' });
        }

        const apiKey = requireEnv('OPENAI_API_KEY');

        const input = [
            `Você é assistente da comunidade "${communityName}" no Future Academy.`,
            'Responda em português brasileiro e de forma objetiva.',
            'Quando fizer sentido, sugira próximos passos práticos para estudo em grupo.',
            '',
            'Histórico recente da conversa:',
            recentHistory || 'Sem histórico anterior.',
            '',
            `Solicitação atual: ${prompt}`
        ].join('\n');

        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                input
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const apiError = data?.error?.message || `HTTP ${response.status}`;
            return res.status(502).json({ error: `OpenAI falhou: ${apiError}` });
        }

        const text = extractOpenAiText(data);
        return res.json({ text: text || 'A OpenAI retornou uma resposta vazia.' });
    } catch (err) {
        return res.status(500).json({ error: cleanErrorMessage(err, 'Erro ao consultar OpenAI.') });
    }
};

export const parseTimetable = async (req, res) => {
    try {
        const { type, rows, content, text } = req.body || {};

        // Suporte tanto ao payload novo {type, rows/content} quanto ao legado {text}
        const payloadType = type || 'text';
        const rawText = content || text || '';

        if (payloadType === 'table') {
            if (!Array.isArray(rows) || rows.length < 2) {
                return res.status(400).json({ error: 'Tabela inválida ou sem linhas.' });
            }
            return res.json(parseTableRows(rows));
        }

        if (!rawText.trim()) {
            return res.status(400).json({ error: 'Nenhum conteúdo fornecido.' });
        }

        return res.json(parseRawText(rawText));

    } catch (err) {
        return res.status(500).json({ error: cleanErrorMessage(err, 'Erro no parser de horários.') });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// PARSER 1: Tabela estruturada (rows[][]) — DOCX via HTML ou PDF posicional
// ═══════════════════════════════════════════════════════════════════════════
function parseTableRows(rows) {
    const DAY_KEYWORDS = [
        { num: 1, keys: ['segunda', 'seg', 'mon'] },
        { num: 2, keys: ['terça', 'terca', 'ter', 'tue'] },
        { num: 3, keys: ['quarta', 'qua', 'wed'] },
        { num: 4, keys: ['quinta', 'qui', 'thu'] },
        { num: 5, keys: ['sexta', 'sex', 'fri'] },
        { num: 6, keys: ['sábado', 'sabado', 'sab', 'sat'] },
        { num: 0, keys: ['domingo', 'dom', 'sun'] },
    ];

    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const detectDay = (s) => {
        const t = normalize(s);
        for (const { num, keys } of DAY_KEYWORDS) {
            if (keys.some(k => t.includes(k))) return num;
        }
        return null;
    };

    const TIME_RE = /(\d{1,2})[:h](\d{2})?\s*[-–—]\s*(\d{1,2})[:h](\d{2})?/;

    const parseTime = (s) => {
        const m = String(s).match(TIME_RE);
        if (!m) return null;
        const sh = m[1].padStart(2, '0'), sm = m[2] || '00';
        const eh = m[3].padStart(2, '0'), em = m[4] || '00';
        return { start: `${sh}:${sm}`, end: `${eh}:${em}` };
    };

    // ── 1. Identifica linha de cabeçalho (contém pelo menos 2 dias) ──
    let headerRowIdx = -1;
    let colDayMap = []; // índice de coluna → número do dia (null = coluna HORA)

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const row = rows[r];
        const dayCount = row.filter(cell => detectDay(cell) !== null).length;
        if (dayCount >= 2) {
            headerRowIdx = r;
            colDayMap = row.map(cell => detectDay(cell));
            break;
        }
    }

    if (headerRowIdx === -1) {
        // Sem cabeçalho explícito → tenta parsear como texto simples linha a linha
        const flat = rows.map(r => r.join('\t')).join('\n');
        return parseRawText(flat);
    }

    const foundSubjects = new Map(); // key → {name, professorName}
    const timetable = [];

    const addEntry = (subjectRaw, professorRaw, day, start, end) => {
        const subject = subjectRaw.replace(/\s+/g, ' ').trim();
        const professor = professorRaw.replace(/\s+/g, ' ').trim();
        if (!subject || subject.length < 2) return;
        const key = normalize(subject);
        if (!foundSubjects.has(key)) {
            foundSubjects.set(key, { name: subject, professorName: professor });
        } else if (professor && !foundSubjects.get(key).professorName) {
            foundSubjects.get(key).professorName = professor;
        }
        timetable.push({ subjectName: subject, day, start, end, place: '' });
    };

    // ── 2. Para cada linha de dados (após cabeçalho) ──
    // Detecta linha de horário: primeira coluna (ou qualquer coluna) come TIME_RE
    // Agrupa linhas consecutivas que pertencem ao mesmo bloco de horário
    let currentTimeSlot = null;
    const cellBuffers = new Array(colDayMap.length).fill(''); // acumula texto por coluna

    const flushBuffers = () => {
        if (!currentTimeSlot) return;
        for (let c = 0; c < colDayMap.length; c++) {
            const dayNum = colDayMap[c];
            if (dayNum === null) continue; // coluna HORA
            const cellText = cellBuffers[c].trim();
            if (!cellText) continue;

            // Separa matéria do professor
            // Heurística: as últimas palavras em maiúscula ou depois de '\n' = professor
            // Ou se há múltiplas palavras onde a última "linha" é um nome curto
            const lines = cellText.split(/\n+/).map(l => l.trim()).filter(Boolean);
            let subject = cellText;
            let professor = '';

            if (lines.length >= 2) {
                const last = lines[lines.length - 1];
                const rest = lines.slice(0, -1).join(' ');
                // Último "parágrafo" com 1-4 palavras = professor
                if (last.split(/\s+/).length <= 4 && last.length < 35) {
                    professor = last;
                    subject = rest;
                }
            }

            addEntry(subject, professor, dayNum, currentTimeSlot.start, currentTimeSlot.end);
        }
        cellBuffers.fill('');
    };

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const row = rows[r];

        // Verifica se essa linha inicia um novo bloco de horário
        let rowTimeSlot = null;
        for (let c = 0; c < row.length; c++) {
            const t = parseTime(row[c]);
            if (t) { rowTimeSlot = t; break; }
        }

        if (rowTimeSlot) {
            // Nova linha de horário: flush buffers anteriores e começa novo bloco
            flushBuffers();
            currentTimeSlot = rowTimeSlot;

            // Popula conteúdo das células desta linha
            for (let c = 0; c < row.length; c++) {
                const cellContent = row[c];
                if (parseTime(cellContent)) continue; // pula a própria coluna de hora
                if (colDayMap[c] === null) continue;
                cellBuffers[c] = cellContent;
            }
        } else if (currentTimeSlot) {
            // Linha de continuação (matérias multilinhas na tabela)
            // Acumula no buffer de cada coluna
            for (let c = 0; c < row.length; c++) {
                const cellContent = row[c].trim();
                if (!cellContent) continue;
                if (colDayMap[c] === null) continue;
                cellBuffers[c] += (cellBuffers[c] ? '\n' : '') + cellContent;
            }
        }
    }
    flushBuffers(); // flush última linha

    const subjects = Array.from(foundSubjects.values());

    if (timetable.length === 0) {
        return { subjects: [], timetable: [] };
    }

    return { subjects, timetable };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSER 2: Texto plano — fallback para PDFs sem extração posicional
// ═══════════════════════════════════════════════════════════════════════════
function parseRawText(textContent) {
    const DAY_KEYWORDS = [
        { num: 1, keys: ['segunda', 'seg'] },
        { num: 2, keys: ['terça', 'terca', 'ter'] },
        { num: 3, keys: ['quarta', 'qua'] },
        { num: 4, keys: ['quinta', 'qui'] },
        { num: 5, keys: ['sexta', 'sex'] },
        { num: 6, keys: ['sábado', 'sabado', 'sab'] },
        { num: 0, keys: ['domingo', 'dom'] },
    ];

    const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const detectDay = (s) => {
        const t = normalize(s);
        for (const { num, keys } of DAY_KEYWORDS) {
            if (keys.some(k => t.includes(k))) return num;
        }
        return null;
    };

    const TIME_RE = /(\d{1,2})[:h](\d{2})?\s*[-–—a]\s*(\d{1,2})[:h](\d{2})?/i;
    const parseTime = (s) => {
        const m = String(s).match(TIME_RE);
        if (!m) return null;
        return {
            start: `${m[1].padStart(2, '0')}:${m[2] || '00'}`,
            end: `${m[3].padStart(2, '0')}:${m[4] || '00'}`
        };
    };

    const lines = textContent.split('\n').map(l => l.trim()).filter(Boolean);
    const foundSubjects = new Map();
    const timetable = [];
    let currentDay = null;
    let pendingSubject = '';

    const addEntry = (subject, professor, day, start, end) => {
        subject = subject.trim();
        if (!subject || subject.length < 2) return;
        const key = normalize(subject);
        if (!foundSubjects.has(key)) {
            foundSubjects.set(key, { name: subject, professorName: professor.trim() });
        }
        timetable.push({ subjectName: subject, day: day ?? 1, start, end, place: '' });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const t = parseTime(line);
        const dayNum = detectDay(line);

        if (dayNum !== null && !t) {
            currentDay = dayNum;
            pendingSubject = '';
            continue;
        }

        if (t) {
            const remaining = line.replace(TIME_RE, '').replace(/^[-–\s|:]+|[-–\s|:]+$/g, '').trim();
            let subject = remaining || pendingSubject || '';
            let professor = '';

            if (subject && i + 1 < lines.length) {
                const next = lines[i + 1];
                if (!parseTime(next) && detectDay(next) === null && next.length < 35) {
                    professor = next;
                    i++;
                }
            }

            if (!subject && i + 1 < lines.length) {
                subject = lines[++i] || 'Matéria';
                if (i + 1 < lines.length && !parseTime(lines[i + 1]) && lines[i + 1].length < 35) {
                    professor = lines[++i];
                }
            }

            addEntry(subject || 'Matéria', professor, currentDay, t.start, t.end);
            pendingSubject = '';
        } else if (line.length > 2 && line.length < 80) {
            pendingSubject = line;
        }
    }

    return {
        subjects: Array.from(foundSubjects.values()),
        timetable
    };
}
