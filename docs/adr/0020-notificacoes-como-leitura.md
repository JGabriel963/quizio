# ADR 0020 — Notificações como leitura

- **Status:** aceito (2026-10-27)
- **Contexto da decisão:** spec [040 — Notificações](../../specs/features/040-notificacoes/spec.md)

## Contexto

A spec 040 põe um sino na barra superior com as novidades dos grupos:
- publicações, quizzes compartilhados e atividades dos outros membros;
- entradas no grupo, para o administrador;
- remoção e exclusão do grupo, para o membro.

Uma notificação some quando a publicação é excluída, quando a pessoa deixa o grupo ou quando quem agiu exclui a conta. Ela também tem os estados lida e não lida, e o ponto vermelho de "novidade desde a última vez que abri".

O jeito comum é gravar uma linha por destinatário a cada acontecimento (fan-out). Aqui isso teria três custos:
- escrever N linhas a cada publicação;
- lembrar de apagá-las em cada caminho que remove a origem;
- manter a cópia em acordo com o grupo.

O Quizio já faz o contrário nos relatórios (ADR 0010): o que pode ser calculado a partir das linhas existentes não é guardado.

O app roda sem servidor (Vercel), e o tempo real é o Pusher (ADR 0002), com canais públicos e eventos que são só dicas.

## Decisão

1. **A notificação é uma leitura.** As de publicações e de entradas saem de `group_post` e `group_member`, numa consulta por pessoa: publicações dos outros nos seus grupos depois da sua entrada, e entradas nos grupos que administra. A cascata do banco faz o resto: publicação, grupo, participação ou conta apagados levam a notificação junto.
2. **Só se guarda o que não deixa rastro.** Remoção e exclusão do grupo viram `group_notice`, com o nome do grupo copiado e sem chave para ele.
3. **Lido e visto são marcas por pessoa.** `notification_inbox` guarda `seen_at` (o ponto vermelho) e `read_all_at` (marcar todas). `notification_read` guarda uma linha por notificação aberta, pelo id estável derivado da origem (`post:`, `join:`, `notice:`).
4. **Cada pessoa tem um canal de caixa de entrada.** O nome do canal é um HMAC do id da conta com o segredo do Pusher, e ele recebe o evento `inbox-changed`, sem dados. O id da conta aparece no endereço do perfil (spec 039), mas o nome do canal não se deduz dele, então não é preciso um endpoint de autorização de canal privado. A tela também reconsulta a cada 60 s e ao voltar o foco.
5. `notifications` é um contexto do core. Ele lê os grupos por uma porta de consulta e reaproveita os tipos de valor. Os grupos avisam por uma porta própria, `GroupInbox`, ligada no container.

## Consequências

- Nenhum caminho de exclusão precisa saber de notificações. Uma origem nova (por exemplo, o fim de uma atribuição) entra como mais uma parte da consulta.
- A consulta cresce com os grupos da pessoa. Ela usa os índices existentes e um `limit`. Se ficar pesada, materializa-se a leitura num ADR novo, sem mudar a tela.
- O sinal em tempo real é melhor esforço: quem perde o evento vê a novidade em até um minuto.
- Na entrega, quem já tem conta começa com tudo marcado como lido, para o histórico dos grupos não chegar de uma vez como "Novo".
