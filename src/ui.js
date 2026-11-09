/**
 * CONTEXTO — INTERFACE (painel lateral)
 * Só desenha e avisa o main.js do que o usuário fez (via `handlers`).
 * Não conhece o armazenamento nem o WhatsApp.
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});
  const M = NS.model;

  // ---------------------------------------------------------------- ícones (traço fino)
  const P = {
    bolt: '<path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13l0-7.5Z"/>',
    layers: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    bars: '<path d="M5 20v-8M12 20V4M19 20v-5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    sparkle: '<path d="M12 3.5l1.7 5L18.5 10l-4.8 1.5L12 16.5l-1.7-5L5.5 10l4.8-1.5L12 3.5Z"/><path d="M19 15v4M17 17h4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="4"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
    upload: '<path d="M12 16V5m0 0-4 4m4-4 4 4M5 20h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    panel: '<rect x="3" y="4.5" width="18" height="15" rx="4"/><path d="M15 4.5v15"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    note: '<rect x="4" y="3.5" width="16" height="17" rx="4"/><path d="M8 9h8M8 13h5"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;

  // ---------------------------------------------------------------- helpers de DOM
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v; // somente para ícones fixos
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  }
  const btn = (cls, ico, label, onclick, title) =>
    el('button', { class: cls, type: 'button', 'aria-label': title || label || ico, title: title || label, onclick },
      ico ? el('span', { html: icon(ico), style: 'display:contents' }) : null, label || null);

  const fmtStamp = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', ...(sameYear ? {} : { year: '2-digit' }), hour: '2-digit', minute: '2-digit' });
  };
  /** Abre o calendário do navegador. Chrome só abre sozinho ao clicar no ícone do campo; aqui forçamos. */
  function openPicker(input) {
    try { input.showPicker(); } catch (_) { input.focus(); input.click(); }
  }
  const fmtDue = (s) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '');
  const todayStr = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD local

  const HISTORY_LABEL = {
    summary: 'Resumo atualizado',
    demand_added: 'Demanda criada',
    demand_edited: 'Demanda alterada',
    demand_due: 'Prazo alterado',
    demand_done: 'Demanda concluída',
    demand_reopened: 'Demanda reaberta',
    demand_removed: 'Demanda removida',
  };

  // ---------------------------------------------------------------- montagem
  function mount(h) {
    // 1) fonte Sora: @font-face precisa estar no documento (não vale dentro do Shadow DOM)
    const fontCss = [400, 600, 700].map((w) =>
      `@font-face{font-family:'Sora';font-weight:${w};font-style:normal;font-display:swap;src:url(${chrome.runtime.getURL(`fonts/sora-latin-${w}-normal.woff2`)}) format('woff2');}`).join('');
    document.head.append(el('style', { id: 'contexto-fonts' }, fontCss));

    // 2) CSS que empurra a página do WhatsApp para a esquerda (nada fica coberto)
    document.head.append(el('style', { id: 'contexto-layout' }, `
      html.contexto-open #app { width: calc(100vw - 360px) !important; max-width: calc(100vw - 360px) !important; }
      html.contexto-open body { overflow: hidden; }
    `));

    const host = el('div', { id: 'contexto-root' });
    const root = host.attachShadow({ mode: 'open' });
    root.append(el('style', {}, NS.panelCss));
    document.documentElement.append(host);

    // elementos persistentes (mantêm o que você digitou entre redesenhos)
    const summaryEl = el('textarea', { placeholder: 'Escreva aqui o resumo da conversa…', rows: 4 });
    summaryEl.addEventListener('input', () => h.onSummaryInput(summaryEl.value));
    summaryEl.addEventListener('blur', () => h.onSummaryBlur());
    const summaryMeta = el('span', { class: 'meta' });

    const demandInput = el('input', { type: 'text', placeholder: 'Nova demanda…', maxlength: 300 });
    const dueInput = el('input', { type: 'date' });
    const dueLabel = el('span', {}, 'Prazo');
    const duePill = el('span', { class: 'pill due', role: 'button', tabindex: '0', title: 'Escolher prazo' }, el('span', { html: icon('calendar'), style: 'display:contents' }), dueLabel, dueInput);
    duePill.addEventListener('click', () => openPicker(dueInput));
    duePill.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(dueInput); } });
    const submitDemand = () => {
      const text = demandInput.value.trim();
      if (!text) return;
      h.onAddDemand(text, dueInput.value || null);
      demandInput.value = '';
      dueInput.value = '';
      dueLabel.textContent = 'Prazo';
    };
    const syncDueLabel = () => { dueLabel.textContent = dueInput.value ? fmtDue(dueInput.value) : 'Prazo'; };
    dueInput.addEventListener('change', syncDueLabel);
    dueInput.addEventListener('input', syncDueLabel);
    demandInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitDemand(); });
    const addRow = el('div', { class: 'add' },
      demandInput, el('div', { class: 'due-wrap' }, duePill),
      el('button', { class: 'go', type: 'button', 'aria-label': 'Adicionar demanda', title: 'Adicionar', html: icon('plus'), onclick: submitDemand }));

    const phoneInput = el('input', { type: 'tel', placeholder: '+55 11 91234-5678' });

    const scroll = el('div', { class: 'scroll' });
    const toast = el('span', { class: 'toast' });
    const fileInput = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) h.onImport(fileInput.files[0]); fileInput.value = ''; });

    const foot = el('div', { class: 'foot' },
      btn('link', 'download', 'Exportar', () => h.onExport(), 'Exportar backup de todos os registros'),
      btn('link', 'upload', 'Importar', () => fileInput.click(), 'Importar backup'),
      el('span', { class: 'grow' }), toast,
      el('button', { class: 'ver', type: 'button', title: 'Copiar informações para suporte (só textos do cabeçalho da conversa)', onclick: () => h.onDiagnostic() },
        `v${chrome.runtime.getManifest().version}`),
      fileInput);

    const panel = el('aside', { class: 'panel', 'aria-label': 'CONTEXTO' }, scroll, foot);
    const tab = el('button', { class: 'tab', type: 'button', title: 'Abrir/fechar CONTEXTO', 'aria-label': 'Abrir ou fechar CONTEXTO', onclick: () => h.onToggle() },
      el('span', { html: icon('bolt'), style: 'display:contents' }), el('span', { class: 'label' }, 'CONTEXTO'));
    root.append(tab, panel);

    // ------------------------------------------------------------ pedaços
    const brandRow = () => el('div', { class: 'brand' },
      el('span', { html: icon('bolt'), style: 'display:contents' }), 'CONTEXTO', el('span', { class: 'grow' }),
      btn('icon-btn', 'x', '', () => h.onToggle(), 'Fechar painel'));

    function heroEmpty() {
      return el('div', { class: 'hero' }, brandRow(),
        el('div', { class: 'hero-empty' }, 'Abra uma conversa no WhatsApp para ver e registrar o que foi combinado com o cliente.'));
    }

    function heroClient(name, phone) {
      const unsaved = M.looksLikePhone(name); // contato não salvo: o "nome" já é o número
      return el('div', { class: 'hero' }, brandRow(),
        el('div', { class: 'client' }, unsaved ? M.formatPhone(phone) || name : name || 'Cliente'),
        el('div', { class: 'phone' }, unsaved ? 'Contato não salvo' : phone ? M.formatPhone(phone) : 'Número não confirmado'),
        phone ? el('span', { class: 'pill ok' }, 'ativo') : el('span', { class: 'pill' }, 'Aguardando número'));
    }

    function demandItem(d) {
      const late = !d.done && d.due && d.due < todayStr();
      const txt = el('div', { class: 'txt', title: 'Clique para editar' }, d.text);
      txt.addEventListener('click', () => {
        const inp = el('input', { type: 'text', class: 'edit-input', value: d.text, maxlength: 300 });
        let finished = false;
        const finish = (save) => {
          if (finished) return; finished = true;
          const v = inp.value.trim();
          if (save && v && v !== d.text) h.onEditDemand(d.id, { text: v }); else inp.replaceWith(txt);
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
        inp.addEventListener('blur', () => finish(true));
        txt.replaceWith(inp); inp.focus(); inp.select();
      });

      const due = el('input', { type: 'date', value: d.due || '' });
      due.addEventListener('change', () => h.onEditDemand(d.id, { due: due.value || null }));
      const duePillEl = el('span', { class: `pill due${late ? ' late' : ''}` },
        el('span', { html: icon('calendar'), style: 'display:contents' }),
        d.due ? fmtDue(d.due) + (late ? ' · atrasada' : '') : 'Sem prazo', due);
      duePillEl.setAttribute('role', 'button'); duePillEl.setAttribute('tabindex', '0'); duePillEl.title = 'Alterar prazo';
      duePillEl.addEventListener('click', () => openPicker(due));
      duePillEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(due); } });

      const stamp = d.done
        ? `Concluída ${fmtStamp(d.doneAt)}`
        : d.updatedAt !== d.createdAt ? `Alterada ${fmtStamp(d.updatedAt)}` : `Criada ${fmtStamp(d.createdAt)}`;

      return el('li', { class: `item${d.done ? ' done' : ''}` },
        el('button', { class: 'check', type: 'button', title: d.done ? 'Reabrir' : 'Marcar como feita', 'aria-label': 'Alternar feito/pendente', html: icon('check'), onclick: () => h.onToggleDemand(d.id) }),
        el('div', { class: 'body' }, txt, el('div', { class: 'sub' }, duePillEl, el('span', { class: 'stamp' }, stamp))),
        el('button', { class: 'x', type: 'button', title: 'Remover', 'aria-label': 'Remover demanda', html: icon('x'), onclick: () => h.onRemoveDemand(d.id) }));
    }

    let showDone = false;
    let showHistory = false;
    let toastTimer = null;
    let promptName = null;

    function summaryCard(conv) {
      summaryMeta.textContent = conv.summary.updatedAt ? `Atualizado ${fmtStamp(conv.summary.updatedAt)}` : '';
      return el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('layers'), style: 'display:contents' }), el('h3', {}, 'Resumo da conversa'), summaryMeta),
        summaryEl);
    }

    function demandsCard(conv) {
      const pending = conv.demands.filter((d) => !d.done);
      const done = conv.demands.filter((d) => d.done);
      pending.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.createdAt.localeCompare(b.createdAt));
      done.sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

      const card = el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('bars'), style: 'display:contents' }), el('h3', {}, 'Demandas pendentes'),
          el('span', { class: 'pill' }, String(pending.length))));
      card.append(pending.length
        ? el('ul', { class: 'list' }, pending.map(demandItem))
        : el('div', { class: 'empty' }, 'Nada pendente por aqui.'));
      card.append(addRow);
      if (done.length) {
        card.append(el('button', { class: `fold${showDone ? ' open' : ''}`, type: 'button', onclick: () => { showDone = !showDone; h.rerender(); } },
          `Concluídas (${done.length})`, el('span', { html: icon('chevron'), style: 'display:contents' })));
        if (showDone) card.append(el('ul', { class: 'list' }, done.map(demandItem)));
      }
      return card;
    }

    function historyCard(conv) {
      const items = [...conv.history].reverse();
      const card = el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('clock'), style: 'display:contents' }), el('h3', {}, 'Histórico'),
          el('span', { class: 'meta' }, `${items.length} registro${items.length === 1 ? '' : 's'}`)));
      if (!items.length) { card.append(el('div', { class: 'empty' }, 'As alterações aparecem aqui, com data e hora.')); return card; }
      card.append(el('button', { class: `fold${showHistory ? ' open' : ''}`, style: 'margin-top:0', type: 'button', onclick: () => { showHistory = !showHistory; h.rerender(); } },
        showHistory ? 'Ocultar' : 'Ver evolução', el('span', { html: icon('chevron'), style: 'display:contents' })));
      if (showHistory) {
        card.append(el('ul', { class: 'timeline', style: 'margin-top:14px' }, items.slice(0, 60).map((e) =>
          el('li', { class: `tl t-${e.type}` },
            el('div', { class: 'tl-h' }, el('span', { class: 'pill' }, HISTORY_LABEL[e.type] || e.type), el('span', { class: 'tl-t' }, fmtStamp(e.at))),
            e.text ? el('div', { class: 'tl-x' }, e.text) : null))));
      }
      return card;
    }

    // ------------------------------------------------------------ API pública
    return {
      setOpen(open) {
        host.classList.toggle('open', open);
        document.documentElement.classList.toggle('contexto-open', open);
        window.dispatchEvent(new Event('resize')); // o WhatsApp recalcula o tamanho
      },

      flash(msg) {
        toast.textContent = msg;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500);
      },

      /** A extensão foi atualizada/recarregada: esta página precisa ser recarregada. */
      showStale() {
        scroll.replaceChildren(
          el('div', { class: 'hero' }, brandRow(),
            el('div', { class: 'client' }, 'CONTEXTO foi atualizado'),
            el('div', { class: 'phone' }, 'Esta página ainda está com a versão antiga.')),
          el('section', { class: 'card prompt' },
            el('p', {}, 'Recarregue o WhatsApp Web para continuar. Suas anotações estão guardadas e não foram perdidas.'),
            el('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Recarregar página')));
      },

      /** Conversa abrindo: mostra esqueleto em vez de "número não confirmado". */
      showLoading(name) {
        scroll.replaceChildren(
          el('div', { class: 'hero' }, brandRow(),
            el('div', { class: 'client' }, name || 'Carregando conversa…'),
            el('div', { class: 'phone' }, name ? 'Identificando cliente…' : 'Aguarde um instante')),
          el('section', { class: 'card' },
            el('div', { class: 'skeleton', style: 'width:45%;height:12px' }),
            el('div', { class: 'skeleton', style: 'margin-top:14px;height:64px' })),
          el('section', { class: 'card' },
            el('div', { class: 'skeleton', style: 'width:55%;height:12px' }),
            el('div', { class: 'skeleton', style: 'margin-top:14px;height:36px' })));
      },

      /** Não foi possível abrir a conversa: nada de dados antigos na tela. */
      showLoadError() {
        scroll.replaceChildren(
          el('div', { class: 'hero' }, brandRow(),
            el('div', { class: 'client' }, 'Não consegui abrir esta conversa'),
            el('div', { class: 'phone' }, 'Suas anotações estão guardadas.')),
          el('section', { class: 'card prompt' },
            el('p', {}, 'Houve um erro ao carregar. Tente de novo. Se continuar, clique na versão no rodapé para copiar o diagnóstico.'),
            el('button', { class: 'btn', type: 'button', onclick: () => h.onRetry() }, 'Tentar de novo')));
      },

      showEmpty() {
        scroll.replaceChildren(heroEmpty());
      },

      /** Pede o número (uma única vez) quando o WhatsApp só mostra o nome. */
      showPrompt(name, error) {
        // O que foi digitado vale só para o contato que estava na tela: troca de nome => campo limpo.
        if (promptName !== name) phoneInput.value = '';
        promptName = name;
        const submit = () => h.onConfirmPhone(name, phoneInput.value);
        phoneInput.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

        // Prévia bloqueada: deixa claro o que será liberado depois de confirmar o número.
        const locked = (iconName, title, hint) => el('section', { class: 'card locked', 'aria-disabled': 'true' },
          el('div', { class: 'card-h' }, el('span', { html: icon(iconName), style: 'display:contents' }), el('h3', {}, title),
            el('span', { html: icon('lock'), class: 'lock-ic', style: 'display:flex' })),
          el('div', { class: 'ghost-line' }, hint));

        scroll.replaceChildren(
          heroClient(name, null),
          el('section', { class: 'card prompt need' },
            el('div', { class: 'card-h' }, el('span', { html: icon('lock'), style: 'display:contents' }), el('h3', {}, 'Confirme o número para começar')),
            el('p', {}, `Resumo e demandas ficam bloqueados até você confirmar o número de “${name}”. Digite uma vez e eu lembro daqui em diante.`),
            el('div', { class: 'row' }, phoneInput, el('button', { class: 'btn', type: 'button', onclick: submit }, 'Salvar')),
            error ? el('div', { class: 'err' }, error) : null),
          locked('layers', 'Resumo da conversa', 'Disponível depois de confirmar o número'),
          locked('bars', 'Demandas pendentes', 'Disponível depois de confirmar o número'));
        setTimeout(() => phoneInput.focus(), 50);
      },

      /**
       * Desenha a conversa. `resetSummary` = true quando mudou de cliente
       * (aí o texto do resumo é trocado mesmo com o campo em foco).
       */
      showConversation(conv, display, resetSummary) {
        if (resetSummary || summaryEl.getRootNode().activeElement !== summaryEl) summaryEl.value = conv.summary.text;
        // ordem: topo -> resumo -> demandas pendentes -> histórico
        scroll.replaceChildren(heroClient(display.name, conv.phone), summaryCard(conv), demandsCard(conv), historyCard(conv));
      },

      resetAddForm() { demandInput.value = ''; dueInput.value = ''; dueLabel.textContent = 'Prazo'; },
    };
  }

  NS.ui = { mount };
})();
