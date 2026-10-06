# ADR 0010 — Relatórios como leitura da partida

- **Status:** aceito (2026-10-06)
- **Contexto da decisão:** spec [015 — Relatórios](../../specs/features/015-relatorios/spec.md)

## Contexto

A spec 015 pede um relatório para cada partida ao vivo que foi iniciada e já acabou: resumo, participantes, perguntas, e o detalhe de cada um. Tudo o que ele mostra já está gravado pelo jogo ([ADR 0009](0009-partida-ao-vivo.md)): as perguntas como foram jogadas (`game_question`), os jogadores (`game_player`) e uma linha por resposta, com acerto, pontos e tempo (`game_answer`). O jogo já segue a regra de não guardar o que pode ser derivado: totais, sequências e colocações são refeitos das respostas a cada leitura.

Havia dois caminhos: **gerar** o relatório quando a partida acaba, gravando os números numa estrutura própria, ou **ler** a partida sempre que o relatório é aberto.

Além disso, o relatório tem de sobreviver ao quiz excluído de vez, e hoje a partida é apagada junto com o quiz por uma chave estrangeira em cascata.

## Decisão

1. **O relatório não é gravado.** Ele é uma leitura das tabelas do jogo, com as contas feitas por funções puras do contexto `reports` a cada pedido.
2. **`reports` é um contexto de leitura sobre o jogo.** Ele define a sua porta de consulta (`ReportGameQuery`) e os seus registros de leitura, como a `library` faz com os quizzes. Reaproveita tipos de valor do jogo, nunca funções.
3. **O que é só do relatório fica numa tabela pequena, `report`**: o nome próprio e a lixeira, com uma linha apenas para o relatório que foi renomeado ou excluído. Sem linha, o relatório tem o título da partida e está fora da lixeira.
4. **`game.quiz_id` deixa de ser chave estrangeira.** O ID continua guardado, como referência entre contextos. Ao excluir um quiz de vez, o código apaga as partidas dele que nunca começaram e mantém as iniciadas.
5. **Excluir um relatório definitivamente apaga a partida**, com jogadores, perguntas e respostas.

## Consequências

- Não existe "momento de gerar": uma partida que acabou por qualquer caminho (pódio, encerrada pelo anfitrião, prazo de 8 horas) é um relatório sem que nada precise rodar, e uma mudança numa regra de conta vale para todos os relatórios, antigos e novos.
- Cada abertura de relatório refaz as contas sobre as respostas da partida (no máximo 200 jogadores por partida). É aceitável para uma tela aberta de vez em quando; se deixar de ser, o lugar de um cache é atrás da porta de consulta.
- Duas regras pequenas do jogo são repetidas em `reports` (até que pergunta a partida chegou e o desempate da classificação). Um teste as mantém iguais às do jogo.
- A integridade entre partida e quiz passa a ser do código, e não do banco: uma partida pode apontar para um quiz que não existe mais, e quem lê trata isso como "o quiz foi excluído".
- As imagens das perguntas continuam sendo do quiz ([ADR 0003](0003-storage-r2.md), spec 007): o relatório de um quiz excluído fica sem elas.

## Alternativas consideradas

- **Gravar o relatório ao fim da partida.** Leitura mais barata, mas duplica dados que já existem, exige um passo que pode falhar ou não rodar (a partida que vence o prazo não tem ninguém para dispará-lo), e congela as contas na regra do dia.
- **Colunas do relatório na tabela `game`.** Uma tabela a menos, mas dois contextos escrevendo na mesma linha, e a partida passaria a carregar nome e lixeira que não são dela.
- **Manter a chave estrangeira com `set null`.** Preserva a integridade no banco, mas torna `quizId` opcional em todo o contexto do jogo, que precisa dele enquanto a partida está aberta.
