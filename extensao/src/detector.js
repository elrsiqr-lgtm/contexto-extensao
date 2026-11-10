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
 *    { loading: true }                     -> conversa abrindo (nome ainda não apareceu no cabeçalho)
 *    { name: "+55 11 91234-5678", phone: "5511912345678" }   -> contato não salvo
 *    { name: "Maria Silva",       phone: null }               -> contato salvo (número desconhecido)
 *    { name: "Maria Silva",       phone: null, suggestedPhone: "5511..." }
 *                                         -> contato salvo; o número só é SUGERIDO (achado no painel
 *                                            "Dados do contato" se o usuário o abriu) e precisa ser confirmado
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

  /**
   * Textos do cabeçalho que NÃO são o nome do contato: status ("online"...) e
   * etiquetas de conta ("Conta comercial"...). Se o WhatsApp mostrar outra etiqueta
   * no lugar do nome, acrescente o texto aqui.
   */
  const IGNORE_TEXT = new RegExp('^(' + [
    'online', 'digitando', 'gravando', 'visto por último',
    'clique', 'toque',                          // dica: "clique para mostrar os dados do contato"
    'conta comercial', 'conta oficial', 'conta verificada',
    'typing', 'recording', 'last seen', 'click', 'tap',
    'business account', 'official business account', 'verified business',
  ].join('|') + ')', 'i');

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

  function findHeader() {
    for (const sel of HEADER_SELECTORS) {
      const header = document.querySelector(sel);
      if (header) return header;
    }
    return null;
  }

  function readHeaderTitle(header) {
    // Em ORDEM DE APARECIMENTO na tela: o nome vem antes das linhas de apoio
    // (status, dica "clique para mostrar os dados do contato", lista de participantes).
    for (const el of header.querySelectorAll(TITLE_SELECTORS.join(','))) {
      const text = (el.getAttribute('title') || el.textContent || '').trim();
      if (text && !IGNORE_TEXT.test(text)) return text;
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
    // Ficha de GRUPO lista números de participantes: não serve como número do grupo.
    if (/\b\d+\s+(participantes|participants|membros)\b|dados do grupo|group info/i.test(panel.innerText || '')) return null;
    for (const el of panel.querySelectorAll('span, div')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim();
      if (looksLikePhone(t)) return normalizePhone(t);
    }
    return null;
  }

  /**
   * DIAGNÓSTICO: lista os textos do CABEÇALHO da conversa (nome, status, dicas) e qual deles
   * foi escolhido como nome. Não toca em mensagens. Serve para ajustar os seletores acima
   * quando o WhatsApp mudar.
   */
  function debugHeader() {
    const header = findHeader();
    if (!header) return { header: false };
    const items = [];
    for (const el of header.querySelectorAll('span, div')) {
      if (el.children.length) continue;               // só elementos que têm o texto em si
      const text = (el.textContent || '').trim();
      const title = el.getAttribute('title') || '';
      if (!text && !title) continue;
      items.push({
        tag: el.tagName.toLowerCase(),
        dir: el.getAttribute('dir') || '',
        title, text,
        ignorado: IGNORE_TEXT.test(title || text),
      });
    }
    return { header: true, escolhido: readHeaderTitle(header), itens: items };
  }

  NS.detector = {
    debug: debugHeader,
    read() {
      const header = findHeader();
      if (!header) return null;                  // nenhuma conversa aberta
      const title = readHeaderTitle(header);
      if (!title) return { loading: true };      // cabeçalho existe, mas o nome ainda não carregou
      if (looksLikePhone(title)) {
        return { name: title, phone: normalizePhone(title) };
      }
      // Contato salvo: o número achado na ficha é só uma SUGESTÃO. Nada é liberado até o usuário confirmar.
      return { name: title, phone: null, suggestedPhone: findNumberInInfoPanel(title) };
    },
  };
})();
