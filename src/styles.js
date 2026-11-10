/**
 * CONTEXTO — ESTILO (identidade visual do moodboard)
 * Cores em um só lugar (variáveis --c-*). Para ajustar a paleta, mexa só aqui.
 * O CSS roda dentro de um Shadow DOM: não afeta o WhatsApp e vice-versa.
 */
(() => {
  const NS = (window.CONTEXTO = window.CONTEXTO || {});

  NS.panelCss = `
:host {
  all: initial;
  --c-dark:   #1B1535;  /* roxo quase azul-marinho: destaques e títulos */
  --c-main:   #7B2FE0;  /* roxo vivo: botões e links */
  --c-mid:    #9B7BEF;  /* lavanda média */
  --c-light:  #DCD0FA;  /* lavanda clara: etiquetas e bordas */
  --c-bg:     #FAF8FF;  /* branco arroxeado: fundo geral */
  --c-mint:   #5CC49A;  /* verde-menta: SÓ confirmação (feito / ativo) */
  --c-mint-d: #1F7A57;
  --w: 360px;
  font-family: 'Sora', system-ui, sans-serif;
  color: var(--c-dark);
}
*, *::before, *::after { box-sizing: border-box; font-family: 'Sora', system-ui, sans-serif; }
button { cursor: pointer; border: 0; background: none; color: inherit; font-size: inherit; padding: 0; }
svg { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; display: block; }

/* ---------- aba para abrir/fechar ---------- */
/* O host fica acima de TUDO no WhatsApp, para o botão nunca ser coberto. */
:host { position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; }
.tab {
  position: fixed; top: 50%; right: 0; transform: translateY(-50%);
  padding: 8px 3px; border-radius: 16px 0 0 16px;
  background: linear-gradient(90deg, #FFFFFF 0%, #F4EFFF 100%);
  border: 1px solid #E3D9FA; border-right: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 1px 0 #fff, -4px 6px 18px rgba(27,21,53,.22);
  transition: transform .15s ease, right .2s ease, box-shadow .15s ease;
}
.tab:hover { transform: translateY(-50%) translateX(-2px); box-shadow: inset 0 1px 0 #fff, -6px 8px 22px rgba(123,47,224,.30); }
/* o logo é horizontal: giramos para caber na aba vertical (lê-se de cima para baixo) */
.tab-logo { position: relative; display: block; width: 34px; height: 64px; }
.tab-logo img { position: absolute; left: 50%; top: 50%; width: 64px; height: auto; transform: translate(-50%, -50%) rotate(90deg); pointer-events: none; user-select: none; }
.tab-logo.fallback { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 28px; height: auto; padding: 4px 0; color: var(--c-dark); }
.tab-logo.fallback svg { width: 16px; height: 16px; }
.tab .label { writing-mode: vertical-rl; font-size: 10.5px; font-weight: 700; letter-spacing: .18em; }
.tab-ico { display: none; color: var(--c-dark); padding: 4px 3px; }
.tab-ico svg { width: 16px; height: 16px; }
/* painel aberto: a aba fica na borda do painel, só com um ícone discreto */
:host(.open) .tab { right: var(--w); padding: 8px 4px; }
:host(.open) .tab-logo { display: none; }
:host(.open) .tab-ico { display: block; }

/* ---------- painel ---------- */
.panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: var(--w);
  background: var(--c-bg); border-left: 1px solid var(--c-light);
  display: none; flex-direction: column; z-index: 1;
}
:host(.open) .panel { display: flex; }
.scroll {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
  /* A barra de rolagem (6 px) fica SEMPRE reservada à direita; por isso o recuo da direita é 6 px menor,
     e as margens ficam iguais (14 px) dos dois lados, com ou sem barra. */
  scrollbar-gutter: stable;
  padding: 14px 8px 16px 14px;
  /* O conteúdo some suavemente nas bordas de cima e de baixo (em vez de ser cortado seco). */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 16px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 14px, #000 calc(100% - 16px), transparent 100%);
}
.scroll::-webkit-scrollbar { width: 6px; }
.scroll::-webkit-scrollbar-track { background: transparent; }
.scroll::-webkit-scrollbar-thumb { background: var(--c-light); border-radius: 6px; }

/* ---------- topo ---------- */
.hero {
  background: linear-gradient(155deg, #2D2257 0%, #1B1535 55%, #140E29 100%);
  color: #fff; border-radius: 24px; padding: 14px 18px 18px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.16),
    inset 0 -3px 0 rgba(0,0,0,.28),
    0 6px 12px rgba(27,21,53,.28),
    0 22px 38px -12px rgba(27,21,53,.60);
}
.brand { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700; letter-spacing: .18em; color: var(--c-light); }
.brand svg { width: 16px; height: 16px; color: var(--c-mid); }
.brand .grow { flex: 1; }
.icon-btn { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--c-light); }
.icon-btn:hover { background: rgba(255,255,255,.12); }
.icon-btn svg { width: 16px; height: 16px; }
.client { margin-top: 14px; font-size: 19px; font-weight: 600; line-height: 1.25; word-break: break-word; }
.phone { margin-top: 4px; font-size: 12.5px; color: var(--c-light); letter-spacing: .02em; }
.hero .pill { margin-top: 12px; }
.hero-empty { font-size: 13px; line-height: 1.6; color: var(--c-light); margin-top: 12px; }

/* ---------- cartões ---------- */
.card {
  background: linear-gradient(180deg, #FFFFFF 0%, #FBF9FF 100%);
  border: 1px solid #E9E1FB; border-bottom: 3px solid #DCD0FA;          /* espessura da "placa" */
  border-radius: 22px; padding: 16px;
  box-shadow:
    inset 0 1px 0 #fff,                                                  /* brilho no topo */
    0 2px 4px rgba(27,21,53,.05),
    0 12px 22px -8px rgba(123,47,224,.16),
    0 24px 40px -18px rgba(27,21,53,.22);
  transition: transform .18s ease, box-shadow .18s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow:
    inset 0 1px 0 #fff,
    0 4px 8px rgba(27,21,53,.07),
    0 18px 30px -8px rgba(123,47,224,.24),
    0 32px 52px -18px rgba(27,21,53,.30);
}
.card-h { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.card-h svg { width: 18px; height: 18px; color: var(--c-main); }
.card-h h3 { margin: 0; font-size: 13px; font-weight: 600; flex: 1; }
.meta { font-size: 10.5px; color: var(--c-mid); }
.pill { display: inline-flex; align-items: center; gap: 6px; background: var(--c-light); color: var(--c-dark); border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
.pill.ok { background: rgba(92,196,154,.2); color: var(--c-mint-d); }
.pill.ok::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--c-mint); }
.hero .pill.ok { background: rgba(92,196,154,.18); color: #A8EBCF; }
.pill.late { background: var(--c-main); color: #fff; }

textarea, input[type=text], input[type=tel], input[type=date] {
  width: 100%; background: var(--c-bg); border: 1px solid var(--c-light); border-radius: 16px;
  padding: 10px 12px; font-size: 13px; line-height: 1.5; color: var(--c-dark); outline: none; resize: vertical;
}
textarea { min-height: 96px; }
textarea, input[type=text], input[type=tel], input[type=date] { box-shadow: inset 0 2px 5px rgba(27,21,53,.07); }
textarea:focus, input:focus { border-color: var(--c-main); box-shadow: inset 0 2px 5px rgba(27,21,53,.05), 0 0 0 3px rgba(123,47,224,.14); }
::placeholder { color: var(--c-mid); }

.btn {
  background: linear-gradient(180deg, #8D47EE 0%, #7B2FE0 100%); color: #fff; border-radius: 999px; padding: 8px 16px;
  font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.14), 0 8px 14px -5px rgba(123,47,224,.55);
  transition: transform .12s ease, box-shadow .12s ease, filter .15s;
}
.btn:active { transform: translateY(1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(0,0,0,.14), 0 3px 6px -3px rgba(123,47,224,.5); }
.btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.btn.ghost { background: linear-gradient(180deg, #E6DCFB 0%, #DCD0FA 100%); color: var(--c-dark); box-shadow: inset 0 1px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(27,21,53,.08), 0 6px 10px -5px rgba(27,21,53,.25); }
.btn svg { width: 15px; height: 15px; }
.link { color: var(--c-main); font-size: 12px; font-weight: 600; }
.link:hover { text-decoration: underline; }

/* ---------- demandas ---------- */
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; gap: 10px; align-items: flex-start; padding: 10px 10px 10px 8px; border-radius: 16px; background: linear-gradient(180deg, #FFFFFF 0%, var(--c-bg) 100%); border: 1px solid #EFE9FC; box-shadow: inset 0 1px 0 #fff, 0 4px 8px -4px rgba(27,21,53,.14); }
.check { flex: none; width: 22px; height: 22px; margin-top: 1px; border-radius: 50%; border: 1.5px solid var(--c-mid); color: transparent; display: flex; align-items: center; justify-content: center; }
.check svg { width: 13px; height: 13px; stroke-width: 2.2; }
.check:hover { border-color: var(--c-mint); }
.done .check { background: var(--c-mint); border-color: var(--c-mint); color: #fff; }
.body { flex: 1; min-width: 0; }
.txt { font-size: 13px; line-height: 1.45; word-break: break-word; cursor: text; }
.done .txt { color: var(--c-mid); text-decoration: line-through; }
.sub { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.due { cursor: pointer; }
.due svg { width: 12px; height: 12px; }
.due:focus-visible { outline: 2px solid var(--c-main); outline-offset: 2px; }
.due-editor { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
input.due-edit { width: auto; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
.stamp { font-size: 10px; color: var(--c-mid); }
.x { width: 22px; height: 22px; border-radius: 50%; color: var(--c-mid); opacity: 0; display: flex; align-items: center; justify-content: center; }
.item:hover .x { opacity: 1; }
.x:hover { background: var(--c-light); color: var(--c-dark); }
.x svg { width: 13px; height: 13px; }
.edit-input { padding: 6px 10px; border-radius: 12px; }
.empty { font-size: 12px; color: var(--c-mid); padding: 4px 2px 8px; }

.addbox { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 5px; background: var(--c-light); color: var(--c-dark); border-radius: 999px; padding: 6px 12px; font-size: 11.5px; font-weight: 600; }
.chip svg { width: 12px; height: 12px; }
.chip { box-shadow: inset 0 1px 0 rgba(255,255,255,.65), inset 0 -2px 0 rgba(27,21,53,.07), 0 3px 6px -3px rgba(27,21,53,.25); transition: transform .12s ease; }
.chip:hover { filter: brightness(.97); transform: translateY(-1px); }
.chip:active { transform: translateY(1px); }
.chip.on { background: linear-gradient(180deg, #8D47EE 0%, #7B2FE0 100%); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.14), 0 6px 10px -4px rgba(123,47,224,.5); }
.date-row input { padding: 8px 12px; }
.btn.full { width: 100%; justify-content: center; padding: 11px 16px; }
.confirm { background: var(--c-bg); border: 1px dashed var(--c-mid); border-radius: 16px; padding: 12px 14px; margin-bottom: 12px; }
.confirm p { margin: 0 0 10px; font-size: 12px; line-height: 1.5; }
.confirm .row { display: flex; gap: 8px; }

.fold { display: flex; align-items: center; gap: 6px; width: 100%; margin-top: 12px; font-size: 12px; font-weight: 600; color: var(--c-main); }
.fold svg { width: 14px; height: 14px; transition: transform .15s; }
.fold.open svg { transform: rotate(180deg); }
.fold + .list { margin-top: 8px; }

/* ---------- histórico ---------- */
.timeline { list-style: none; margin: 0; padding: 0 0 0 14px; border-left: 1.5px solid var(--c-light); display: flex; flex-direction: column; gap: 12px; }
.tl { position: relative; }
.tl::before { content: ''; position: absolute; left: -19.5px; top: 4px; width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 1.5px solid var(--c-mid); }
.tl.t-demand_done::before { background: var(--c-mint); border-color: var(--c-mint); }
.tl-h { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tl-t { font-size: 10.5px; color: var(--c-mid); }
.tl-x { margin-top: 4px; font-size: 12px; line-height: 1.45; color: var(--c-dark); white-space: pre-wrap; word-break: break-word; max-height: 4.4em; overflow: hidden; }

/* ---------- carregando ---------- */
.skeleton { border-radius: 12px; background: linear-gradient(90deg, var(--c-light) 25%, #EFE9FC 50%, var(--c-light) 75%); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* ---------- pedir número ---------- */
.prompt p { margin: 0 0 12px; font-size: 12.5px; line-height: 1.6; }
.prompt .row { display: flex; gap: 8px; }
.err { margin-top: 8px; font-size: 11.5px; color: var(--c-main); font-weight: 600; }

/* ---------- grupo / trocar identificação ---------- */
.or { text-align: center; font-size: 11px; color: var(--c-mid); margin: 14px 0 10px; }
.hero-link { display: block; margin-top: 12px; font-size: 11px; color: var(--c-light); text-decoration: underline; opacity: .85; }
.hero-link:hover { opacity: 1; }

/* ---------- sugestão de número (ficha do contato) ---------- */
.suggest { background: var(--c-bg); border: 1px dashed var(--c-mid); border-radius: 16px; padding: 12px 14px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.suggest-t { font-size: 11.5px; color: var(--c-mid); }
.suggest-n { font-size: 16px; font-weight: 600; }
.suggest-o { font-size: 11px; color: var(--c-mid); }

/* ---------- bloqueado até confirmar o número ---------- */
.prompt.need { border: 1.5px solid var(--c-main); box-shadow: 0 6px 24px rgba(123,47,224,.16); }
.prompt.need .card-h svg { color: var(--c-main); }
.card.locked { opacity: .55; background: var(--c-bg); box-shadow: none; border: 1px dashed var(--c-light); transform: none; pointer-events: none; user-select: none; }
.card.locked .card-h { margin-bottom: 8px; }
.card.locked .card-h svg { color: var(--c-mid); }
.lock-ic svg { width: 15px !important; height: 15px !important; color: var(--c-mid); }
.ghost-line { font-size: 11.5px; color: var(--c-mid); }

/* quem prefere menos movimento: sem elevação nem transições */
@media (prefers-reduced-motion: reduce) {
  .card, .btn, .chip, .tab { transition: none; }
  .card:hover, .btn:hover, .chip:hover { transform: none; }
}

/* ---------- rodapé (backup) ---------- */
.foot { position: relative; flex: none; display: flex; align-items: center; gap: 14px; padding: 10px 18px 14px; border-top: 1px solid #EFE9FC; background: var(--c-bg); }
.foot .link { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
.foot svg { width: 14px; height: 14px; }
.foot .grow { flex: 1; }
.logo { height: 24px; width: auto; max-width: 60px; object-fit: contain; user-select: none; -webkit-user-drag: none; margin-right: -4px; }
.ver { font-size: 10.5px; color: var(--c-mid); border-radius: 999px; padding: 2px 6px; }
.ver:hover { background: var(--c-light); color: var(--c-dark); }
.toast { position: absolute; left: 14px; right: 14px; bottom: calc(100% + 8px); background: var(--c-dark); color: #fff; font-size: 11.5px; line-height: 1.4; font-weight: 600; padding: 9px 14px; border-radius: 14px; box-shadow: 0 6px 24px rgba(27,21,53,.25); }
.toast:empty { display: none; }
`;
})();
