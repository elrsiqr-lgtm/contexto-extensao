/**
 * CONTEXTO — ORQUESTRAÇÃO
 * Liga: detector (qual conversa está aberta) + storage (dados) + ui (painel).
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});
  const { storage, model: M, detector } = NS;

  let ui = null;
  let open = true;
  let conv = null;          // conversa atual (objeto em memória)
  let display = null;       // { name } mostrado no topo
  let currentIdentKey = ''; // evita refazer trabalho se nada mudou
  let resolveToken = 0;     // descarta respostas antigas ao trocar rápido de conversa
  let saveTimer = null;
  let logTimer = null;
  const PROMPT_DELAY = 450; // ms de nome estável antes de pedir o número
  let aliasCache = null;    // nome -> número, guardado em memória para abrir mais rápido
  let pendingSummary = null; // texto do resumo digitado e ainda não salvo

  // ------------------------------------------------------------ extensão desligada/atualizada
  // Quando a extensão é recarregada em chrome://extensions, a aba do WhatsApp que já
  // estava aberta continua com o script ANTIGO, sem acesso ao Chrome ("Extension context
  // invalidated"). Em vez de travar em silêncio, avisamos e oferecemos recarregar.
  let stale = false;
  let observer = null;
  let timer = null;
  const isDead = () => !(chrome.runtime && chrome.runtime.id);

  function goStale() {
    if (stale) return;
    stale = true;
    clearTimeout(saveTimer); clearTimeout(logTimer);
    if (observer) observer.disconnect();
    clearInterval(timer);
    ui.showStale();
  }

  // Guarda os últimos erros inesperados para o botão de diagnóstico (rodapé do painel).
  const recentErrors = [];

  function onError(e) {
    if (isDead() || /context invalidated/i.test((e && e.message) || '')) { goStale(); return; }
    const msg = (e && e.message) || String(e);
    recentErrors.push({
      quando: new Date().toISOString(),
      mensagem: msg,
      onde: ((e && e.stack) || '').split('\n').slice(0, 4).join('\n'),
    });
    if (recentErrors.length > 10) recentErrors.shift();
    console.error('[CONTEXTO] ' + msg, e); // a mensagem vai no texto, para aparecer na tela de Erros
    ui.flash('Algo deu errado. Clique na versão para copiar o diagnóstico.');
  }

  // ------------------------------------------------------------ persistência
  async function persist() {
    if (!conv) return;
    conv.updatedAt = new Date().toISOString();
    await storage.saveConversation(conv);
  }

  function rerender(resetSummary = false) {
    if (conv) ui.showConversation(conv, display, resetSummary);
  }

  // ------------------------------------------------------------ resolver a conversa aberta
  async function resolve(ident) {
    const token = ++resolveToken;
    clearTimeout(saveTimer); clearTimeout(logTimer);
    await flushSummary(false);
    if (token !== resolveToken) return;

    if (!ident) { conv = null; ui.showEmpty(); return; }
    if (ident.loading) { conv = null; ui.showLoading(); return; }

    let phone = ident.phone;
    if (!phone) {
      if (!aliasCache) aliasCache = await storage.getAliases();
      phone = aliasCache[M.nameKey(ident.name)] || null;
    }
    if (token !== resolveToken) return;

    if (!phone) {
      // Só pede o número se o nome ficar estável por um instante: evita piscar o pedido
      // enquanto o WhatsApp ainda está trocando o texto do cabeçalho.
      conv = null;
      ui.showLoading(ident.name);
      await new Promise((r) => setTimeout(r, PROMPT_DELAY));
      if (token !== resolveToken) return;
      ui.showPrompt(ident.name);
      return;
    }

    let stored = await storage.getConversation(phone);
    if (token !== resolveToken) return;

    if (!stored) {
      stored = M.emptyConversation(phone, ident.name);
    } else if (ident.name && stored.name !== ident.name && !M.looksLikePhone(ident.name)) {
      stored.name = ident.name; // contato salvo ganhou/mudou de nome
      await storage.saveConversation(stored);
    }
    conv = stored;
    display = { name: M.looksLikePhone(ident.name) && conv.name ? conv.name : ident.name };
    ui.resetAddForm();
    rerender(true);
  }

  // ------------------------------------------------------------ resumo (salva enquanto digita)
  async function flushSummary(withLog) {
    if (!conv || pendingSummary === null) return;
    const text = pendingSummary;
    pendingSummary = null;
    M.setSummary(conv, text, { log: withLog });
    try { await persist(); } catch (e) { onError(e); }
  }

  const handlers = {
    rerender: () => rerender(false),
    onRetry() { currentIdentKey = ''; check(); },

    async onToggle() {
      open = !open;
      ui.setOpen(open);
      try { await storage.setUi({ open }); } catch (_) {}
    },

    onSummaryInput(text) {
      if (!conv) return;
      pendingSummary = text;
      clearTimeout(saveTimer); clearTimeout(logTimer);
      saveTimer = setTimeout(() => flushSummary(false), 700);
      logTimer = setTimeout(() => flushSummary(true), 2500); // registra no histórico quando você pausa
    },
    onSummaryBlur() {
      clearTimeout(saveTimer); clearTimeout(logTimer);
      if (conv && pendingSummary !== null) flushSummary(true).then(() => rerender());
    },

    async onAddDemand(text, due) { if (!conv) return; M.addDemand(conv, text, due); await persist(); rerender(); },
    async onEditDemand(id, patch) { if (!conv) return; M.editDemand(conv, id, patch); await persist(); rerender(); },
    async onToggleDemand(id) { if (!conv) return; M.toggleDemand(conv, id); await persist(); rerender(); },
    async onRemoveDemand(id) { if (!conv) return; M.removeDemand(conv, id); await persist(); rerender(); },

    async onConfirmPhone(name, raw) {
      const phone = M.normalizePhone(raw);
      if (!phone) { ui.showPrompt(name, 'Número inválido. Use DDD + número, ex.: 11 91234-5678.'); return; }
      await storage.setAlias(M.nameKey(name), phone);
      aliasCache = null;
      currentIdentKey = ''; // força reler
      check();
    },

    /** Copia para a área de transferência o que o detector enxerga no cabeçalho (sem mensagens). */
    async onDiagnostic() {
      const info = {
        versao: chrome.runtime.getManifest().version,
        quando: new Date().toISOString(),
        cabecalho: detector.debug(),
        painel: conv ? { telefone: conv.phone } : 'sem conversa carregada',
        erros: recentErrors.length ? recentErrors : 'nenhum erro registrado nesta aba',
      };
      const text = JSON.stringify(info, null, 2);
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      ui.flash('Diagnóstico copiado');
    },

    async onExport() {
      try {
        const data = await storage.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `contexto-backup-${new Date().toLocaleDateString('sv-SE')}.json`;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        ui.flash(`Backup salvo (${Object.keys(data.conversations).length} clientes)`);
      } catch (e) { ui.flash('Não foi possível exportar'); }
    },

    async onImport(file) {
      try {
        const data = JSON.parse(await file.text());
        const res = await storage.importAll(data);
        ui.flash(`Importado: ${res.conversations} cliente(s)`);
        currentIdentKey = ''; check();
      } catch (e) { ui.flash(e.message || 'Arquivo inválido'); }
    },
  };

  // Qualquer falha de armazenamento num clique vira aviso, nunca erro solto no console.
  for (const key of Object.keys(handlers)) {
    const fn = handlers[key];
    handlers[key] = (...args) => {
      try {
        const r = fn(...args);
        return r && r.catch ? r.catch(onError) : r;
      } catch (e) { onError(e); }
    };
  }

  // ------------------------------------------------------------ acompanhar a conversa aberta
  function check() {
    if (stale) return;
    if (isDead()) { goStale(); return; }
    let ident = null;
    try { ident = detector.read(); } catch (_) { /* nunca quebrar o WhatsApp */ }
    const key = ident ? (ident.loading ? 'loading' : `${ident.phone || ''}|${ident.name}`) : '';
    if (key === currentIdentKey) return;
    currentIdentKey = key;
    resolve(ident).catch((e) => {
      // Falhou ao abrir ESTA conversa: nunca deixar na tela os dados do cliente anterior.
      conv = null; pendingSummary = null;
      onError(e);
      if (!stale) ui.showLoadError();
    });
  }

  // Reage na hora à primeira mudança e limita a frequência (o WhatsApp altera a página o tempo todo).
  const MIN_GAP = 80; // ms entre verificações
  let lastRun = 0;
  let trailing = null;
  function schedule() {
    const wait = MIN_GAP - (Date.now() - lastRun);
    if (wait <= 0) { lastRun = Date.now(); check(); return; }
    if (!trailing) trailing = setTimeout(() => { trailing = null; lastRun = Date.now(); check(); }, wait);
  }

  async function init() {
    if (document.getElementById('contexto-root')) return;
    ui = NS.ui.mount(handlers);
    try { const s = await storage.getUi(); open = s.open !== false; } catch (e) { onError(e); }
    ui.setOpen(open);
    ui.showEmpty();

    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    timer = setInterval(check, 1500); // rede de segurança
    check();

    // se outra aba do WhatsApp alterar a mesma conversa, atualiza aqui
    storage.subscribe(async (keys) => {
      try {
        if (keys.includes('aliases')) aliasCache = null; // outra aba/importação mudou os nomes
        if (!conv || !keys.includes(storage.convKey(conv.phone))) return;
        const fresh = await storage.getConversation(conv.phone);
        if (fresh && fresh.updatedAt !== conv.updatedAt && pendingSummary === null) { conv = fresh; rerender(false); }
      } catch (e) { onError(e); }
    });
  }

  init();
})();
