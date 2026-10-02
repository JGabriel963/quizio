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
- **Configurações gravadas à parte (spec 012):** o bloqueio e as opções de jogo podem mudar durante o jogo. Cada configuração é gravada sozinha (`saveLocked`, e `saveOptions` só com as opções que mudaram), nunca a linha inteira: um pedido que leu a partida numa fase não desfaz o avanço gravado enquanto ele corria, e duas chaves viradas ao mesmo tempo ficam as duas gravadas. As preferências do anfitrião seguem a mesma regra. A linha inteira só é regravada por quem encerra a partida ou aplica o prazo de 8 horas.
- **Entrada durante o jogo (spec 012):** o jogador guarda a primeira pergunta que pode responder (`first_question_index`): a pergunta em curso, se as respostas dela ainda não abriram, ou a seguinte. Dela saem a espera de quem entrou no meio, a recusa de respostas a perguntas anteriores e a conta de "todos responderam". Um jogador que entra no instante em que as respostas abrem pode ficar com a pergunta em curso; o pior caso é a fase esperar o tempo dele acabar.
- **Presença do anfitrião por coluna (spec 013):** a tela do anfitrião dá sinal a cada 4 s (`game.signal`), e a partida guarda só o instante do último (`host_seen_at`), gravado sozinho como as configurações. Com 10 s ou mais de silêncio o anfitrião conta como ausente. Ninguém publica "o anfitrião saiu": sem temporizador, não há quem publique. Cada celular lê o tempo de silêncio na própria sessão e pergunta de novo no instante em que ele chegaria aos 10 s; a volta é avisada pelo evento `host-back`. Os prazos seguem correndo e as respostas seguem valendo sem o anfitrião; só o avanço de fase espera por ele.
- **Ordem sorteada uma vez (spec 012):** as ordens aleatórias de perguntas e alternativas são sorteadas em "Iniciar", antes de as perguntas serem copiadas para a partida. Depois disso a partida lê a própria cópia: todas as telas e todo recarregamento veem a mesma ordem.
- **Prazo de cada fase (spec 009):** a partida guarda o andamento (`questionIndex`, `phase`, `phaseStartedAt`), e o prazo é `phaseStartedAt` mais a duração da fase. A tela do anfitrião pede a transição, dizendo de que fase ela parte; o servidor confere, pelo relógio dele, se ela é permitida, e a grava com uma atualização condicionada a essa fase (`saveIfAt`). De dois pedidos iguais, repetidos ou de duas abas, um grava e o outro não muda nada. Uma resposta só vale se chegar antes do prazo, com meio segundo de tolerância de latência.

### 2. O jogador anônimo é um `playerId` público e um segredo

Ao entrar, o servidor cria o jogador e devolve `playerId` e `secret` (um UUID aleatório). O navegador os guarda no `localStorage`, pela chave do PIN (que é o que o link de entrada traz), e os envia em toda chamada de jogador. Como um PIN pode ser sorteado de novo para outra partida, uma sessão guardada só vale depois de conferida com o servidor. O servidor compara o segredo com o guardado.

- O `playerId` é público: aparece na lista do anfitrião e nos eventos.
- O segredo nunca sai em evento nem em resposta a outra pessoa.
- Recarregar a página ou reabrir o link retoma o mesmo jogador (spec 008, RN-44). Na spec 013, a reconexão durante o jogo usa o mesmo par.
- Jogadores não usam o Better Auth: não há conta, sessão nem cookie.

### 3. Um canal público por partida

O canal é `game-{gameId}`, sem autorização: o `gameId` é um UUID, e o que passa por ele já está na tela projetada (apelidos, cadeado, encerramento).

- O anfitrião e os jogadores assinam o mesmo canal.
- Eventos carregam IDs e dados mínimos (limite de cerca de 10 KB do Pusher).
- **Nada individual vai por evento.** O que é de um jogador só (o resultado da resposta dele, a posição dele) é buscado por uma chamada autenticada pelo segredo, disparada por um evento de aviso. Canais privados continuam fora, e o endpoint de autorização do Pusher não é necessário.

### 4. Evento é aviso; a consulta é a verdade

Um evento perdido não pode deixar uma tela errada. Por isso:

- Cada tela tem uma **consulta** que devolve o estado inteiro dela (`game.view` para o anfitrião, `game.join.session` para o jogador).
- O evento serve para atualizar a tela na hora. Ele é aplicado ao cache da consulta, ou só a invalida.
- A consulta é refeita ao reconectar, ao voltar o foco da aba e a cada 15 segundos (5 segundos durante o jogo, em que as fases são curtas). Se o serviço de tempo real cair, a partida continua, com atraso.
- A mudança de fase (`stage-changed`) leva o **palco público**: número da pergunta, fase, duração e as formas das alternativas. Assim o celular mostra os botões sem consultar. Enunciado, textos, correta e contagem por alternativa nunca vão por evento.
- O tempo que resta de uma fase vai como duração (`remainingMs`), nunca como instante: cada aparelho conta a partir do momento em que recebeu, sem depender do próprio relógio.
- Os casos de uso gravam primeiro e publicam depois. Uma falha ao publicar não desfaz a gravação.

