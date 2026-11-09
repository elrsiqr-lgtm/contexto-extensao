# CONTEXTO — painel de anotações para o WhatsApp Web

## Instalar (modo desenvolvedor)
1. Abra o Chrome e digite `chrome://extensions` na barra de endereço.
2. Ative a chave **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `contexto` (a que contém o arquivo `manifest.json`).
5. Abra `https://web.whatsapp.com` e, se já estava aberto, recarregue com F5.

## Estrutura do código
| Arquivo | Função |
|---|---|
| `src/storage.js` | **Único** lugar que sabe onde os dados ficam (hoje `chrome.storage.local`). Para usar banco online, reescreva só este arquivo. |
| `src/detector.js` | **Único** lugar que lê a página do WhatsApp (cabeçalho da conversa). Se o WhatsApp mudar o visual, ajuste os seletores no topo dele. |
| `src/model.js` | Regras: demandas, resumo, histórico, formatação de telefone. |
| `src/ui.js`, `src/styles.js` | Painel e identidade visual (cores em variáveis `--c-*`). |
| `src/main.js` | Liga tudo. |

## Privacidade
A extensão não lê mensagens, não envia nada e não clica em nada no WhatsApp. Lê só o nome/número no cabeçalho da conversa aberta. Os dados ficam no seu navegador; use **Exportar** no rodapé do painel para fazer backup.
