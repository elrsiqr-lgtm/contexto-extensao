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
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
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
    summary: 'Notas atualizadas',
    demand_added: 'Demanda criada',
    demand_edited: 'Demanda alterada',
    demand_due: 'Prazo alterado',
    demand_done: 'Demanda concluída',
    demand_reopened: 'Demanda reaberta',
    demand_removed: 'Demanda removida',
    note_saved: 'Nota salva',
    note_edited: 'Nota salva alterada',
    note_removed: 'Nota salva excluída',
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
    const summaryEl = el('textarea', { placeholder: 'Escreva aqui as notas importantes…', rows: 4 });
    summaryEl.addEventListener('input', () => h.onSummaryInput(summaryEl.value));
    summaryEl.addEventListener('blur', () => h.onSummaryBlur());
    const summaryMeta = el('span', { class: 'meta' });

    // ---- formulário de nova demanda (sem popup escondido: atalhos + campo de data VISÍVEL)
    const demandInput = el('input', { type: 'text', placeholder: 'Nova demanda…', maxlength: 300 });
    const dueInput = el('input', { type: 'date', class: 'due-native', 'aria-label': 'Data do prazo' });
    const addHint = el('div', { class: 'err', style: 'display:none;margin:0' });
    const otherLabel = el('span', {}, 'Outra data');
    let dueValue = null;
    let otherOpen = false;

    const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv-SE'); };
    const chips = [['Hoje', 0], ['Amanhã', 1], ['Em 7 dias', 7]].map(([label, n]) => {
      const b = el('button', { class: 'chip', type: 'button', onclick: () => { h.onUiEvent && h.onUiEvent(`clique em ${label}`); setDue(dueValue === plusDays(n) ? null : plusDays(n)); } }, label);
      b.dataset.n = String(n);
      return b;
    });
    const otherChip = el('button', { class: 'chip', type: 'button',
      onclick: () => { h.onUiEvent && h.onUiEvent('clique em Outra data'); otherOpen = !otherOpen; paintDue(); if (otherOpen) dueInput.focus(); } },
      el('span', { html: icon('calendar'), style: 'display:contents' }), otherLabel);
    const dateRow = el('div', { class: 'date-row', style: 'display:none' }, dueInput);

    function paintDue() {
      let preset = false;
      for (const c of chips) {
        const on = !!dueValue && plusDays(Number(c.dataset.n)) === dueValue;
        c.classList.toggle('on', on);
        preset = preset || on;
      }
      const custom = !!dueValue && !preset;
      otherChip.classList.toggle('on', custom);
      otherLabel.textContent = custom ? fmtDue(dueValue) : 'Outra data';
      dateRow.style.display = otherOpen || custom ? 'block' : 'none';
    }
    function setDue(v, fromInput) {
      dueValue = v || null;
      if (!fromInput) dueInput.value = dueValue || '';
      paintDue();
    }
    dueInput.addEventListener('change', () => setDue(dueInput.value || null, true));
    dueInput.addEventListener('input', () => setDue(dueInput.value || null, true));

    const showHint = (msg) => { addHint.textContent = msg; addHint.style.display = msg ? 'block' : 'none'; };
    demandInput.addEventListener('input', () => showHint(''));
    const submitDemand = async () => {
      const text = demandInput.value.trim();
      if (!text) { h.onUiEvent && h.onUiEvent('clique em Adicionar demanda (campo vazio)'); showHint('Escreva a demanda antes de adicionar.'); demandInput.focus(); return; }
      showHint('');
      h.onUiEvent && h.onUiEvent('clique em Adicionar demanda');
      const ok = await h.onAddDemand(text, dueValue);
      if (ok === false) return; // o painel já explicou o motivo
      demandInput.value = '';
      otherOpen = false;
      setDue(null);
      demandInput.focus();
    };
    demandInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitDemand(); });
    const addRow = el('div', { class: 'addbox' },
      demandInput,
      el('div', { class: 'chips' }, ...chips, otherChip),
      dateRow,
      addHint,
      el('button', { class: 'btn full', type: 'button', onclick: submitDemand },
        el('span', { html: icon('plus'), style: 'display:contents' }), 'Adicionar demanda'));
    paintDue();

    // ---- Nunca redesenhar o painel NO MEIO de um clique.
    // Se o painel se redesenha entre o "apertar" e o "soltar" do mouse, o botão pressionado sai da tela
    // e o clique se perde. Por isso, enquanto o ponteiro está pressionado, o redesenho espera a soltura.
    let pointerDown = false;
    let queuedPaint = null;
    let pointerGuard = null;
    const releasePointer = () => {
      clearTimeout(pointerGuard);
      pointerDown = false; // o "click" vem logo depois: redesenhos disparados por ele já podem acontecer na hora
      setTimeout(() => {   // e o que ficou esperando é desenhado só depois que o "click" foi entregue
        if (queuedPaint) { const run = queuedPaint; queuedPaint = null; run(); }
      }, 0);
    };
    window.addEventListener('pointerdown', (e) => {
      if (!e.composedPath().includes(host)) return;
      pointerDown = true;
      clearTimeout(pointerGuard);
      pointerGuard = setTimeout(releasePointer, 3000); // segurança: nunca travar o painel
    }, true);
    for (const type of ['pointerup', 'pointercancel', 'dragend']) window.addEventListener(type, () => { if (pointerDown) releasePointer(); }, true);
    window.addEventListener('blur', () => { if (pointerDown) releasePointer(); });

    const phoneInput = el('input', { type: 'tel', placeholder: '+55 11 91234-5678' });

    const scroll = el('div', { class: 'scroll' });
    const toast = el('span', { class: 'toast' });
    const fileInput = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) h.onImport(fileInput.files[0]); fileInput.value = ''; });

    const logoUrl = chrome.runtime.getURL('assets/logo.png');
    const foot = el('div', { class: 'foot' },
      btn('link', 'download', 'Exportar', () => h.onExport(), 'Exportar backup de todos os registros'),
      btn('link', 'upload', 'Importar', () => fileInput.click(), 'Importar backup'),
      el('span', { class: 'grow' }), toast,
      // Marca do autor (discreta). Se a imagem não carregar, ela some sem deixar espaço.
      el('img', { class: 'logo', src: chrome.runtime.getURL('assets/autor.png'), alt: 'Marca do autor', title: 'Marca do autor', draggable: 'false', onerror: (e) => e.target.remove() }),
      el('button', { class: 'ver', type: 'button', title: 'Copiar informações para suporte (só textos do cabeçalho da conversa)', onclick: () => h.onDiagnostic() },
        `v${chrome.runtime.getManifest().version}`),
      fileInput);

    // Barra do topo (fora dos cartões): logo CONTEXTO à esquerda e botão de fechar à direita.
    // Se a imagem do logo falhar, volta ao raio + nome em texto.
    const brandMark = () => {
      const box = el('span', { class: 'brand-mark' });
      box.append(el('img', { class: 'brand-logo', src: logoUrl, alt: 'CONTEXTO', draggable: 'false', onerror: () => {
        box.replaceChildren(el('span', { html: icon('bolt'), style: 'display:contents' }), 'CONTEXTO');
      } }));
      return box;
    };
    const brandBar = el('div', { class: 'brandbar' },
      brandMark(), el('span', { class: 'grow' }),
      btn('icon-btn', 'x', '', () => h.onToggle(), 'Fechar painel'));

    const panel = el('aside', { class: 'panel', 'aria-label': 'CONTEXTO' }, brandBar, scroll, foot);
    // Aba lateral ("puxador"): o C do logo (fechado) ou um ícone discreto (aberto). Se a imagem falhar, volta ao raio + nome.
    const logoBox = el('span', { class: 'tab-logo' });
    logoBox.append(el('img', { src: chrome.runtime.getURL('assets/c.png'), alt: '', draggable: 'false', onerror: () => {
      logoBox.replaceChildren(el('span', { html: icon('bolt'), style: 'display:contents' }), el('span', { class: 'label' }, 'CONTEXTO'));
      logoBox.classList.add('fallback');
    } }));
    const tab = el('button', { class: 'tab', type: 'button', title: 'Abrir/fechar CONTEXTO', 'aria-label': 'Abrir ou fechar CONTEXTO', onclick: () => h.onToggle() },
      logoBox, el('span', { class: 'tab-ico', html: icon('panel') }));
    root.append(tab, panel);

    // ------------------------------------------------------------ pedaços
    function heroEmpty() {
      return el('div', { class: 'hero' },
        el('div', { class: 'hero-empty' }, 'Abra uma conversa no WhatsApp para ver e registrar o que foi combinado com o cliente.'));
    }

    function heroClient(name, phone, opts = {}) {
      const unsaved = M.looksLikePhone(name); // contato não salvo: o "nome" já é o número
      const group = M.isGroup(phone);
      return el('div', { class: 'hero' },
        el('div', { class: 'client' }, unsaved ? M.formatPhone(phone) || name : name || 'Cliente'),
        el('div', { class: 'phone' }, group ? 'Grupo' : unsaved ? 'Contato não salvo' : phone ? M.formatPhone(phone) : 'Número não confirmado'),
        phone ? el('span', { class: 'pill ok' }, 'ativo') : el('span', { class: 'pill' }, 'Aguardando número'),
        opts.editable ? el('button', { class: 'hero-link', type: 'button', onclick: () => h.onResetIdentity(name) }, 'Trocar número ou grupo') : null);
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

      const duePillEl = el('button', { class: `pill due${late ? ' late' : ''}`, type: 'button', title: 'Alterar prazo' },
        el('span', { html: icon('calendar'), style: 'display:contents' }),
        d.due ? fmtDue(d.due) + (late ? ' · atrasada' : '') : 'Sem prazo');
      duePillEl.addEventListener('click', () => {
        const inp = el('input', { type: 'date', class: 'due-edit', value: d.due || '', 'aria-label': 'Prazo' });
        inp.addEventListener('change', () => h.onEditDemand(d.id, { due: inp.value || null }));
        inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') h.rerender(); });
        const box = el('span', { class: 'due-editor' }, inp,
          el('button', { class: 'link', type: 'button', onclick: () => h.onEditDemand(d.id, { due: null }) }, 'Sem prazo'),
          el('button', { class: 'link', type: 'button', onclick: () => h.rerender() }, 'Fechar'));
        duePillEl.replaceWith(box);
        inp.focus();
      });

      const stamp = d.done
        ? `Concluída ${fmtStamp(d.doneAt)}`
        : d.updatedAt !== d.createdAt ? `Alterada ${fmtStamp(d.updatedAt)}` : `Criada ${fmtStamp(d.createdAt)}`;

      return el('li', { class: `item${d.done ? ' done' : ''}` },
        el('button', { class: 'check', type: 'button', title: d.done ? 'Reabrir' : 'Marcar como feita', 'aria-label': 'Alternar feito/pendente', html: icon('check'), onclick: () => h.onToggleDemand(d.id) }),
        el('div', { class: 'body' }, txt, el('div', { class: 'sub' }, duePillEl, el('span', { class: 'stamp' }, stamp))),
        el('button', { class: 'x', type: 'button', title: 'Remover', 'aria-label': 'Remover demanda', html: icon('x'), onclick: () => h.onRemoveDemand(d.id) }));
    }

    let showDone = false;
    let activeTab = 'principal';   // 'principal' | 'notas' | 'historico'
    let removingNote = null;       // id da nota salva aguardando confirmação de exclusão
    let toastTimer = null;
    let promptName = null;
    const suggestions = {}; // nome -> número sugerido (lido da ficha do contato)

    function summaryCard(conv) {
      summaryMeta.textContent = conv.summary.updatedAt ? `Atualizado ${fmtStamp(conv.summary.updatedAt)}` : '';
      return el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('layers'), style: 'display:contents' }), el('h3', {}, 'Notas importantes'), summaryMeta),
        summaryEl,
        el('div', { class: 'save-row' },
          el('button', { class: 'btn ghost', type: 'button', onclick: () => h.onSaveNote() },
            el('span', { html: icon('bookmark'), style: 'display:contents' }), 'Salvar nota'),
          el('span', { class: 'meta' }, 'Guarda uma cópia em “Notas salvas”')));
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
        card.append(el('div', { class: 'meta', style: 'margin-top:6px' }, `Concluídas ficam ${M.DONE_DAYS} dias e depois são apagadas.`));
        if (showDone) card.append(el('ul', { class: 'list' }, done.map(demandItem)));
      }
      return card;
    }

    let confirmClear = false;
    function historyCard(conv) {
      const items = [...conv.history].reverse();
      const card = el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('clock'), style: 'display:contents' }), el('h3', {}, 'Histórico'),
          el('span', { class: 'meta' }, `${items.length} registro${items.length === 1 ? '' : 's'}`),
          items.length ? el('button', { class: 'link', type: 'button', onclick: () => { confirmClear = true; h.rerender(); } }, 'Limpar') : null));
      if (confirmClear && items.length) {
        card.append(el('div', { class: 'confirm' },
          el('p', {}, 'Apagar todo o histórico desta conversa? As notas e as demandas não são apagadas.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn', type: 'button', onclick: () => { confirmClear = false; h.onClearHistory(); } }, 'Sim, limpar'),
            el('button', { class: 'btn ghost', type: 'button', onclick: () => { confirmClear = false; h.rerender(); } }, 'Cancelar'))));
      }
      if (!items.length) {
        card.append(el('div', { class: 'empty' }, 'As alterações aparecem aqui, com data e hora.'));
      } else {
        card.append(el('ul', { class: 'timeline', style: 'margin-top:6px' }, items.slice(0, 100).map((e) =>
          el('li', { class: `tl t-${e.type}` },
            el('div', { class: 'tl-h' }, el('span', { class: 'pill' }, HISTORY_LABEL[e.type] || e.type), el('span', { class: 'tl-t' }, fmtStamp(e.at))),
            e.text ? el('div', { class: 'tl-x' }, e.text) : null))));
      }
      return card;
    }

    function savedNoteItem(n) {
      const txt = el('div', { class: 'note-txt', title: 'Clique para editar' }, n.text);
      txt.addEventListener('click', () => {
        const ta = el('textarea', { class: 'edit-note', rows: 4 });
        ta.value = n.text;
        let finished = false;
        const finish = (save) => {
          if (finished) return; finished = true;
          const v = ta.value.trim();
          if (save && v && v !== n.text) h.onEditSavedNote(n.id, v); else ta.replaceWith(txt);
        };
        ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') finish(false); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish(true); });
        ta.addEventListener('blur', () => finish(true));
        txt.replaceWith(ta); ta.focus();
      });
      const edited = n.updatedAt !== n.createdAt ? ` · editada ${fmtStamp(n.updatedAt)}` : '';
      const li = el('li', { class: 'note' },
        el('div', { class: 'note-h' },
          el('span', { class: 'stamp' }, `Salva ${fmtStamp(n.createdAt)}${edited}`),
          el('span', { class: 'note-actions' },
            el('button', { class: 'mini', type: 'button', title: 'Copiar', 'aria-label': 'Copiar nota', html: icon('copy'),
              onclick: async () => { try { await navigator.clipboard.writeText(n.text); api.flash('Nota copiada'); } catch (_) { api.flash('Não foi possível copiar'); } } }),
            el('button', { class: 'mini', type: 'button', title: 'Excluir', 'aria-label': 'Excluir nota', html: icon('x'),
              onclick: () => { removingNote = n.id; h.rerender(); } }))),
        txt);
      if (removingNote === n.id) {
        li.append(el('div', { class: 'confirm', style: 'margin:10px 0 0' },
          el('p', {}, 'Excluir esta nota salva?'),
          el('div', { class: 'row' },
            el('button', { class: 'btn', type: 'button', onclick: () => { removingNote = null; h.onRemoveSavedNote(n.id); } }, 'Sim, excluir'),
            el('button', { class: 'btn ghost', type: 'button', onclick: () => { removingNote = null; h.rerender(); } }, 'Cancelar'))));
      }
      return li;
    }

    function savedNotesCard(conv) {
      const notes = [...(conv.savedNotes || [])].reverse();
      const card = el('section', { class: 'card' },
        el('div', { class: 'card-h' }, el('span', { html: icon('bookmark'), style: 'display:contents' }), el('h3', {}, 'Notas salvas'),
          el('span', { class: 'meta' }, `${notes.length} nota${notes.length === 1 ? '' : 's'}`)));
      if (!notes.length) {
        card.append(el('div', { class: 'empty' }, 'Escreva em “Notas importantes” (aba Principal) e clique em “Salvar nota” para guardar uma cópia datada aqui.'));
      } else {
        card.append(el('ul', { class: 'note-list' }, notes.map(savedNoteItem)));
      }
      return card;
    }

    function tabsBar(conv) {
      const defs = [['principal', 'Principal', 0], ['notas', 'Notas salvas', (conv.savedNotes || []).length], ['historico', 'Histórico', conv.history.length]];
      return el('div', { class: 'seg', role: 'tablist', 'aria-label': 'Seções do painel' }, defs.map(([id, label, count]) =>
        el('button', { class: `seg-btn${activeTab === id ? ' on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(activeTab === id),
          onclick: () => { if (activeTab !== id) { activeTab = id; h.rerender(); } } },
          label, count ? el('span', { class: 'count' }, String(count)) : null)));
    }

    // ------------------------------------------------------------ API pública
    const api = {
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
          el('div', { class: 'hero' },
            el('div', { class: 'client' }, 'CONTEXTO foi atualizado'),
            el('div', { class: 'phone' }, 'Esta página ainda está com a versão antiga.')),
          el('section', { class: 'card prompt' },
            el('p', {}, 'Recarregue o WhatsApp Web para continuar. Suas anotações estão guardadas e não foram perdidas.'),
            el('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Recarregar página')));
      },

      /** Conversa abrindo: mostra esqueleto em vez de "número não confirmado". */
      showLoading(name) {
        scroll.replaceChildren(
          el('div', { class: 'hero' },
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
      /** Número lido na ficha do contato: só SUGERE. Nada é liberado até o usuário confirmar. */
      setSuggestion(name, phone) {
        if (!phone || suggestions[name] === phone) return;
        suggestions[name] = phone;
        if (promptName === name && scroll.querySelector('.prompt.need')) this.showPrompt(name, undefined, true);
      },

      showLoadError() {
        scroll.replaceChildren(
          el('div', { class: 'hero' },
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
      showPrompt(name, error, keepFocus) {
        // O que foi digitado vale só para o contato que estava na tela: troca de nome => campo limpo.
        if (promptName !== name) phoneInput.value = '';
        promptName = name;
        const submit = () => h.onConfirmPhone(name, phoneInput.value);
        const suggested = suggestions[name];
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
            el('p', {}, `Notas e demandas ficam bloqueadas até você confirmar o número de “${name}” ou salvar como grupo. Faz uma vez só: eu lembro daqui em diante.`),
            suggested ? el('div', { class: 'suggest' },
              el('div', { class: 'suggest-t' }, 'Encontrei este número na ficha do contato:'),
              el('div', { class: 'suggest-n' }, M.formatPhone(suggested)),
              el('button', { class: 'btn', type: 'button', onclick: () => h.onConfirmPhone(name, suggested) }, 'Confirmar este número'),
              el('div', { class: 'suggest-o' }, 'ou digite outro abaixo')) : null,
            el('div', { class: 'row' }, phoneInput, el('button', { class: 'btn', type: 'button', onclick: submit }, 'Salvar')),
            error ? el('div', { class: 'err' }, error) : null,
            el('div', { class: 'or' }, 'ou, se for um grupo (sem número)'),
            el('button', { class: 'btn ghost full', type: 'button', onclick: () => h.onConfirmGroup(name) }, 'Salvar como grupo')),
          locked('layers', 'Notas importantes', 'Disponível depois de confirmar o número'),
          locked('bars', 'Demandas pendentes', 'Disponível depois de confirmar o número'));
        if (!keepFocus) setTimeout(() => phoneInput.focus(), 50);
      },

      /**
       * Desenha a conversa. `resetSummary` = true quando mudou de cliente
       * (aí o texto do resumo é trocado mesmo com o campo em foco).
       */
      showConversation(conv, display, resetSummary) {
        if (resetSummary) { confirmClear = false; activeTab = 'principal'; removingNote = null; }   // ao abrir uma conversa: sempre a aba Principal
        if (resetSummary || summaryEl.getRootNode().activeElement !== summaryEl) summaryEl.value = conv.summary.text;
        const content = activeTab === 'notas' ? [savedNotesCard(conv)]
          : activeTab === 'historico' ? [historyCard(conv)]
          : [summaryCard(conv), demandsCard(conv)];                 // Principal: notas + demandas pendentes
        scroll.replaceChildren(heroClient(display.name, conv.phone, { editable: !M.looksLikePhone(display.name) }), tabsBar(conv), ...content);
      },

      resetAddForm() { demandInput.value = ''; otherOpen = false; setDue(null); showHint(''); },
    };

    // métodos que redesenham: se o mouse está pressionado, espera soltar (o último pedido vale)
    for (const name of ['showEmpty', 'showLoading', 'showPrompt', 'showConversation', 'showStale', 'showLoadError']) {
      const fn = api[name];
      const paint = (args) => {
        // Redesenhar tira os campos da tela e os recoloca SEM foco. Guardamos o campo ativo (e o cursor)
        // e devolvemos o foco no fim, para o que a pessoa está digitando não cair no vazio.
        const active = root.activeElement;
        const sel = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
        fn.apply(api, args);
        if (active && active.isConnected && root.activeElement !== active) {
          active.focus({ preventScroll: true });
          if (sel) { try { active.setSelectionRange(sel[0], sel[1]); } catch (_) { /* campo sem cursor (ex.: data) */ } }
        }
      };
      api[name] = (...args) => {
        if (pointerDown) { queuedPaint = () => paint(args); return; }
        queuedPaint = null;
        paint(args);
      };
    }
    return api;
  }

  NS.ui = { mount };
})();
