# CONTEXTO — conector para o Claude (versão de teste)

Deixa o **Claude** consultar os seus clientes (notas, demandas e histórico) para gerar relatórios. Você conversa com o Claude e ele busca os dados sozinho.

> ## ⚠️ Versão de teste: SOMENTE DADOS DE EXEMPLO
> Esta versão usa 6 clientes **inventados**. O endereço do conector é **público** e **não tem login**.
> **Não coloque dados reais aqui.** Para dados reais, a próxima fase acrescenta login e leitura do Supabase.

## O que o Claude consegue fazer (tudo SÓ LEITURA)

| Ferramenta | Para quê |
|---|---|
| `listar_clientes` | Lista os clientes, com pendentes e atrasadas. Filtra por nome, empresa ou código |
| `ler_cliente` | Lê um cliente: notas importantes, demandas, notas salvas e histórico |
| `resumo_carteira` | Visão geral: totais, atrasadas, próximos prazos e clientes parados |

**Não existe nenhuma ferramenta que crie, altere ou apague.** O Claude só lê.

## Privacidade embutida

- **Por padrão, o cliente aparece só pelo código** (`Cliente C-A1B2C3D4`), sem nome nem empresa. O Claude só mostra os nomes se você pedir (ou se ele pedir `mostrar_nomes`).
- **Telefones, e-mails, links, CPF/CNPJ e senhas saem mascarados** nos textos (`[telefone]`, `[e-mail]`, `[link]`, `[documento]`, `senha: [oculto]`). Nomes de pessoas escritos dentro das notas **não** são removidos.
- O Claude recebe a instrução de tratar o texto das notas como **dado, nunca como ordem**.

## Colocar no ar (Opção A, recomendada): Cloudflare Workers, grátis, sem instalar nada

O Claude no navegador precisa de um endereço na internet. A Cloudflare hospeda isso de graça.

1. Crie uma conta gratuita em **cloudflare.com** (sem cartão).
2. No painel, vá em **Workers & Pages** → **Create** → **Create Worker**. Deixe o exemplo "Hello World", dê o nome `contexto-conector` e clique em **Deploy**.
3. Clique em **Edit code**. **Apague tudo** que estiver no editor e **cole o conteúdo inteiro do arquivo `worker.mjs`**. Clique em **Deploy**.
4. Copie o endereço do Worker (algo como `https://contexto-conector.SEU-USUARIO.workers.dev`).
5. **Confira:** abra esse endereço no navegador. Deve aparecer *"CONTEXTO · conector para o Claude · … · FUNCIONANDO"* e, logo abaixo, o endereço que você vai colar no Claude (termina em `/mcp`).

> Os nomes dos botões da Cloudflare podem mudar um pouco com o tempo; a ideia é: criar um Worker, colar o código e publicar.

## Ligar ao Claude (no navegador)

1. Em **claude.ai**, abra **Configurações** → **Conectores** (*Connectors*) → **Adicionar conector personalizado** (*Add custom connector*).
2. **Nome:** `CONTEXTO`. **Endereço:** `https://contexto-conector.SEU-USUARIO.workers.dev/mcp` (com o `/mcp` no fim). Confirme.
3. Abra uma conversa nova, ative o conector **CONTEXTO** no menu de ferramentas/conectores da conversa e peça.

> Se a opção de conector personalizado **não aparecer**, a sua conta ou a sua organização pode não ter esse recurso liberado. Confira nas configurações do plano.

## Exemplos de pedidos

- *"Use o CONTEXTO e me dê um panorama da carteira: quem está atrasado e quem está parado?"*
- *"Leia o cliente C-1F2E3D4C e escreva um relatório com: situação, compromissos pendentes e atrasados, riscos e próximos passos."*
- *"Quais clientes têm risco de cancelamento? Justifique com base nas notas."*
- *"Prepare a pauta da reunião com o cliente EPSILON."* (o Claude busca pelo nome; o resultado continua anônimo)
- *"Compare os clientes ALFA e BETA: qual precisa mais de atenção esta semana?"*
- *"Agora mostre os nomes"*, se você quiser ver quem é quem.

Os 6 clientes de exemplo têm situações diferentes de propósito: renovação (`C-A1B2C3D4`), implantação travada (`C-5E6F7A8B`), cliente parado (`C-9C0D1E2F`), grupo de suporte com chamados atrasados (`C-3A4B5C6D`), **risco de cancelamento** (`C-1F2E3D4C`) e um contato vazio (`C-7E8F9A0B`).

## Opção B: rodar no seu computador (precisa do Node 18+ e de um túnel)

```bash
node local.mjs
```

Sobe em `http://localhost:8787`. Para o Claude no navegador alcançar, é preciso um endereço público temporário, por exemplo com o `cloudflared` (túnel rápido, sem conta):

```bash
cloudflared tunnel --url http://localhost:8787
```

Use o endereço `https://….trycloudflare.com/mcp` no Claude. **Esse endereço muda cada vez que você reinicia o túnel.**

## Como remover

No Claude: **Configurações → Conectores →** remover o CONTEXTO. Na Cloudflare: apagar o Worker.

## O que foi testado, e o que não foi

- **Testado:** com o **cliente oficial do protocolo MCP** (SDK) falando com este servidor: conexão, lista de ferramentas, as três ferramentas, erros, máscara de dados (incluindo falsos positivos, como datas e números de chamado) e o protocolo bruto.
- **Não testado:** a implantação na Cloudflare e a ligação com o claude.ai de verdade, porque isso exige a sua conta e o seu navegador. Se algo não funcionar, **copie a mensagem de erro exata** e me mande.

## Como é por dentro

`worker.mjs`, um arquivo só, sem bibliotecas:

1. **Dados:** `obterClientes()` devolve os exemplos. É o **único** ponto a trocar para ler do Supabase.
2. **Privacidade:** `mascarar()` e a identificação por código.
3. **Ferramentas:** o que o Claude pode pedir (todas só leitura).
4. **Protocolo:** MCP "Streamable HTTP" (`POST /mcp`).

## Próximos passos

- Login (para poder usar dados reais) e leitura do Supabase.
- O botão **"Copiar pedido para o Claude"** no site (aba Análise IA), que monta o pedido com o código do cliente.
