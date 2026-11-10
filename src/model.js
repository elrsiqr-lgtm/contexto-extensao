/**
 * CONTEXTO — MODELO DE DADOS (regras puras, não sabem de tela nem de armazenamento)
 *
 * Conversa:
 * {
 *   phone: "5511912345678",      // só dígitos, com DDI (chave da conversa)
 *   name: "Maria Silva",
 *   createdAt, updatedAt,        // ISO
 *   summary: { text, updatedAt },
 *   demands: [{ id, text, due: "AAAA-MM-DD"|null, done, createdAt, updatedAt, doneAt }],
 *   history: [{ id, at, type, text }]   // mais recente por último
 * }
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const nowIso = () => new Date().toISOString();

  /** Só dígitos. 10-11 dígitos => assume Brasil e acrescenta 55. Inválido => null. */
  function normalizePhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 10 || d.length === 11) d = '55' + d;
    return d.length >= 8 && d.length <= 15 ? d : null;
  }

  function formatPhone(d) {
    if (!d || isGroup(d)) return '';
    if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
      const ddd = d.slice(2, 4);
      const r = d.slice(4);
      const cut = r.length === 9 ? 5 : 4;
      return `+55 ${ddd} ${r.slice(0, cut)}-${r.slice(cut)}`;
    }
    return '+' + d;
  }

  /** O texto parece um número de telefone (e não um nome)? */
  function looksLikePhone(text) {
    const t = String(text || '').trim();
    return /^\+?[\d\s\-().]+$/.test(t) && t.replace(/\D/g, '').length >= 8;
  }

  /** Chave estável para lembrar "nome -> número" (sem acento, minúsculo). */
  function nameKey(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function emptyConversation(phone, name) {
    const t = nowIso();
    return {
      phone,
      name: name || '',
      kind: isGroup(phone) ? 'group' : 'contact',
      createdAt: t,
      updatedAt: t,
      summary: { text: '', updatedAt: null },
      demands: [],
      history: [],
    };
  }

  /**
   * Demandas JÁ CONCLUÍDAS ("baixadas") ficam só 7 dias e depois são apagadas.
   * Notas, demandas pendentes e histórico NÃO expiram.
   */
  const DONE_DAYS = 7;

  /** Remove as demandas concluídas há mais de 7 dias. Devolve quantas saíram. */
  function pruneDone(conv, now = Date.now()) {
    const limit = now - DONE_DAYS * 24 * 60 * 60 * 1000;
    const before = conv.demands.length;
    conv.demands = conv.demands.filter((d) => !(d.done && d.doneAt && Date.parse(d.doneAt) < limit));
    return before - conv.demands.length;
  }

  // Grupos não têm número: são identificados pelo NOME, com a chave "g:nome-normalizado".
  const isGroup = (key) => typeof key === 'string' && key.startsWith('g:');
  const groupKey = (name) => 'g:' + nameKey(name);

  function log(conv, type, text, at) {
    conv.history.push({ id: uid(), at: at || nowIso(), type, text });
  }

  /**
   * Atualiza o resumo. Com {log:true} registra no histórico; se o último
   * registro também for de resumo e tiver menos de 10 min, ele é substituído
   * (evita encher o histórico enquanto você ainda está digitando).
   */
  function setSummary(conv, text, opts = {}) {
    const t = nowIso();
    if (text === conv.summary.text && !opts.log) return conv;
    conv.summary = { text, updatedAt: t };
    conv.updatedAt = t;
    if (opts.log) {
      const last = conv.history[conv.history.length - 1];
      const recent = last && last.type === 'summary' && Date.now() - Date.parse(last.at) < 10 * 60 * 1000;
      if (last && last.type === 'summary' && last.text === text) return conv;
      if (recent) {
        last.text = text;
        last.at = t;
      } else {
        log(conv, 'summary', text, t);
      }
    }
    return conv;
  }

  function addDemand(conv, text, due) {
    const t = nowIso();
    const d = { id: uid(), text, due: due || null, done: false, createdAt: t, updatedAt: t, doneAt: null };
    conv.demands.push(d);
    conv.updatedAt = t;
    log(conv, 'demand_added', text, t);
    return d;
  }

  function editDemand(conv, id, patch) {
    const d = conv.demands.find((x) => x.id === id);
    if (!d) return;
    const t = nowIso();
    if (typeof patch.text === 'string' && patch.text !== d.text) {
      log(conv, 'demand_edited', `${d.text} → ${patch.text}`, t);
      d.text = patch.text;
    }
    if ('due' in patch && patch.due !== d.due) {
      d.due = patch.due || null;
      log(conv, 'demand_due', `${d.text} (prazo: ${d.due || 'sem prazo'})`, t);
    }
    d.updatedAt = t;
    conv.updatedAt = t;
  }

  function toggleDemand(conv, id) {
    const d = conv.demands.find((x) => x.id === id);
    if (!d) return;
    const t = nowIso();
    d.done = !d.done;
    d.doneAt = d.done ? t : null;
    d.updatedAt = t;
    conv.updatedAt = t;
    log(conv, d.done ? 'demand_done' : 'demand_reopened', d.text, t);
  }

  function removeDemand(conv, id) {
    const i = conv.demands.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [d] = conv.demands.splice(i, 1);
    const t = nowIso();
    conv.updatedAt = t;
    log(conv, 'demand_removed', d.text, t);
  }

  NS.model = {
    DONE_DAYS, pruneDone, isGroup, groupKey, uid, normalizePhone, formatPhone, looksLikePhone, nameKey,
    emptyConversation, setSummary, addDemand, editDemand, toggleDemand, removeDemand,
  };
})();
