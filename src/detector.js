/**
 * CONTEXTO — DETECTOR DA CONVERSA ABERTA
 * ===========================================================================
 * ESTE É O ÚNICO ARQUIVO QUE "ENXERGA" A PÁGINA DO WHATSAPP.
 * Quando o WhatsApp mudar o visual e o painel parar de reconhecer a conversa,
 * ajuste SOMENTE os seletores da seção "SELETORES" logo abaixo.
 *
 * REGRAS (importante):
 *  - Lê apenas o CABEÇALHO da conversa aberta (nome ou número do contato).
 *  - NÃO lê mensagens, NÃO lê a lista de conversas, NÃO clica em nada,
 *    NÃO envia nada.
 *
 * O que `read()` devolve:
 *    null                                  -> nenhuma conversa aberta
 *    { name: "+55 11 91234-5678", phone: "5511912345678" }   -> contato não salvo
 *    { name: "Maria Silva",       phone: null }               -> contato salvo (número desconhecido)
 *    { name: "Maria Silva",       phone: "5511..." }          -> contato salvo e número achado no
 *                                                                painel "Dados do contato" (se você o abriu)
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});
  const { looksLikePhone, normalizePhone } = NS.model;

  // ------------------------------------------------------------------ SELETORES
  // Ajuste aqui se o WhatsApp mudar. Tentados em ordem; vale o primeiro que achar.

  /** Cabeçalho da conversa aberta (a barra com foto + nome, no topo da conversa). */
  const HEADER_SELECTORS = [
    '#main header',
    '[data-testid="conversation-header"]',
    'div[role="main"] header',
  ];

  /** Dentro do cabeçalho: o texto que mostra o nome (ou número) do contato. */
  const TITLE_SELECTORS = [
    'span[dir="auto"][title]',
    'span[title]',
    'span[dir="auto"]',
  ];

  /** Textos de status que aparecem no cabeçalho e NÃO são o nome. */
  const IGNORE_TEXT = /^(online|digitando|gravando|visto por último|clique aqui|typing|recording|last seen|click here)/i;

  /** Painel lateral "Dados do contato" (só é lido se VOCÊ o abriu). Heurística, veja findNumberInInfoPanel. */
  const APP_ROOT = '#app';
  // ----------------------------------------------------------------------------

  function firstMatch(root, selectors) {
    for (const sel of selectors) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function readHeaderTitle() {
    let header = null;
    for (const sel of HEADER_SELECTORS) {
      header = document.querySelector(sel);
      if (header) break;
    }
    if (!header) return null;

    for (const sel of TITLE_SELECTORS) {
      for (const el of header.querySelectorAll(sel)) {
        const text = (el.getAttribute('title') || el.textContent || '').trim();
        if (text && !IGNORE_TEXT.test(text)) return text;
      }
    }
    return null;
  }

  /**
   * Melhor esforço: se o painel "Dados do contato" estiver aberto à direita,
   * procura nele um texto com formato de telefone. Não clica em nada.
   * (Observação: com o painel CONTEXTO aberto, o painel do WhatsApp fica
   * dentro do #app, que é a área encolhida.)
   */
  function findNumberInInfoPanel(name) {
    const root = document.querySelector(APP_ROOT);
    if (!root) return null;
    const half = window.innerWidth / 2;
    const spans = root.querySelectorAll('span, div');
    let panel = null;
    for (const el of spans) {
      if (el.children.length) continue;
      if ((el.textContent || '').trim() !== name) continue;
      const r = el.getBoundingClientRect();
      if (r.left > half * 0.9) { panel = el.closest('section, aside, div[role="region"]') || null; break; }
    }
    if (!panel) return null;
    for (const el of panel.querySelectorAll('span, div')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim();
      if (looksLikePhone(t)) return normalizePhone(t);
    }
    return null;
  }

  NS.detector = {
    read() {
      const title = readHeaderTitle();
      if (!title) return null;
      if (looksLikePhone(title)) {
        return { name: title, phone: normalizePhone(title) };
      }
      return { name: title, phone: findNumberInInfoPanel(title) };
    },
  };
})();
