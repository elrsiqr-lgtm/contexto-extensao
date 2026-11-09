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

  function onError(e) {
    if (isDead() || /context invalidated/i.test((e && e.message) || '')) { goStale(); return; }
    console.error('[CONTEXTO]', e);
    ui.flash('Algo deu errado. Tente de novo.');
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

    let phone = ident.phone;
    if (!phone) {
      const aliases = await storage.getAliases();
      phone = aliases[M.nameKey(ident.name)] || null;
    }
    if (token !== resolveToken) return;

    if (!phone) { conv = null; ui.showPrompt(ident.name); return; }

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
      currentIdentKey = ''; // força reler
      check();
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
    const key = ident ? `${ident.phone || ''}|${ident.name}` : '';
    if (key === currentIdentKey) return;
    currentIdentKey = key;
    resolve(ident).catch(onError);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; check(); }, 250);
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
        if (!conv || !keys.includes(storage.convKey(conv.phone))) return;
        const fresh = await storage.getConversation(conv.phone);
        if (fresh && fresh.updatedAt !== conv.updatedAt && pendingSummary === null) { conv = fresh; rerender(false); }
      } catch (e) { onError(e); }
    });
  }

  init();
})();
