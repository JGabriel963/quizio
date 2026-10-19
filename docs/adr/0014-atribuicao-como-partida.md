# ADR 0014 — Atribuição como partida no modo `assignment`

- **Status:** aceito (2026-10-19)
- **Contexto da decisão:** spec [029 — Atribuir quiz](../../specs/features/029-atribuir-quiz/spec.md)

## Contexto

A spec 029 traz a **atribuição**: um quiz que cada participante joga no próprio ritmo, sem anfitrião, até um prazo. Nesta etapa ela é criada, compartilhada, acompanhada em Relatórios, tem o prazo alterado e é encerrada; na spec 030 (029-2/2), os participantes entram, respondem e pontuam.

Quase tudo isso já existe na partida ao vivo ([ADR 0009](0009-partida-ao-vivo.md)): dono, quiz e versão jogável, título do momento, PIN único entre as abertas, opções, um prazo guardado (`expires_at`) que encerra a partida sem nenhum timer, encerramento com motivo, perguntas copiadas (`game_question`), jogadores anônimos (`game_player`), respostas com acerto e pontos (`game_answer`). E os relatórios já são uma leitura dessas tabelas ([ADR 0010](0010-relatorios-como-leitura-da-partida.md)).

## Decisão

1. **Uma atribuição é uma linha de `game` com `mode = 'assignment'`.** A partida ao vivo é `mode = 'live'` (o padrão das linhas existentes).
2. O **prazo é `expires_at`**: a mesma regra "quem lê depois do prazo vê acabada" das 8 horas do ao vivo. Alterar o prazo grava só essa coluna, com a condição de a partida não ter acabado.
3. A atribuição nasce **"em jogo" sem fase** (`status = 'playing'`, sem `question_index`/`phase`) e com as **perguntas copiadas na criação**: ela começou, para os relatórios e para a exclusão do quiz, e nenhuma fase do ao vivo pode avançar nela.
4. A regra "uma partida aberta por quiz" vale **só para o modo ao vivo**: o índice único parcial passa a filtrar o modo.
5. Todo caso de uso da partida ao vivo **recusa uma atribuição como inexistente**, e os da atribuição recusam uma partida ao vivo.
6. O PIN da atribuição tem **8 dígitos**: o mesmo índice de PIN serve aos dois modos sem colisão, e a entrada por PIN distingue o modo pelo tamanho.

## Consequências

- A spec 030 (029-2/2) reaproveita jogadores, respostas, pontuação e relatórios; o que for próprio dela (andamento por participante, timer desligado) entra como colunas ou tabelas novas ligadas à mesma partida.
- Os relatórios passam a ter partidas abertas (atribuições) na lista, com ordem e lixeira próprias.
- O modo é mais um campo que cada caso de uso da partida precisa respeitar; um teste por caso de uso garante a recusa.

## Alternativas consideradas

- **Agregado e tabelas próprios (`assignment`, `assignment_player`, `assignment_answer`).** Separa os dois fluxos, mas duplica jogadores, respostas, pontuação, avatar e a leitura dos relatórios, que teriam de juntar duas fontes.
- **Um agregado próprio que referencia uma partida.** Dois registros para uma coisa só, com o risco de ficarem em desacordo (prazo num, encerramento no outro).

## Andamento por participante (aceito em 2026-10-19, spec 030)

Na partida ao vivo, onde o jogo está é da partida (`GameProgress`). Na atribuição, cada participante está numa pergunta e numa tela diferentes. Decisão: o andamento vai para a linha do jogador (`game_player`: tela, pergunta, instante em que a pergunta foi mostrada, e a ordem das alternativas sorteada para ele), nulo na partida ao vivo. O prazo de cada pergunta é esse instante mais o tempo limite, conferido por quem lê ou escreve, sem timers (ADR 0009); o aparelho avança dizendo de que tela parte, e a gravação é condicional. Alternativa considerada: uma tabela `assignment_progress` por participante, que duplicaria a chave do jogador sem ganho.