### 5. Concorrência resolvida por restrições do banco

- **PIN único entre partidas abertas:** índice único parcial em `pin` para linhas não encerradas. A criação sorteia, tenta gravar e, em conflito, sorteia de novo.
- **Apelido único na partida:** índice único em `(game_id, nickname_key)`. O jogador removido mantém a linha, o que também bloqueia o apelido dele (spec 008, RN-30).
- **Uma resposta por jogador por pergunta:** chave primária em `(game_id, question_index, player_id)` na tabela `game_answer` (spec 009).
- **Uma transição por fase:** a atualização condicional do item 1.
- **Limite de jogadores:** conferido por contagem antes de inserir.

### 6. Pontos gravados, classificação derivada (spec 010)

Os pontos de uma resposta são calculados quando ela chega e gravados na linha dela. Total, sequência, posição e placar **não são guardados**: saem das respostas a cada leitura. Assim uma resposta que entra no instante em que a fase fecha nunca fica fora da conta, e não existe um segundo lugar que possa discordar das respostas.

O que pode ser divulgado é sempre calculado até a última pergunta revelada: a atual, a partir da revelação; a anterior, antes disso. Pontos e posições não vão por evento. Duas entradas simultâneas podem passar do limite por um ou dois jogadores, o que é aceitável para um limite técnico.

## Consequências

- Qualquer tela pode ser recarregada a qualquer momento e volta ao estado certo.
- Cada ação é uma requisição HTTP e uma escrita no banco. Serve para centenas de jogadores por partida (ADR 0002).
- A consulta periódica custa uma leitura a cada 15 segundos por tela aberta, e a cada 5 segundos durante o jogo. Para 200 jogadores jogando, são cerca de 40 consultas por segundo, todas por chave primária.
- Um evento de mudança de fase perdido custa tempo de resposta ao jogador, até a consulta seguinte.
- O pódio (spec 011) não é uma fase: é a leitura de uma partida terminada. A classificação final sai das respostas, como o placar, e a revelação dos lugares é contada de `endedAt` pelo relógio do servidor, que diz às telas quanto falta. As animações ficam só no cliente e nada na partida espera por elas.
- Para dar a posição, cada consulta de sessão na revelação soma os pontos da partida inteira. Se pesar, a saída é guardar a classificação de cada pergunta quando a fase fecha, sem mudar o domínio.
- Se a tela do anfitrião estiver fechada, a partida não avança: o prazo das respostas continua valendo, mas a revelação espera ele voltar.
- O segredo fica no `localStorage`: quem tem acesso ao navegador do jogador joga como ele. O dano é uma pontuação num jogo de perguntas.
- Trocar de aparelho no meio da partida cria outro jogador. A spec 013 decidiu manter assim, como no Kahoot.
- O sinal do anfitrião é uma gravação a cada 4 s por partida aberta. Com a aba do anfitrião escondida, o navegador atrasa os temporizadores e os jogadores veem "O anfitrião se desconectou"; o jogo, de fato, também não avança nesse caso.
- Uma partida vencida só é marcada como encerrada quando alguém a acessa. Até lá, a linha fica como aberta e vencida, e o sorteio do PIN precisa tratá-la.
- Se o deploy mudar para um host com processos persistentes, os itens 1 e 4 podem ser simplificados (timer no servidor, sem consulta periódica) sem mudar o domínio.

## Alternativas consideradas

- **Cookie assinado para o jogador** — exigiria segredo de assinatura e leitura de cookie no contexto do tRPC, e complica o teste de vários jogadores no mesmo navegador. O `localStorage` é a recomendação da própria referência (kahoot-reference §9).
- **Canais privados ou de presença do Pusher** — dariam dados individuais por evento e a lista de quem está conectado, mas exigem um endpoint de autorização e prendem o desenho ao provedor. A spec 013 precisou saber se o anfitrião está lá e ficou com uma coluna e uma consulta: o canal de presença só percebe uma queda de rede depois do tempo-limite do próprio soquete (dezenas de segundos) e poria estado fora do banco.
- **Só consulta periódica, sem tempo real** — mais simples, mas a entrada no lobby e a abertura da pergunta ficariam com segundos de atraso, e o tempo de resposta é o que vale pontos.
- **Job para encerrar partidas vencidas** — exigiria um cron na Vercel para um efeito que a verificação no acesso já entrega.
