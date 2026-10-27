# ADR 0018 — Quizzes compartilhados no grupo

- **Status:** aceito (2026-10-26)
- **Contexto da decisão:** spec [037 — Compartilhado](../../specs/features/037-compartilhado-no-grupo/spec.md)

## Contexto

Na spec 037, um membro põe um quiz seu no grupo, e os outros membros o abrem, jogam ao vivo, atribuem e duplicam. Até aqui, só o dono usa um quiz: `hostGame`, `createAssignment` e `duplicateQuiz` comparam o dono do quiz com quem pede, e os relatórios só oferecem "Jogar novamente" ao dono.

A spec fixa três regras:
- o grupo vê sempre a **última versão salva** pelo dono;
- o quiz some do grupo com a lixeira, a exclusão e a saída do dono;
- a partida de um membro não encerra a do dono.

Os contextos não se importam (ADR 0001): `game`, `quiz` e `reports` não podem perguntar ao `groups` quem é membro de onde.

## Decisão

1. **O compartilhamento é uma referência.** Cada quiz compartilhado é uma linha de `group_shared_quiz` (grupo, quiz, quem compartilhou, quando), única por grupo e quiz. Nada é copiado.
   - O grupo lê o título, a capa e as perguntas da **versão publicada em vigor**, como a partida lê o quiz ao começar (ADR 0008).
   - Um quiz na lixeira é filtrado na leitura, e por isso volta ao ser restaurado.
2. **O banco tira o quiz do grupo.** A linha tem chaves estrangeiras com `on delete cascade` para três tabelas:
   - `quiz`, quando o dono o exclui para sempre;
   - `group_member`, pelo par (grupo, quem compartilhou), quando o dono sai ou é removido; só se compartilha quiz próprio, então quem compartilhou é o dono;
   - `group`, quando o grupo é excluído.

   Nenhum caso de uso precisa lembrar de limpar, e não há janela entre duas escritas.
3. **A permissão é uma porta do núcleo compartilhado, `QuizShareGrants.canUse(userId, quizId)`.** Ela responde sim quando o quiz está compartilhado num grupo de que a pessoa é membro.
   - É a única coisa que `game` (Organizar ao vivo, Atribuir), `quiz` (Duplicar) e `reports` (Jogar novamente) sabem de grupos.
   - Como o `ReportReadGrants` do ADR 0016, nenhum deles sabe por que a resposta é sim.
   - O adapter é uma consulta de existência sobre `group_shared_quiz` e `group_member`.
4. **Uma partida ao vivo aberta por quiz e anfitrião.** O índice `game_unended_quiz_idx` passa a `(quiz_id, owner_id)`, e o `hostGame` encerra só as partidas do mesmo anfitrião. Isso atualiza a regra "um quiz, uma partida aberta" do ADR 0009 (spec 008, RN-07). Excluir o quiz para sempre continua encerrando as partidas de todos.
5. **A publicação aponta para a linha do compartilhamento, não para o quiz** (`group_post.shared_quiz_id`, sem chave estrangeira).
   - "Remover do grupo" apaga a linha, e a publicação perde o anexo na leitura, como a atribuição que acabou (ADR 0016).
   - Compartilhar o mesmo quiz de novo cria outra linha, e a publicação antiga continua sem anexo.
   - Vários quizzes de uma vez são uma publicação `quizzesShare` sem apontador.
6. **Duplicar copia a versão publicada**, nunca a cópia de trabalho do dono, com a capa e as imagens copiadas para chaves do novo dono (spec 007, RN-33).

## Consequências

- O que o dono salva chega ao grupo sem nenhuma escrita a mais. O que ele não salvou nunca aparece.
- A página do quiz compartilhado mostra as respostas certas a todo membro. É intencional: o grupo é fechado e o dono escolheu compartilhar. A regra da partida, de que a resposta certa nunca sai do servidor antes dos resultados, vale para os dispositivos dos jogadores, e não muda.
- Partidas, atribuições, relatórios e cópias feitos por um membro são dele. Quando o quiz sai do grupo, eles continuam, mas "Jogar novamente" deixa de valer, porque `canUse` passa a dizer não.
- A migração refaz um índice parcial. Localmente, `db:push` não o refaz, e é preciso aplicar à mão; em produção, a migração gerada cuida disso. O índice novo é mais permissivo, então o código anterior continua funcionando durante o deploy.
- Compartilhar com usuários fora de grupos (roadmap 019) pode reaproveitar `QuizShareGrants`, com outra origem para o sim.
