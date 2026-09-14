# Roadmap

Ordem de entrega baseada na proposta de MVP da [referência do Kahoot](product/kahoot-reference.md) §13. Cada linha vira uma pasta em `features/` quando for especificada com `/sdd-spec`. A ordem pode mudar; registre o motivo aqui.

**Status:** ⬜ a especificar · 📝 spec em andamento · 📐 planejada · 🚧 em implementação · ✅ entregue

| # | Feature | Contextos | Conteúdo resumido | Status | Spec |
| --- | --- | --- | --- | --- | --- |
| 000 | Fundamentos | todos | Arquitetura hexagonal, testes, infra local, adapters R2/Pusher, design system, fluxo SDD | ✅ | [docs/](../docs/architecture.md) |
| 001 | Autenticação e biblioteca básica | quiz, library, media | Cadastro/login por e-mail e Google (cadastro desligável); criar e editar dados do quiz (título, descrição, capa, visibilidade); Recentes, Rascunhos, pesquisa, duplicar; lixeira com restaurar e excluir definitivamente | 📐 | [spec](features/001-autenticacao-e-biblioteca-basica/spec.md) · [plano](features/001-autenticacao-e-biblioteca-basica/plan.md) |
| 002 | Editor: Quiz e Verdadeiro ou falso | quiz, media | Lista de perguntas (adicionar, duplicar, reordenar, excluir); 2–6 alternativas; seleção simples/múltipla; tempo; pontos; imagem; validação; publicação com snapshot | ⬜ | — |
| 003 | Partida ao vivo — modo clássico | game | PIN, lobby com QR/link, entrada por apelido, ciclo da pergunta, pontuação oficial, sequência exibida, placar, pódio, travar/remover | ⬜ | — |
| 004 | Robustez da partida e opções de jogo | game | Reconexão, entrada tardia, encerrar antes, randomização, perguntas no dispositivo, gerador/filtro de apelidos, autoplay, música | ⬜ | — |
| 005 | Relatórios | reports | Resumo, participantes, perguntas, perguntas difíceis, precisa de ajuda, exportação | ⬜ | — |
| 006 | Mais tipos: Resposta curta, Puzzle, Controle deslizante | quiz, game | Normalização de texto, tudo ou nada, margens e precisão | ⬜ | — |
| 007 | Coletar opiniões | quiz, game | Enquete, Escala, NPS, Nuvem de palavras, Pergunta aberta | ⬜ | — |
| 008 | Slides e modo Palestra | quiz, game | 6 layouts, ritmo manual, placar oculto, reações | ⬜ | — |
| 009 | Atribuir e Jogar solo | game, reports | Atribuição com prazo; solo com oponentes virtuais | ⬜ | — |
| 010 | Modo equipe | game | Times, Team Talk, pontuação por média | ⬜ | — |
| 011 | Produtividade do criador | quiz, library | Importar planilha, banco de perguntas, favoritos, pastas | ⬜ | — |
| 012 | Extras | vários | Pin answer, Drop pin, Brainstorm, Flashcards, Aprender, compartilhamento, Discover, IA, Accuracy/Confidence, jogar novamente | ⬜ | — |

## Pendências técnicas fora de features

- **Verificação de e-mail e recuperação de senha**: exige um provedor de envio de e-mails, atrás de uma porta. Mitiga o risco aceito no [ADR 0007](../docs/adr/0007-autenticacao-better-auth-google.md) (tomada de conta pré-criada via vínculo com Google). Especificar como feature antes de abrir o Quizio ao público.
- **Deploy na Vercel**: configurar o preset de deploy do TanStack Start, variáveis de ambiente, bucket R2 (CORS + acesso público) e app Pusher.
- **CI**: pipeline com `pnpm check`, `pnpm test`, typecheck e, com *services* (Postgres, RustFS, Soketi), `pnpm test:int` e `pnpm test:e2e`.
- **Migrations**: hoje o schema é aplicado com `db:push`; antes do primeiro deploy, adotar `db:generate` + `db:migrate`.
