# ADR 0009 — Partida ao vivo: estado no banco, jogador anônimo por segredo e eventos como aviso

- **Status:** aceito
- **Data:** 2026-10-01

## Contexto

A partida ao vivo (specs 008 a 011) junta duas telas que precisam andar juntas: a do anfitrião, projetada, e a de cada jogador, no celular. As restrições já estavam decididas:

- O deploy é na Vercel: sem WebSocket próprio, sem processo vivo e sem memória entre requisições ([ADR 0002](0002-realtime-pusher-protocol.md)).
- O servidor é a autoridade do jogo: clientes mandam intenções e nunca publicam eventos (constituição, artigo V).
- Jogadores não têm conta e jogam no celular, com conexão instável (constituição, artigo VIII).

O ADR 0002 deixou em aberto três pontos, que a primeira etapa (lobby, spec 008) já precisa fechar: como um jogador sem conta prova quem é, que canais existem e o que acontece quando um evento se perde. Um quarto ponto, como a partida avança sem timer no servidor, só é exercitado na spec 009, mas a forma dos dados depende dele.

## Decisão

### 1. A partida é uma linha no banco, e o tempo é derivado

Toda a partida fica no Postgres: tabela `game` (quiz, versão, título, PIN, estado, cadeado, instantes) e `game_player`. Nenhuma requisição depende de memória de outra.

Nada "acontece" sozinho no servidor. Todo prazo é um instante guardado, comparado com o relógio a cada acesso:

- **Validade da partida:** `expiresAt = createdAt + 8 h`. Uma partida vencida é tratada como encerrada por qualquer caso de uso que a carregue, que aproveita para gravar o encerramento. Não há job de limpeza.
- **Prazo da pergunta (spec 009):** `answersOpenedAt + limite`. A tela do anfitrião pede a transição ("tempo esgotado", "avançar"); o servidor confere, pelo relógio dele, se ela é permitida, e a aplica uma única vez. Uma resposta só vale se chegar antes do prazo, com uma tolerância de latência definida na spec.

### 2. O jogador anônimo é um `playerId` público e um segredo

Ao entrar, o servidor cria o jogador e devolve `playerId` e `secret` (um UUID aleatório). O navegador os guarda no `localStorage`, pela chave do PIN (que é o que o link de entrada traz), e os envia em toda chamada de jogador. Como um PIN pode ser sorteado de novo para outra partida, uma sessão guardada só vale depois de conferida com o servidor. O servidor compara o segredo com o guardado.

- O `playerId` é público: aparece na lista do anfitrião e nos eventos.
- O segredo nunca sai em evento nem em resposta a outra pessoa.
- Recarregar a página ou reabrir o link retoma o mesmo jogador (spec 008, RN-44). Na spec 012, a reconexão durante o jogo usa o mesmo par.
- Jogadores não usam o Better Auth: não há conta, sessão nem cookie.

### 3. Um canal público por partida

O canal é `game-{gameId}`, sem autorização: o `gameId` é um UUID, e o que passa por ele já está na tela projetada (apelidos, cadeado, encerramento).

- O anfitrião e os jogadores assinam o mesmo canal.
- Eventos carregam IDs e dados mínimos (limite de cerca de 10 KB do Pusher).
- **Nada individual vai por evento.** O que é de um jogador só (o resultado da resposta dele, a posição dele) é buscado por uma chamada autenticada pelo segredo, disparada por um evento de aviso. Canais privados continuam fora, e o endpoint de autorização do Pusher não é necessário.

### 4. Evento é aviso; a consulta é a verdade

Um evento perdido não pode deixar uma tela errada. Por isso:

- Cada tela tem uma **consulta** que devolve o estado inteiro dela (`game.lobby` para o anfitrião, `game.join.session` para o jogador).
- O evento serve para atualizar a tela na hora. Ele é aplicado ao cache da consulta, ou só a invalida.
- A consulta é refeita ao reconectar, ao voltar o foco da aba e a cada 15 segundos. Se o serviço de tempo real cair, a partida continua, com atraso.
- Os casos de uso gravam primeiro e publicam depois. Uma falha ao publicar não desfaz a gravação.

### 5. Concorrência resolvida por restrições do banco

- **PIN único entre partidas abertas:** índice único parcial em `pin` para linhas não encerradas. A criação sorteia, tenta gravar e, em conflito, sorteia de novo.
- **Apelido único na partida:** índice único em `(game_id, nickname_key)`. O jogador removido mantém a linha, o que também bloqueia o apelido dele (spec 008, RN-30).
- **Limite de jogadores:** conferido por contagem antes de inserir. Duas entradas simultâneas podem passar do limite por um ou dois jogadores, o que é aceitável para um limite técnico.

## Consequências

- Qualquer tela pode ser recarregada a qualquer momento e volta ao estado certo.
- Cada ação é uma requisição HTTP e uma escrita no banco. Serve para centenas de jogadores por partida (ADR 0002).
- A consulta periódica custa uma leitura a cada 15 segundos por tela aberta. Para 200 jogadores, são cerca de 13 leituras por segundo, todas por chave primária.
- O segredo fica no `localStorage`: quem tem acesso ao navegador do jogador joga como ele. O dano é uma pontuação num jogo de perguntas.
- Trocar de aparelho no meio da partida cria outro jogador. A spec 012 decide se oferece outro caminho.
- Uma partida vencida só é marcada como encerrada quando alguém a acessa. Até lá, a linha fica como aberta e vencida, e o sorteio do PIN precisa tratá-la.
- Se o deploy mudar para um host com processos persistentes, os itens 1 e 4 podem ser simplificados (timer no servidor, sem consulta periódica) sem mudar o domínio.

## Alternativas consideradas

- **Cookie assinado para o jogador** — exigiria segredo de assinatura e leitura de cookie no contexto do tRPC, e complica o teste de vários jogadores no mesmo navegador. O `localStorage` é a recomendação da própria referência (kahoot-reference §9).
- **Canais privados ou de presença do Pusher** — dariam dados individuais por evento e a lista de quem está conectado, mas exigem um endpoint de autorização e prendem o desenho ao provedor. A presença pode voltar na spec 012, se a reconexão precisar.
- **Só consulta periódica, sem tempo real** — mais simples, mas a entrada no lobby e a abertura da pergunta ficariam com segundos de atraso, e o tempo de resposta é o que vale pontos.
- **Job para encerrar partidas vencidas** — exigiria um cron na Vercel para um efeito que a verificação no acesso já entrega.
