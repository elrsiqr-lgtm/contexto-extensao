/**
 * CONTEXTO — CAMADA DE ARMAZENAMENTO (única parte que sabe ONDE os dados ficam)
 * ---------------------------------------------------------------------------
 * Hoje: chrome.storage.local (fica só no seu navegador).
 *
 * COMO TROCAR POR UM BANCO ONLINE NO FUTURO
 * Reescreva APENAS este arquivo. Mantenha o mesmo "contrato" abaixo
 * (mesmos nomes de funções, todas assíncronas) e troque o miolo por chamadas
 * à sua API (fetch). O resto da extensão (model.js, ui.js, main.js) não muda.
 *
 * Contrato (NS.storage):
 *   getConversation(phone)        -> objeto da conversa ou null
 *   saveConversation(conv)        -> grava a conversa (conv.phone é a chave)
 *   getAliases()                  -> { "nome normalizado": "5511999999999" }
 *   setAlias(nameKey, phone)      -> lembra a associação nome -> número
 *   getUi() / setUi(partial)      -> preferências visuais (ex.: painel aberto)
 *   exportAll()                   -> objeto com TODOS os registros (backup)
 *   importAll(data)               -> { conversations, aliases } importados
 *   subscribe(cb)                 -> avisa quando outro lugar alterou os dados
 *
 * Dica para a versão online: saveConversation pode virar um PUT /conversations/:phone
 * e getConversation um GET; subscribe pode ser polling ou websocket (ou ficar vazio).
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});

  const CONV_PREFIX = 'c:';
  const KEY_ALIASES = 'aliases';
  const KEY_UI = 'ui';
  const area = chrome.storage.local;

  NS.storage = {
    async getConversation(phone) {
      const key = CONV_PREFIX + phone;
      const res = await area.get(key);
      return res[key] || null;
    },

    async saveConversation(conv) {
      await area.set({ [CONV_PREFIX + conv.phone]: conv });
    },

    async getAliases() {
      const res = await area.get(KEY_ALIASES);
      return res[KEY_ALIASES] || {};
    },

    async setAlias(nameKey, phone) {
      const aliases = await this.getAliases();
      aliases[nameKey] = phone;
      await area.set({ [KEY_ALIASES]: aliases });
    },

    async getUi() {
      const res = await area.get(KEY_UI);
      return res[KEY_UI] || {};
    },

    async setUi(partial) {
      const current = await this.getUi();
      await area.set({ [KEY_UI]: { ...current, ...partial } });
    },

    /** Backup: devolve TODOS os registros num único objeto simples. */
    async exportAll() {
      const all = await area.get(null);
      const conversations = {};
      for (const [k, v] of Object.entries(all)) {
        if (k.startsWith(CONV_PREFIX)) conversations[k.slice(CONV_PREFIX.length)] = v;
      }
      return {
        app: 'CONTEXTO',
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: all[KEY_ALIASES] || {},
        conversations,
      };
    },

    /**
     * Restaura um backup. Faz MESCLA: se a conversa já existe, vale a que foi
     * alterada por último. Nunca apaga o que já está guardado.
     */
    async importAll(data) {
      if (!data || data.app !== 'CONTEXTO' || typeof data.conversations !== 'object') {
        throw new Error('Arquivo inválido: não parece um backup do CONTEXTO.');
      }
      let imported = 0;
      const writes = {};
      for (const [phone, incoming] of Object.entries(data.conversations)) {
        if (!incoming || !incoming.phone) continue;
        const existing = await this.getConversation(phone);
        if (!existing || (incoming.updatedAt || '') > (existing.updatedAt || '')) {
          writes[CONV_PREFIX + phone] = incoming;
          imported++;
        }
      }
      const aliases = { ...(await this.getAliases()), ...(data.aliases || {}) };
      writes[KEY_ALIASES] = aliases;
      await area.set(writes);
      return { conversations: imported, aliases: Object.keys(data.aliases || {}).length };
    },

    /** Chama cb(listaDeChavesAlteradas) quando os dados mudam (ex.: outra aba). */
    subscribe(cb) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') cb(Object.keys(changes));
      });
    },

    convKey(phone) {
      return CONV_PREFIX + phone;
    },
  };
})();
