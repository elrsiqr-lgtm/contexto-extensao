/**
 * CONTEXTO (site) — telas e interação.
 * Só desenha o que a camada de dados (data.js) entrega. Todo texto de cliente entra na página como TEXTO
 * (nunca como HTML), então uma nota com "<script>" aparece escrita, sem executar nada.
 */
(() => {
  const D = window.CTXSITE.data;
  const VERSAO = '0.1.0';

  // ---------------------------------------------------------------- ícones (traço fino, como na extensão)
  const P = {
    layers: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    bars: '<path d="M5 20v-8M12 20V4M19 20v-5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    bookmark: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    upload: '<path d="M12 16V5m0 0-4 4m4-4 4 4M5 20h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="4"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    sparkle: '<path d="M12 3.5l1.7 5L18.5 10l-4.8 1.5L12 16.5l-1.7-5L5.5 10l4.8-1.5L12 3.5Z"/><path d="M19 15v4M17 17h4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="3"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
  const ico = (n) => el('span', { html: icon(n), style: 'display:contents' });

  const HISTORY_LABEL = {
    summary: 'Notas atualizadas', demand_added: 'Demanda criada', demand_edited: 'Demanda alterada', demand_due: 'Prazo alterado',
    demand_done: 'Demanda concluída', demand_reopened: 'Demanda reaberta', demand_removed: 'Demanda removida',
    note_saved: 'Nota salva', note_edited: 'Nota salva alterada', note_removed: 'Nota salva excluída',
  };

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;                 // só para os ícones fixos acima
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  }

  // ---------------------------------------------------------------- estado
  let persistidos = D.load();
  const S = { clientes: persistidos, demo: false, sel: null, tab: 'geral', q: '', verConcluidas: false, confirmarLimpar: false };
  let toastTimer = null;

  // ---------------------------------------------------------------- utilidades
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hoje = () => new Date().toLocaleDateString('sv-SE');
  const fmtStamp = (iso) => {
    if (!iso) return '';
    const d = new Date(iso); const mesmoAno = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', ...(mesmoAno ? {} : { year: '2-digit' }), hour: '2-digit', minute: '2-digit' });
  };
  const fmtPrazo = (s) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '');
  const pendentes = (c) => c.demandas.filter((d) => !d.concluida);
  const atrasada = (d) => !d.concluida && d.prazo && d.prazo < hoje();
  const atrasadas = (c) => c.demandas.filter(atrasada);
  const inicial = (c) => (c.empresa || c.pessoa || c.nome || '?').trim().charAt(0).toUpperCase();
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const porPrazo = (a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999') || (a.criadaEm || '').localeCompare(b.criadaEm || '');

  function ordenados() {
    const q = norm(S.q);
    return S.clientes
      .filter((c) => !q || norm(`${c.nome} ${c.empresa} ${c.id}`).includes(q))
      .sort((a, b) => atrasadas(b).length - atrasadas(a).length || pendentes(b).length - pendentes(a).length
        || (b.atualizadoEm || '').localeCompare(a.atualizadoEm || '') || a.nome.localeCompare(b.nome));
  }
  const clienteAtual = () => S.clientes.find((c) => c.id === S.sel) || null;

  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = el('div', { class: 'toast', role: 'status' }, msg); document.body.append(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 4200);
  }

  // ---------------------------------------------------------------- ações
  function irParaCliente(id, tab = 'geral') {
    S.sel = id; S.tab = tab; S.verConcluidas = false; render();
    // no celular a lista fica acima dos detalhes: desce até o cliente; no computador, volta ao topo
    if (window.matchMedia('(max-width: 960px)').matches) document.querySelector('.content').scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }
  function irParaCarteira() { S.sel = null; render(); window.scrollTo({ top: 0 }); }

  async function importar(file) {
    try {
      const novos = await D.fromBackup(JSON.parse(await file.text()));
      if (S.demo) { S.demo = false; S.clientes = persistidos; }
      persistidos = D.merge(persistidos, novos); S.clientes = persistidos;
      D.save(persistidos); S.sel = null; S.q = '';
      render(); toast(`Importado: ${plural(novos.length, 'cliente', 'clientes')}.`);
    } catch (e) { toast(e instanceof SyntaxError ? 'Esse arquivo não é um JSON válido.' : (e.message || 'Não foi possível importar.')); }
  }
  function abrirArquivo() { const i = document.getElementById('arquivo'); i.value = ''; i.click(); }
  function verExemplo() { S.demo = true; S.clientes = D.demo(); S.sel = null; S.q = ''; render(); }
  function sairDoExemplo() { S.demo = false; S.clientes = persistidos; S.sel = null; render(); }
  function limparLocal() { D.clear(); persistidos = []; S.clientes = []; S.sel = null; S.confirmarLimpar = false; S.demo = false; render(); toast('Dados locais apagados.'); }

  // ---------------------------------------------------------------- partes da tela
  function demandaLinha(c, d, comCliente) {
    const late = atrasada(d);
    return el('li', { class: `row-item${d.concluida ? ' done' : ''}` },
      el('span', { class: 'check', html: icon('check') }),
      el('div', { style: 'min-width:0;flex:1' },
        el('div', { class: 't' }, d.texto),
        el('div', { class: 's' },
          comCliente ? el('span', { class: 'pill' }, c.nome) : null,
          d.concluida ? el('span', { class: 'meta' }, `Concluída ${fmtStamp(d.concluidaEm)}`)
            : el('span', { class: `pill${late ? ' late' : ''}` }, ico('calendar'), d.prazo ? fmtPrazo(d.prazo) + (late ? ' · atrasada' : '') : 'Sem prazo'))),
      comCliente ? el('button', { class: 'link go', type: 'button', onclick: () => irParaCliente(c.id) }, 'Abrir') : null);
  }

  function topo() {
    const bar = document.getElementById('topbar'); bar.replaceChildren(
      el('img', { class: 'logo', src: 'assets/logo.png', alt: 'CONTEXTO', title: 'Voltar à carteira', onclick: irParaCarteira }),
      el('span', { class: 'grow' }),
      el('div', { class: 'actions' },
        S.demo ? el('span', { class: 'pill', title: 'Dados de exemplo: nada disso foi salvo' }, 'Exemplo') : el('span', { class: 'pill ok', title: 'Os dados ficam só neste navegador' }, 'Modo local'),
        S.demo ? el('button', { class: 'btn ghost', type: 'button', onclick: sairDoExemplo }, 'Sair do exemplo') : el('button', { class: 'btn ghost', type: 'button', onclick: verExemplo }, ico('sparkle'), 'Dados de exemplo'),
        el('button', { class: 'btn', type: 'button', onclick: abrirArquivo }, ico('upload'), 'Importar backup')));
  }

  function lateral() {
    const lista = ordenados();
    return el('aside', { class: 'side', 'aria-label': 'Clientes' },
      el('label', { class: 'search' }, ico('search'), el('span', { class: 'sr' }, 'Buscar cliente'),
        el('input', { type: 'search', placeholder: 'Buscar por nome, empresa ou ID…', value: S.q, autocomplete: 'off',
          oninput: (e) => { S.q = e.target.value; const pos = e.target.selectionStart; render(); const i = document.querySelector('.search input'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (_) {} } } })),
      el('div', { class: 'meta', style: 'padding:0 6px' }, S.q ? `${plural(lista.length, 'resultado', 'resultados')} de ${S.clientes.length}` : plural(S.clientes.length, 'cliente', 'clientes')),
      lista.length ? el('ul', { class: 'clist' }, lista.map((c) => {
        const pe = pendentes(c).length, at = atrasadas(c).length;
        return el('li', {}, el('button', { class: `citem${S.sel === c.id ? ' on' : ''}`, type: 'button', 'aria-current': S.sel === c.id ? 'true' : null, onclick: () => irParaCliente(c.id) },
          el('span', { class: 'avatar', 'aria-hidden': 'true' }, inicial(c)),
          el('span', { class: 'info' }, el('div', { class: 'nome' }, c.nome), el('div', { class: 'emp' }, `${c.empresa || 'Sem empresa'} · ${c.id}`)),
          el('span', { class: 'badges' }, at ? el('span', { class: 'pill late' }, `${at} atrasada${at > 1 ? 's' : ''}`) : null, pe ? el('span', { class: 'pill' }, plural(pe, 'pendente', 'pendentes')) : null)));
      })) : el('div', { class: 'empty', style: 'padding:8px 6px' }, 'Nenhum cliente encontrado.'));
  }

  function boasVindas() {
    return el('section', { class: 'card welcome' },
      el('img', { src: 'assets/logo.png', alt: 'CONTEXTO' }),
      el('h1', {}, 'Traga seus clientes para cá'),
      el('p', {}, 'Cada cliente tem a própria tela, com notas salvas, demandas e histórico. Por enquanto, os dados vêm do backup da extensão e ficam só neste navegador.'),
      el('ol', { class: 'steps' },
        el('li', {}, 'Na extensão, no rodapé do painel, clique em Exportar.'),
        el('li', {}, 'Aqui, clique em Importar backup e escolha o arquivo.'),
        el('li', {}, 'Pronto: seus clientes aparecem à esquerda.')),
      el('div', { class: 'cta' },
        el('button', { class: 'btn', type: 'button', onclick: abrirArquivo }, ico('upload'), 'Importar backup'),
        el('button', { class: 'btn ghost', type: 'button', onclick: verExemplo }, ico('sparkle'), 'Ver dados de exemplo')),
      el('p', { class: 'meta', style: 'margin-top:18px' }, 'O número de telefone nunca é guardado nem mostrado aqui.'));
  }

  function carteira() {
    const todos = S.clientes;
    const pend = todos.flatMap((c) => pendentes(c).map((d) => ({ c, d })));
    const atr = pend.filter(({ d }) => atrasada(d)).sort((a, b) => porPrazo(a.d, b.d));
    const prox = pend.filter(({ d }) => d.prazo && !atrasada(d)).sort((a, b) => porPrazo(a.d, b.d)).slice(0, 8);
    const notas = todos.reduce((n, c) => n + c.notasSalvas.length, 0);
    const stat = (n, l, warn) => el('div', { class: `card stat${warn ? ' warn' : ''}` }, el('div', { class: 'n' }, String(n)), el('div', { class: 'l' }, l));
    return [
      el('div', { class: 'hero' }, el('div', { class: 'nome' }, 'Carteira de clientes'), el('div', { class: 'sub' }, 'Visão geral de tudo o que está pendente.')),
      el('div', { class: 'stats-grid' }, stat(todos.length, 'clientes'), stat(pend.length, 'demandas pendentes'), stat(atr.length, 'atrasadas', atr.length > 0), stat(notas, 'notas salvas')),
      el('div', { class: 'two' },
        el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('bars'), el('h3', {}, 'Precisam de atenção'), el('span', { class: 'pill late' }, String(atr.length))),
          atr.length ? el('ul', { class: 'rows' }, atr.slice(0, 10).map(({ c, d }) => demandaLinha(c, d, true))) : el('div', { class: 'empty' }, 'Nada atrasado.')),
        el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('calendar'), el('h3', {}, 'Próximos prazos')),
          prox.length ? el('ul', { class: 'rows' }, prox.map(({ c, d }) => demandaLinha(c, d, true))) : el('div', { class: 'empty' }, 'Nenhum prazo à vista.')))];
  }

  function abas(c) {
    const defs = [['geral', 'Visão geral', 0, false], ['notas', 'Notas salvas', c.notasSalvas.length, false], ['historico', 'Histórico', c.historico.length, false], ['ia', 'Análise IA', 0, true]];
    return el('div', { class: 'seg', role: 'tablist', 'aria-label': 'Seções do cliente' }, defs.map(([id, rotulo, n, breve]) =>
      el('button', { class: `seg-btn${S.tab === id ? ' on' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(S.tab === id), onclick: () => { S.tab = id; render(); } },
        rotulo, n ? el('span', { class: 'count' }, String(n)) : null, breve ? el('span', { class: 'soon' }, 'em breve') : null)));
  }

  function abaGeral(c) {
    const pe = pendentes(c).sort(porPrazo), ok = c.demandas.filter((d) => d.concluida).sort((a, b) => (b.concluidaEm || '').localeCompare(a.concluidaEm || ''));
    const dem = el('section', { class: 'card' },
      el('div', { class: 'card-h' }, ico('bars'), el('h3', {}, 'Demandas'), el('span', { class: 'pill' }, `${pe.length} pendente${pe.length === 1 ? '' : 's'}`)),
      pe.length ? el('ul', { class: 'rows' }, pe.map((d) => demandaLinha(c, d, false))) : el('div', { class: 'empty' }, 'Nada pendente por aqui.'));
    if (ok.length) {
      dem.append(el('button', { class: `fold${S.verConcluidas ? ' open' : ''}`, type: 'button', onclick: () => { S.verConcluidas = !S.verConcluidas; render(); } }, `Concluídas (${ok.length})`, ico('chevron')));
      if (S.verConcluidas) dem.append(el('ul', { class: 'rows', style: 'margin-top:10px' }, ok.map((d) => demandaLinha(c, d, false))));
    }
    return el('div', { class: 'two' },
      el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('layers'), el('h3', {}, 'Notas importantes'), c.notasAtualizadaEm ? el('span', { class: 'meta' }, `Atualizado ${fmtStamp(c.notasAtualizadaEm)}`) : null),
        c.notas ? el('div', { class: 'note-text' }, c.notas) : el('div', { class: 'empty' }, 'Ainda não há notas importantes para este cliente.')),
      dem);
  }

  function abaNotas(c) {
    const lista = [...c.notasSalvas].sort((a, b) => (b.criadaEm || '').localeCompare(a.criadaEm || ''));
    return el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('bookmark'), el('h3', {}, 'Notas salvas'), el('span', { class: 'meta' }, plural(lista.length, 'nota', 'notas'))),
      lista.length ? el('ul', { class: 'rows' }, lista.map((n) => el('li', { class: 'note' },
        el('div', { class: 'when' }, `Salva ${fmtStamp(n.criadaEm)}${n.atualizadaEm && n.atualizadaEm !== n.criadaEm ? ` · editada ${fmtStamp(n.atualizadaEm)}` : ''}`),
        el('div', { class: 'note-text' }, n.texto))))
        : el('div', { class: 'empty' }, 'Nenhuma nota salva. Na extensão, escreva nas Notas importantes e clique em Salvar nota.'));
  }

  function abaHistorico(c) {
    const lista = [...c.historico].sort((a, b) => (b.em || '').localeCompare(a.em || '')).slice(0, 200);
    return el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('clock'), el('h3', {}, 'Histórico'), el('span', { class: 'meta' }, plural(c.historico.length, 'registro', 'registros'))),
      lista.length ? el('ul', { class: 'timeline' }, lista.map((e) => el('li', { class: `tl t-${e.tipo}` },
        el('div', { class: 'tl-h' }, el('span', { class: 'pill' }, HISTORY_LABEL[e.tipo] || e.tipo), el('span', { class: 'meta' }, fmtStamp(e.em))),
        e.texto ? el('div', { class: 'tl-x' }, e.texto) : null)))
        : el('div', { class: 'empty' }, 'As alterações aparecem aqui, com data e hora.'));
  }

  function abaIA() {
    const bloco = (titulo, n) => el('section', { class: 'card' }, el('div', { class: 'card-h' }, ico('sparkle'), el('h3', {}, titulo)),
      el('div', { class: 'sk-lines' }, Array.from({ length: n }, (_, i) => el('div', { class: 'skeleton', style: `width:${[92, 78, 64, 84][i % 4]}%` }))));
    return el('div', { style: 'display:flex;flex-direction:column;gap:16px' },
      el('div', { class: 'privacy' }, ico('lock'), el('div', {}, el('strong', {}, 'Como vai funcionar. '),
        'A análise será feita por um serviço de IA, a partir das notas, das demandas e do histórico deste cliente. Antes de enviar, o nome e a empresa serão trocados por códigos (por exemplo, “Cliente 123”), e telefones, e-mails, senhas e links serão mascarados. A chave do serviço de IA ficará no servidor, nunca neste site.')),
      el('div', { class: 'ia-grid' }, bloco('Resumo da situação', 3), bloco('Compromissos pendentes', 3), bloco('Riscos e sinais de atenção', 3), bloco('Próximos passos sugeridos', 3)),
      el('div', {}, el('button', { class: 'btn', type: 'button', disabled: 'true' }, ico('sparkle'), 'Analisar este cliente'), el('span', { class: 'meta', style: 'margin-left:12px' }, 'Disponível na fase 3.')));
  }

  function telaCliente(c) {
    const pe = pendentes(c).length, at = atrasadas(c).length;
    const corpo = S.tab === 'notas' ? abaNotas(c) : S.tab === 'historico' ? abaHistorico(c) : S.tab === 'ia' ? abaIA() : abaGeral(c);
    return [
      el('div', { class: 'hero' },
        el('button', { class: 'link', type: 'button', style: 'color:var(--c-light);margin-bottom:10px;display:inline-flex;gap:6px;align-items:center', onclick: irParaCarteira }, ico('back'), 'Carteira'),
        el('div', { class: 'nome' }, c.nome),
        el('div', { class: 'sub' }, el('span', {}, c.empresa || 'Sem empresa'), el('span', { class: 'pill', title: 'Código do cliente' }, c.id), c.tipo === 'grupo' ? el('span', { class: 'pill' }, 'Grupo') : null,
          c.atualizadoEm ? el('span', {}, `Atualizado ${fmtStamp(c.atualizadoEm)}`) : null),
        el('div', { class: 'stats' }, el('span', { class: 'pill ok' }, 'ativo'), el('span', { class: 'pill' }, plural(pe, 'demanda pendente', 'demandas pendentes')), at ? el('span', { class: 'pill late' }, plural(at, 'atrasada', 'atrasadas')) : null,
          el('span', { class: 'pill' }, plural(c.notasSalvas.length, 'nota salva', 'notas salvas')))),
      abas(c), corpo];
  }

  function rodape() {
    const f = document.getElementById('foot');
    const direita = S.confirmarLimpar
      ? el('span', { class: 'confirm' }, 'Apagar todos os clientes deste navegador? (O backup da extensão não é afetado.)',
        el('button', { class: 'btn', type: 'button', onclick: limparLocal }, 'Sim, apagar'),
        el('button', { class: 'btn ghost', type: 'button', onclick: () => { S.confirmarLimpar = false; render(); } }, 'Cancelar'))
      : (persistidos.length && !S.demo ? el('button', { class: 'link', type: 'button', onclick: () => { S.confirmarLimpar = true; render(); } }, 'Apagar dados locais') : null);
    f.replaceChildren(...[
      el('span', {}, el('img', { src: 'assets/c.png', alt: '' }), `CONTEXTO · site v${VERSAO} · modo local: os dados ficam só neste navegador.`),
      direita].filter(Boolean));
  }

  // ---------------------------------------------------------------- desenho
  function render() {
    topo();
    const L = document.getElementById('layout');
    const c = clienteAtual();
    if (!S.clientes.length) {
      L.replaceChildren(el('div', { class: 'content', style: 'grid-column:1/-1;max-width:760px;margin:0 auto;width:100%' }, boasVindas()));
    } else {
      L.replaceChildren(lateral(), el('section', { class: 'content', 'aria-live': 'polite' }, ...(c ? telaCliente(c) : carteira())));
    }
    rodape();
    document.title = c ? `${c.nome} — CONTEXTO` : 'CONTEXTO — Clientes';
  }

  document.getElementById('arquivo').addEventListener('change', (e) => { if (e.target.files[0]) importar(e.target.files[0]); });
  render();
})();
