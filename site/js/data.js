/**
 * CONTEXTO (site) — CAMADA DE DADOS
 * ---------------------------------------------------------------------------
 * ÚNICA parte do site que sabe DE ONDE vêm os dados.
 * Hoje (modo local): os dados vêm do backup que a extensão exporta e ficam guardados só neste navegador
 * (localStorage). Mais tarde, esta camada será trocada por chamadas ao Supabase, sem mexer nas telas.
 *
 * Contrato (CTXSITE.data):
 *   load()              -> lista de clientes guardada
 *   save(lista)         -> guarda a lista
 *   clear()             -> apaga os dados locais
 *   fromBackup(json)    -> converte o backup da extensão em lista de clientes (async)
 *   merge(atual, novos) -> junta listas pelo ID (vale o mais recente)
 *   demo()              -> clientes de exemplo (inventados)
 *
 * Cliente = { id, nome, empresa, pessoa, tipo, notas, notasAtualizadaEm, notasSalvas[], demandas[], historico[], atualizadoEm }
 *
 * PRIVACIDADE: o número de telefone NUNCA é guardado nem exibido. Ele só serve, na importação, para calcular o ID
 * do cliente (um código gerado com uma chave secreta deste navegador); depois é descartado.
 */
(() => {
  const NS = (window.CTXSITE = window.CTXSITE || {});
  const KEY = 'ctx_site_v1';
  const KEY_SECRET = 'ctx_site_chave';

  const isPhoneLike = (t) => /^\+?[\d\s\-().]+$/.test(String(t || '').trim()) && String(t).replace(/\D/g, '').length >= 8;

  /** "MAPEI - ADRIANA" -> empresa "MAPEI", pessoa "ADRIANA". Grupos "HOFF <> TIGRE" -> empresa "HOFF". */
  function splitName(nome) {
    const n = String(nome || '').trim();
    for (const sep of [' - ', ' <> ']) {
      const i = n.indexOf(sep);
      if (i > 0) return { empresa: n.slice(0, i).trim(), pessoa: n.slice(i + sep.length).trim() };
    }
    return { empresa: '', pessoa: n };
  }

  // ---- ID do cliente: HMAC-SHA256 do número (ou "g:nome") com uma chave secreta guardada só neste navegador.
  // Um hash comum do número seria fácil de reverter (há poucos números possíveis); com a chave secreta, não é.
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); }
  function secretKeyB64() {
    let k = null;
    try { k = localStorage.getItem(KEY_SECRET); } catch (_) {}
    if (!k) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      k = btoa(String.fromCharCode(...bytes));
      try { localStorage.setItem(KEY_SECRET, k); } catch (_) {}
    }
    return k;
  }
  async function clientId(texto) {
    const key = await crypto.subtle.importKey('raw', b64ToBytes(secretKeyB64()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(texto))));
    return 'C-' + Array.from(sig.slice(0, 4)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  async function fromBackup(data) {
    if (!data || data.app !== 'CONTEXTO' || typeof data.conversations !== 'object') {
      throw new Error('Arquivo inválido: não parece um backup do CONTEXTO.');
    }
    const out = [];
    for (const [chave, conv] of Object.entries(data.conversations)) {
      if (!conv) continue;
      const bruto = String(conv.name || '').trim();
      const semNome = !bruto || isPhoneLike(bruto);                  // contato não salvo: o "nome" é o número -> não usamos
      const nome = semNome ? 'Contato sem nome' : bruto;
      const { empresa, pessoa } = semNome ? { empresa: '', pessoa: '' } : splitName(nome);
      out.push({
        id: await clientId(chave),
        nome, empresa, pessoa,
        tipo: String(chave).startsWith('g:') ? 'grupo' : 'contato',
        notas: (conv.summary && conv.summary.text) || '',
        notasAtualizadaEm: (conv.summary && conv.summary.updatedAt) || null,
        notasSalvas: (conv.savedNotes || []).map((n) => ({ id: n.id, texto: n.text, criadaEm: n.createdAt, atualizadaEm: n.updatedAt })),
        demandas: (conv.demands || []).map((d) => ({ id: d.id, texto: d.text, prazo: d.due || null, concluida: !!d.done, criadaEm: d.createdAt, concluidaEm: d.doneAt || null })),
        historico: (conv.history || []).map((e) => ({ id: e.id, em: e.at, tipo: e.type, texto: e.text || '' })),
        atualizadoEm: conv.updatedAt || null,
      });
    }
    return out;
  }

  function merge(atual, novos) {
    const mapa = new Map((atual || []).map((c) => [c.id, c]));
    for (const c of novos) {
      const antigo = mapa.get(c.id);
      if (!antigo || (c.atualizadoEm || '') >= (antigo.atualizadoEm || '')) mapa.set(c.id, c);
    }
    return [...mapa.values()];
  }

  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return (j && Array.isArray(j.clientes)) ? j.clientes : []; } catch (_) { return []; }
  }
  function save(lista) { try { localStorage.setItem(KEY, JSON.stringify({ versao: 1, clientes: lista })); return true; } catch (_) { return false; } }
  function clear() { try { localStorage.removeItem(KEY); } catch (_) {} }

  // ---- dados de exemplo (todos inventados) ----
  function demo() {
    const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toLocaleDateString('sv-SE'); };
    const t = (n, h = 10) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(h, 15, 0, 0); return x.toISOString(); };
    const dem = (id, texto, prazo, concluida = false, ato = 0) => ({ id, texto, prazo, concluida, criadaEm: t(ato - 3), concluidaEm: concluida ? t(ato) : null });
    const ev = (id, n, tipo, texto) => ({ id, em: t(n), tipo, texto });
    return [
      { id: 'C-A1B2C3D4', nome: 'ALFA - Marina', empresa: 'ALFA', pessoa: 'Marina', tipo: 'contato', notas: 'Quer renovar o contrato em dezembro. Pediu proposta com 3 usuários a mais.', notasAtualizadaEm: t(-1),
        notasSalvas: [{ id: 'n1', texto: 'Reunião de alinhamento: combinado enviar proposta até sexta e agendar treinamento do time.', criadaEm: t(-4), atualizadaEm: t(-4) }, { id: 'n2', texto: 'Cliente elogiou o suporte e perguntou sobre integração com o ERP.', criadaEm: t(-9), atualizadaEm: t(-9) }],
        demandas: [dem('d1', 'Enviar proposta de renovação', d(2)), dem('d2', 'Agendar treinamento do time', d(-1)), dem('d3', 'Liberar acesso extra para 3 usuários', null, true, -2)],
        historico: [ev('h1', -1, 'summary', 'Quer renovar o contrato em dezembro…'), ev('h2', -2, 'demand_done', 'Liberar acesso extra para 3 usuários'), ev('h3', -4, 'note_saved', 'Reunião de alinhamento: combinado enviar proposta…'), ev('h4', -5, 'demand_added', 'Enviar proposta de renovação')], atualizadoEm: t(-1) },
      { id: 'C-5E6F7A8B', nome: 'BETA - Carlos', empresa: 'BETA', pessoa: 'Carlos', tipo: 'contato', notas: 'Em implantação. Dificuldade com a importação de planilhas; aguardando o arquivo corrigido.', notasAtualizadaEm: t(0),
        notasSalvas: [{ id: 'n3', texto: 'Erro na importação: colunas de data fora do padrão. Orientado a usar o modelo.', criadaEm: t(-2), atualizadaEm: t(-2) }],
        demandas: [dem('d4', 'Cobrar o arquivo corrigido', d(0)), dem('d5', 'Revisar o modelo de planilha', d(5))],
        historico: [ev('h5', 0, 'summary', 'Em implantação. Dificuldade com a importação…'), ev('h6', -2, 'note_saved', 'Erro na importação: colunas de data fora do padrão…')], atualizadoEm: t(0) },
      { id: 'C-9C0D1E2F', nome: 'GAMA - Julia', empresa: 'GAMA', pessoa: 'Julia', tipo: 'contato', notas: 'Cliente estável. Próximo contato só no fim do mês.', notasAtualizadaEm: t(-12),
        notasSalvas: [], demandas: [dem('d6', 'Enviar relatório mensal', d(14))], historico: [ev('h7', -12, 'summary', 'Cliente estável…')], atualizadoEm: t(-12) },
      { id: 'C-3A4B5C6D', nome: 'DELTA <> Suporte', empresa: 'DELTA', pessoa: 'Suporte', tipo: 'grupo', notas: 'Grupo de suporte da DELTA. Chamados abertos por e-mail e repassados aqui.', notasAtualizadaEm: t(-3),
        notasSalvas: [{ id: 'n4', texto: 'Combinado: respostas em até 4 horas úteis.', criadaEm: t(-3), atualizadaEm: t(-3) }],
        demandas: [dem('d7', 'Responder o chamado 1042', d(-3)), dem('d8', 'Atualizar o status do chamado 1038', null, true, -1)],
        historico: [ev('h8', -3, 'note_saved', 'Combinado: respostas em até 4 horas úteis.'), ev('h9', -1, 'demand_done', 'Atualizar o status do chamado 1038')], atualizadoEm: t(-1) },
      { id: 'C-7E8F9A0B', nome: 'Contato sem nome', empresa: '', pessoa: '', tipo: 'contato', notas: '', notasAtualizadaEm: null, notasSalvas: [], demandas: [], historico: [], atualizadoEm: t(-20) },
    ];
  }

  NS.data = { load, save, clear, fromBackup, merge, demo, splitName, isPhoneLike };
})();
