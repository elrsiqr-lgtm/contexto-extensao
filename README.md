<p align="center"><img src="extensao/assets/logo.png" alt="CONTEXTO" width="220"></p>

# CONTEXTO

> Moderna. Clara. Versátil.

Notas, demandas e histórico de cada cliente, ao lado das conversas do WhatsApp Web, e um site para ver e analisar tudo.

| Pasta | O que é | Situação |
|---|---|---|
| [`extensao/`](extensao/) | Extensão do Chrome: o painel ao lado da conversa no WhatsApp Web | Pronta (v1.3.2) |
| [`site/`](site/) | Site com a tela de cada cliente: notas salvas, demandas, histórico e (em breve) análise por IA | Estrutura pronta, em modo local |
| [`banco/`](banco/) | Plano do banco de dados (Supabase) e do ID dos clientes | Planejamento |

## Como cada parte se encaixa

```
WhatsApp Web ──> extensao/ ──(Exportar)──> backup .json ──(Importar)──> site/
                     │                                                    ▲
                     └──────────── (fase 1) Supabase: login + sincronização ┘
```

- **Hoje:** a extensão guarda tudo só no navegador. O site lê o backup que a extensão exporta.
- **Próximas fases:** o Supabase passa a guardar os dados (cada cliente com um ID, nome e empresa; **sem o número de telefone**), a extensão sincroniza sozinha e o site lê direto do banco. Depois, a análise por IA. Veja [`banco/README.md`](banco/README.md).

## Instalar a extensão (modo desenvolvedor)

1. No Chrome, abra `chrome://extensions` e ative **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e escolha a pasta **`extensao`** (a que tem o `manifest.json`).
3. Abra `https://web.whatsapp.com`.

Detalhes e atualização: [`extensao/README.md`](extensao/README.md).

## Abrir o site

Abra o arquivo `site/index.html` no Chrome (dois cliques). Não precisa instalar nada. Veja [`site/README.md`](site/README.md).

## Identidade visual

Sora, roxo `#7B2FE0` com fundos `#1B1535` e `#FAF8FF`, lavanda `#DCD0FA` e `#9B7BEF`, verde-menta `#5CC49A` **só** para confirmação. Cartões com cantos arredondados e relevo suave. A extensão e o site usam a mesma identidade.
