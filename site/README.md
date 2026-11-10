# CONTEXTO — site

Tela de cada cliente com **Visão geral** (notas importantes e demandas), **Notas salvas**, **Histórico** e **Análise IA** (estrutura pronta; entra na fase 3), mais uma **Carteira** com o resumo de tudo que está pendente ou atrasado.

## Como abrir

Abra `index.html` no Chrome (dois cliques). Não precisa instalar nem compilar nada.

## Como trazer seus clientes (modo local)

1. Na extensão, no rodapé do painel, clique em **Exportar** (gera um arquivo `contexto-backup-….json`).
2. No site, clique em **Importar backup** e escolha o arquivo.
3. Importar de novo o mesmo arquivo **não duplica** os clientes (o ID é estável).

Os dados ficam **só neste navegador** (localStorage). Dá para testar sem dados reais com **Dados de exemplo** (nada é salvo). **Apagar dados locais** (rodapé) limpa tudo; o backup da extensão não é afetado.

## Privacidade

- O **número de telefone nunca é guardado nem mostrado**. Ele só é usado, durante a importação, para calcular o **ID** do cliente (`C-XXXXXXXX`): um código gerado com uma chave secreta que fica só neste navegador. Contatos não salvos (cujo "nome" é o número) aparecem como *Contato sem nome*.
- O texto dos clientes é sempre exibido como **texto**, nunca como HTML.
- Atenção: **o conteúdo das notas pode ter dados sensíveis** (números, senhas, links) que a própria pessoa digitou. O site mostra o que está lá. A análise por IA (fase 3) vai mascarar isso antes de enviar.

## Empresa

A empresa é tirada do nome do contato: `MAPEI - ADRIANA` → empresa **MAPEI**; `HOFF <> TIGRE` → **HOFF**. Se o nome não seguir o padrão, a empresa fica em branco.

## Organização do código

```
index.html          página única
css/site.css        visual (mesma paleta e cartões 3D da extensão)
js/data.js          ÚNICO lugar que sabe de onde vêm os dados (hoje: backup + localStorage; depois: Supabase)
js/app.js           telas e interação
assets/             logo, "C" e a fonte Sora
```

Para ligar ao Supabase, troque só `js/data.js` (mesmas funções, vindas do banco); as telas não mudam.

## Ao publicar na internet

Servir o site com os cabeçalhos de segurança do provedor (por exemplo, `Content-Security-Policy`), e **nunca** colocar a chave secreta (`service_role`) do Supabase no código do site: só a chave pública.
