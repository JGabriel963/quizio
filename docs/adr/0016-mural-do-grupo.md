# ADR 0016 — Mural do grupo e atribuições como publicação

- **Status:** aceito (2026-10-26)
- **Contexto da decisão:** spec [038 — Atribuições no grupo](../../specs/features/038-atribuicoes-no-grupo/spec.md)

## Contexto

A spec 038 põe atribuições (spec 029, ADR 0014) dentro dos grupos (ADR 0015). No Kahoot, atribuir no grupo **é uma publicação** no mural: com uma mensagem opcional, curtidas e o cartão da atividade. Quando a atribuição é encerrada, a publicação fica, mas perde o anexo ("compartilhou um arquivo", "excluiu o anexo da publicação"). A atribuição continua sendo uma atribuição comum: relatório de quem a criou, link, PIN, jogo com apelido. Ela também pode ser criada fora do grupo e mandada para vários grupos depois.

## Decisão

1. **O mural é do contexto `groups`**: a publicação (`group_post`) tem o autor, o tipo (`assignment` agora; `text` com a spec 036), a mensagem e o **id da atribuição**; as curtidas são linhas de `group_post_like`. Excluir o grupo apaga publicações e curtidas em cascata.
2. **A publicação aponta para a atribuição sem chave estrangeira.** O `game` pode ser apagado (exclusão do relatório, spec 015) e a publicação continua.
3. **O anexo é lido, não guardado.** Cada leitura do mural e da aba Atribuições busca as atribuições pelos ids, por uma porta de leitura do `groups` sobre `game`, `report`, `quiz` e `user`; uma atribuição acabada (`ended_at` ou prazo vencido no relógio do servidor) ou ausente torna o anexo nulo. Encerrar, vencer ou apagar nunca precisa escrever no grupo.
4. **O `groups` cria a atribuição pelo `game`** por uma porta própria (`GroupAssignments`), ligada no `container.ts` ao `createAssignment` da spec 029, como o `quiz` já chega às partidas por `QuizGames`. Os dois contextos não se importam.
5. **Uma atribuição está no máximo uma vez em cada grupo**: índice único parcial `(group_id, game_id)`.
6. **O administrador do grupo lê o relatório de uma atribuição publicada ali**, mesmo sem ser o dono, **somente para leitura**: o `reports` pergunta a uma porta própria (`ReportReadGrants`), cujo adapter consulta `group_post` e `group_member`. Escritas e a lista de relatórios continuam só do dono.

## Consequências

- "Atribuir no grupo" faz duas escritas sem transação (a atribuição, depois a publicação). Se a segunda falhar, sobra uma atribuição comum nos relatórios de quem atribuiu; a validação vem antes da primeira.
- O mural custa uma consulta a mais (as atribuições das publicações), em lote.
- A spec 036 reaproveita a tabela e as curtidas para as publicações de texto; a 037 pode usar o mesmo padrão para quizzes compartilhados.

## Alternativas consideradas

- **Guardar o estado do anexo na publicação** e atualizá-lo quando a atribuição acaba: exigiria que o `game` escrevesse no `groups` ao encerrar, ao vencer (sem timer, ADR 0009) e ao apagar o relatório.
- **Uma coluna `group_id` no `game`**: uma atribuição só poderia estar num grupo, e o `game` passaria a conhecer grupos.
- **Chave estrangeira com `ON DELETE SET NULL`**: resolve o relatório apagado, mas não o encerramento nem o prazo, que continuariam precisando da leitura.
