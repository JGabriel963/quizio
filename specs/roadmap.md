# Roadmap

Ordem de entrega baseada na proposta de MVP da [referência do Kahoot](product/kahoot-reference.md) §13. Cada linha vira uma pasta em `features/` quando for especificada com `/sdd-spec`. A ordem pode mudar; registre o motivo aqui.

**Status:** ⬜ a especificar · 📝 spec em andamento · 📐 planejada · 🚧 em implementação · ✅ entregue

| # | Feature | Contextos | Conteúdo resumido | Status | Spec |
| --- | --- | --- | --- | --- | --- |
| 000 | Fundamentos | todos | Arquitetura hexagonal, testes, infra local, adapters R2/Pusher, design system, fluxo SDD | ✅ | [docs/](../docs/architecture.md) |
| 001 | Autenticação e biblioteca básica | quiz, library, media | Cadastro/login por e-mail e Google (cadastro desligável); criar e editar dados do quiz (título, descrição, capa, visibilidade); Recentes, Rascunhos, pesquisa, duplicar; lixeira com restaurar e excluir definitivamente | ✅ | [spec](features/001-autenticacao-e-biblioteca-basica/spec.md) · [plano](features/001-autenticacao-e-biblioteca-basica/plan.md) · [tarefas](features/001-autenticacao-e-biblioteca-basica/tasks.md) |
| 002 | Página inicial | library, quiz | Painel do criador em `/`, navegação principal na barra lateral com os pontos de entrada do que virá, seções de cada área em abas (Biblioteca), barra superior com pesquisa na própria biblioteca e ação Criar, cartão "Seus quizzes" e "Relatórios mais recentes" como "Em breve" | ✅ | [spec](features/002-pagina-inicial/spec.md) · [plano](features/002-pagina-inicial/plan.md) · [tarefas](features/002-pagina-inicial/tasks.md) |
| 003 | Editor 1/5 — Fundação e lista de perguntas | quiz, library | Tela do editor em `/creator/:id` (lista, pergunta, painel de propriedades); Criar abre o editor com uma pergunta Quiz em branco; título no cabeçalho e Configurações; adicionar, selecionar, duplicar, reordenar e excluir perguntas (nunca a última); texto da pergunta; salvamento automático | ✅ | [spec](features/003-editor-fundacao-e-lista-de-perguntas/spec.md) · [plano](features/003-editor-fundacao-e-lista-de-perguntas/plan.md) · [tarefas](features/003-editor-fundacao-e-lista-de-perguntas/tasks.md) |
| 004 | Editor 2/5 — Pergunta Quiz completa | quiz | 2–6 alternativas, marcar corretas, seleção simples/múltipla, tempo limite, pontos, aplicar tempo a todas, avisos de pergunta incompleta | ⬜ | — |
| 005 | Editor 3/5 — Verdadeiro ou falso e troca de tipo | quiz | Seletor de tipo ao adicionar, pergunta V/F com alternativas fixas, trocar o tipo de uma pergunta sem perder o que foi digitado na sessão | ⬜ | — |
| 006 | Editor 4/5 — Salvar a versão jogável | quiz, library | Botão Salvar valida o quiz inteiro e congela uma versão (snapshot); rascunho × publicado; alterações ainda não salvas | ⬜ | — |
| 007 | Editor 5/5 — Mídia nas perguntas | quiz, media | Imagem na pergunta (upload e arrastar) e imagem nas alternativas do Quiz | ⬜ | — |
| 008 | Partida ao vivo — modo clássico | game | PIN, lobby com QR/link, entrada por apelido, ciclo da pergunta, pontuação oficial, sequência exibida, placar, pódio, travar/remover | ⬜ | — |
| 009 | Robustez da partida e opções de jogo | game | Reconexão, entrada tardia, encerrar antes, randomização, perguntas no dispositivo, gerador/filtro de apelidos, autoplay, música | ⬜ | — |
| 010 | Relatórios | reports | Resumo, participantes, perguntas, perguntas difíceis, precisa de ajuda, exportação | ⬜ | — |
| 011 | Mais tipos: Resposta curta, Puzzle, Controle deslizante | quiz, game | Normalização de texto, tudo ou nada, margens e precisão | ⬜ | — |
| 012 | Coletar opiniões | quiz, game | Enquete, Escala, NPS, Nuvem de palavras, Pergunta aberta | ⬜ | — |
| 013 | Slides e modo Palestra | quiz, game | 6 layouts, ritmo manual, placar oculto, reações | ⬜ | — |
| 014 | Atribuir e Jogar solo | game, reports | Atribuição com prazo; solo com oponentes virtuais | ⬜ | — |
| 015 | Modo equipe | game | Times, Team Talk, pontuação por média | ⬜ | — |
| 016 | Produtividade do criador | quiz, library | Importar planilha, banco de perguntas, favoritos, pastas | ⬜ | — |
| 017 | Extras | vários | Pin answer, Drop pin, Brainstorm, Flashcards, Aprender, compartilhamento, Discover, IA, Accuracy/Confidence, jogar novamente, temas e pré-visualização no editor | ⬜ | — |

## Mudanças de ordem

- **2026-09-25 — a página inicial entrou como 002** e as features seguintes subiram um número (o editor passou de 002 para 003, e assim por diante até Extras, de 012 para 013). Motivo: a 001 deixou a área do criador sem casa e sem navegação, e cada feature seguinte teria que inventar a sua. Espelhar a home do Kahoot agora dá um lugar fixo para tudo o que vem depois. As specs já escritas foram atualizadas para os novos números.
- **2026-09-25 — o editor virou cinco specs (003 a 007)** e as features seguintes subiram quatro números (partida 004 → 008, e assim por diante até Extras, 013 → 017). Motivo: o editor concentra estrutura de dados, autosave, dois tipos de pergunta, publicação e mídia; numa spec só, a entrega ficaria grande demais para revisar. Cada etapa é uma entrega usável sozinha e constrói sobre a anterior. As specs 001 e 002 foram atualizadas para os novos números.

## Pendências técnicas fora de features

- **Verificação de e-mail e recuperação de senha**: exige um provedor de envio de e-mails, atrás de uma porta. Mitiga o risco aceito no [ADR 0007](../docs/adr/0007-autenticacao-better-auth-google.md) (tomada de conta pré-criada via vínculo com Google). Especificar como feature antes de abrir o Quizio ao público.
- **Deploy na Vercel**: configurar o preset de deploy do TanStack Start, variáveis de ambiente, bucket R2 (CORS + acesso público) e app Pusher. Checklist herdado da feature 001:
  - **Google OAuth**: criar um cliente OAuth "Web application" no Google Cloud Console com a redirect URI `{BETTER_AUTH_URL}/api/auth/callback/google`, definir `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` e fazer o smoke manual dos CA-07/08/09 da spec 001.
  - **IP do limite de tentativas**: o Better Auth lê `x-forwarded-for`, que um cliente pode enviar. Na Vercel, configurar `advanced.ipAddress.ipAddressHeaders` para priorizar `x-vercel-forwarded-for`/`x-real-ip`, que a plataforma controla, com teste cobrindo a prioridade.
  - **Cadastro**: decidir o valor de `AUTH_SIGN_UP_ENABLED` para a instância pública.
- **CI**: pipeline com `pnpm check`, `pnpm test`, typecheck e, com *services* (Postgres, RustFS, Soketi), `pnpm test:int` e `pnpm test:e2e`.
- **Migrations**: hoje o schema é aplicado com `db:push`; antes do primeiro deploy, adotar `db:generate` + `db:migrate`.
