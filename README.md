<p align="center"><img src="assets/logo.png" alt="CONTEXTO" width="220"></p>

# CONTEXTO

> Moderna. Clara. Versátil.

Extensão do Chrome (computador) que adiciona um **painel de anotações ao lado das conversas do WhatsApp Web**. Feita para quem atende clientes pelo WhatsApp e precisa registrar o que foi combinado sem sair da conversa.

Funciona **somente** em `https://web.whatsapp.com`.

## O que ela faz

- **Painel fixo à direita**, que empurra a conversa para o lado (não cobre nada, não é pop-up).
- **Botão para abrir e fechar**: uma aba escura na borda direita da tela. O painel lembra se estava aberto ou fechado.
- **Acompanha a conversa aberta**: ao trocar de cliente, o painel troca sozinho. O topo mostra nome e número.
- **Notas importantes**: texto livre, salvo automaticamente enquanto você digita.
- **Demandas**: texto, prazo opcional e marcador de feita/pendente. O prazo se escolhe com atalhos (**Hoje**, **Amanhã**, **Em 7 dias**) ou em **Outra data** (campo de data visível). Clique no texto para editar e no prazo para alterá-lo; prazos vencidos ficam destacados.
- **Demandas concluídas** ficam **7 dias** e depois são apagadas automaticamente. As pendentes, as notas e o histórico **não** expiram.
- **Grupos**: grupo não tem número. Na tela de confirmação há a opção **Salvar como grupo**; o grupo passa a ser identificado pelo nome. O link **Trocar número ou grupo** (no topo do painel) desfaz a escolha.
- **Histórico**: cada criação ou alteração guarda data e hora, para ver a evolução. Tem o botão **Limpar** (com confirmação), que apaga só o histórico.
- **Ordem ao abrir**: as notas e as demandas pendentes aparecem primeiro; concluídas e histórico ficam recolhidos.
- **Backup**: botões **Exportar** e **Importar** no rodapé do painel (arquivo `.json`). A importação mescla com o que já existe e nunca apaga registros.

### Como o número do cliente é descoberto

Cada conversa é identificada pelo número de telefone.

1. Contato **não salvo**: o WhatsApp já mostra o número no cabeçalho, e ele é usado direto.
2. Contato **salvo** (aparece só o nome): se o painel "Dados do contato" do WhatsApp estiver aberto, a extensão tenta ler o número dele.
3. Se não conseguir, o painel **pede o número uma única vez** e passa a lembrar a associação nome → número.

Números com 10 ou 11 dígitos são tratados como brasileiros (prefixo 55 acrescentado).

## Privacidade e limites

- **Não lê o conteúdo das mensagens**, não envia mensagens e não automatiza nada no WhatsApp.
- Lê apenas o nome ou número exibido no cabeçalho da conversa aberta.
- Todos os dados ficam **somente no seu navegador** (`chrome.storage.local`). Nada é enviado para a internet.
- Permissões pedidas ao Chrome: `storage` e `unlimitedStorage`.

## Instalação (modo desenvolvedor)

1. Baixe este repositório (**Code → Download ZIP**) e extraia. Você precisa da pasta que contém o arquivo `manifest.json`.
2. No Chrome, abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta com o `manifest.json`.
5. Abra `https://web.whatsapp.com` (recarregue com F5 se já estava aberto).

Não apague nem mova a pasta depois de instalar: o Chrome carrega a extensão direto dela.

### Atualizar para uma versão nova

1. Baixe a versão nova e sobrescreva os arquivos da mesma pasta (ou rode `git pull`, se usar Git).
2. Em `chrome://extensions`, clique no ícone de **recarregar** do CONTEXTO.
3. Aperte F5 no WhatsApp Web.

Seus dados não são perdidos ao atualizar. Mesmo assim, é boa prática exportar um backup de vez em quando.

## Estrutura do código

```
manifest.json        Configuração da extensão (Manifest V3)
fonts/               Fonte Sora (embutida)
assets/              logo.png = logo do CONTEXTO (topo do painel e este README); c.png = o "C" do puxador (aba lateral); autor.png = marca do autor (rodapé do painel)
icons/               Ícones da extensão (o "C" em 16, 48 e 128 px)
src/
  storage.js         ÚNICO lugar que sabe onde os dados ficam
  detector.js        ÚNICO lugar que lê a página do WhatsApp
  model.js           Regras: notas, demandas (concluídas expiram em 7 dias), histórico, telefones e grupos
  ui.js              Painel (HTML/DOM)
  styles.js          Identidade visual (cores em variáveis --c-*)
  main.js            Liga detector + armazenamento + painel
```

### Trocar o armazenamento por um banco online

Reescreva apenas `src/storage.js`. O contrato (nomes das funções, todas assíncronas) está descrito no comentário no topo do arquivo. `model.js`, `ui.js` e `main.js` não precisam mudar.

### Quando o WhatsApp mudar o visual

Se o painel parar de reconhecer a conversa aberta, ajuste **apenas os seletores** no topo de `src/detector.js`, na seção `SELETORES`. Eles são tentados em ordem; vale o primeiro que encontrar o cabeçalho.

### Identidade visual

| Uso | Cor |
|---|---|
| Fundos de destaque e títulos | `#1B1535` |
| Botões e links | `#7B2FE0` |
| Lavanda média | `#9B7BEF` |
| Lavanda clara (cartões, etiquetas) | `#DCD0FA` |
| Fundo geral | `#FAF8FF` |
| Confirmação (feito / ativo) | `#5CC49A` |

Fonte: **Sora**. Ícones de traço fino, cartões arredondados e etiquetas em pílula.

## Formato do backup

```json
{
  "app": "CONTEXTO",
  "version": 1,
  "exportedAt": "2026-11-09T16:00:00.000Z",
  "aliases": { "maria silva": "5511988887777" },
  "conversations": {
    "5511988887777": {
      "phone": "5511988887777",
      "name": "Maria Silva",
      "summary": { "text": "...", "updatedAt": "..." },
      "demands": [{ "id": "...", "text": "...", "due": "2026-12-01", "done": false }],
      "history": [{ "id": "...", "at": "...", "type": "summary", "text": "..." }]
    }
  }
}
```

---

<p align="center"><img src="assets/autor.png" alt="Marca do autor" width="72"><br><sub>Marca do autor</sub></p>
