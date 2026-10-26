# ADR 0015 — Grupos como contexto próprio e convite por código

- **Status:** aceito (2026-10-26)
- **Contexto da decisão:** spec [034 — Grupos 1/5](../../specs/features/034-grupos-convite-de-membros/spec.md)

## Contexto

A spec 034 traz os **grupos**: um administrador cria o grupo, convida membros por um link e os gerencia. As specs 035 a 038 vão pôr no grupo configurações, publicações, quizzes compartilhados e atribuições. Até aqui, todo dado do Quizio era de um dono só (quizzes, partidas, relatórios); o grupo é o primeiro recurso **de várias contas**, e as telas dele mostram nome e e-mail de outros usuários, que só existem nas tabelas do Better Auth.

## Decisão

1. **Um contexto novo, `groups`** (`packages/core/src/groups`), com o agregado `Group` (nome, administrador, código do convite, "configuração pulada"). Outros contextos vão referenciar grupos por id (a atribuição a grupos, na spec 038, guarda o `groupId`).
2. **A pertença é uma tabela própria**, `group_member` (grupo, usuário, papel, entrada), com chave (grupo, usuário). **O administrador também é uma linha**, com o papel `admin`: "quem vê o grupo", contagens e listas saem da mesma regra. Remover e sair apagam a linha; não há histórico de pertença nesta etapa.
3. **O convite é um código aleatório guardado no grupo** (`invite_code`, único, 128 bits em base64url), um válido por vez. Redefinir grava um código novo, só essa coluna. **Aceitar é um `INSERT` condicionado ao código ainda ser o do grupo** (`INSERT … SELECT … WHERE invite_code = $code ON CONFLICT DO NOTHING`): um aceite simultâneo a uma redefinição não entra pelo link antigo, e dois aceites deixam uma linha só. O banco decide, sem ler e depois escrever.
4. **Nomes e e-mails vêm da conta por uma porta de leitura** do contexto (`GroupReads`), implementada no `packages/db` com junções na tabela `user` do Better Auth, como já faz a `AssignmentLandingQuery`. O core não conhece o Better Auth; o caso de uso decide quem pode ver o e-mail.
5. **Sem tempo real nesta etapa.** Toda leitura e escrita confere a pertença no servidor (`requireMembership`); quem não é membro recebe o mesmo "não encontrado" de um grupo inexistente.

## Consequências

- Excluir um grupo apaga membros e visitas em cascata; o que as specs seguintes ligarem ao grupo (publicações, compartilhamentos) também terá de decidir o que acontece na exclusão. Atribuições, que são relatórios, não devem ir junto (pergunta em aberto da spec 034, para a 038).
- As permissões da spec 035 (membros convidam, veem membros, compartilham, atribuem) entram como regras de domínio sobre o papel e as chaves do grupo, nas mesmas funções de checagem.
- Excluir uma conta no Better Auth (ainda não existe) apagaria as pertenças e os grupos que ela administra, por `ON DELETE CASCADE`.

## Alternativas consideradas

- **Convite como tabela própria** (vários links, com prazo e contagem de usos). Mais flexível, mas o Kahoot tem um link por grupo, sem prazo; um código no grupo basta e torna "redefinir" uma troca de coluna.
- **Administrador só em `group.admin_id`, fora de `group_member`.** Evita uma linha, mas toda regra de "é membro?" e toda contagem teria dois casos.
- **Copiar nome e e-mail para `group_member` na entrada.** Evita a junção com a conta, mas fica velho quando o usuário muda de nome.
