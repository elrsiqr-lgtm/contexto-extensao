# Banco de dados (Supabase) — planejamento

Ainda **não existe projeto no Supabase**. Esta pasta guardará as tabelas e as regras de acesso quando ele for criado (fase 1).

## O que será guardado

| Tabela | Campos principais |
|---|---|
| `clientes` | `id` (código opaco), `nome`, `empresa`, `chave` (identificador calculado, **não é o telefone**), `notas_importantes`, datas |
| `notas_salvas` | `cliente_id`, `texto`, datas |
| `demandas` | `cliente_id`, `texto`, `prazo`, `concluida`, datas |
| `historico` | `cliente_id`, `tipo`, `texto`, data |

O **número de telefone não é guardado**. Cada pessoa só vê os próprios dados (login do Supabase + regras de acesso por linha).

## ID do cliente

`chave` = HMAC-SHA256 do número (ou `g:nome` para grupos) com um **segredo da pessoa**, que não vai para o banco. Assim o mesmo número gera o mesmo ID em qualquer computador, sem guardar o número. Um hash comum do número **não** serve: há poucos números possíveis e seria fácil de reverter.

## Fases

1. **Banco, login e sincronização** (a extensão sincroniza; funciona sem internet e envia quando puder).
2. **Site lendo do banco** (troca só `site/js/data.js`).
3. **Análise por IA**, por função no servidor: nome e empresa trocados por códigos, telefones/e-mails/senhas/links mascarados, chave do serviço de IA só no servidor.

## Antes de começar

- Aprovação da empresa para guardar os dados na nuvem e usar IA com eles (conversar com o jurídico/responsável por dados).
- Criar o projeto no Supabase e informar o endereço e a chave **pública**. A chave `service_role` nunca vai para o repositório, a extensão ou o site.
