---
id: "008"
title: Partida ao vivo 1/4 — Lobby
status: done # draft | approved | planned | in-progress | done
contexts: [game, quiz]
created: 2026-10-01
---

# 008 — Partida ao vivo 1/4: Lobby

## Contexto e problema

As specs 003 a 007 entregaram o editor: um quiz do Quizio tem perguntas, imagem e uma versão jogável. Falta o motivo de tudo isso existir, que é jogar. Hoje "Organizar ao vivo" aparece no diálogo "O quiz está pronto" marcado "Em breve", e não há como um jogador entrar em nada.

A partida ao vivo é a parte mais difícil do produto: duas telas diferentes (a do anfitrião, projetada, e a do jogador, no celular) precisam andar juntas em tempo real, com o servidor como autoridade. Para caber em entregas revisáveis, ela foi dividida em quatro specs, cada uma com algo que funciona na tela:

| Spec | Etapa |
| --- | --- |
| **008** | **Lobby: PIN, entrada por apelido, travar e remover (esta spec)** |
| 009 | Ciclo da pergunta: iniciar, pergunta, respostas e revelação |
| 010 | Pontuação, sequência e placar |
| 011 | Fim de jogo e pódio |

Esta primeira etapa não tem nenhuma regra de pergunta. Ela resolve a base de todas as outras: a partida que existe no servidor, o PIN, o jogador anônimo e a tela do anfitrião que se atualiza sozinha.

A referência visual é a demonstração do Kahoot, em capturas enviadas pelo usuário em 2026-10-01 (lobby vazio e com jogador, QR expandido, PIN, apelido, espera, remover participante, PIN errado).

## Objetivo

O criador aciona "Organizar ao vivo" num quiz publicado e vê o lobby, com o PIN do jogo, o QR e o link. Qualquer pessoa entra pelo celular com o PIN e um apelido, sem conta, e aparece na tela do anfitrião na hora. O anfitrião pode travar a entrada, remover um participante e encerrar a partida.

## Personas

- **Anfitrião (`Host`)** — o criador, dono do quiz, que conduz a partida numa tela grande (kahoot-reference §1, §6).
- **Jogador (`Player`)** — participante anônimo, no celular, identificado só pelo apelido (kahoot-reference §9).

## Histórias de usuário

- **HU-01** — Como anfitrião, quero abrir uma partida do meu quiz, para que as pessoas possam entrar.
- **HU-02** — Como anfitrião, quero mostrar o PIN, o QR e um link, para que cada um entre do jeito mais fácil.
- **HU-03** — Como jogador, quero entrar com o PIN e um apelido, sem criar conta, para jogar em segundos.
- **HU-04** — Como anfitrião, quero ver quem entrou e quantos são, para saber quando começar.
- **HU-05** — Como jogador, quero ver que entrei, para ter certeza de que estou na partida certa.
- **HU-06** — Como anfitrião, quero travar a entrada, para que ninguém mais entre depois que a turma está completa.
- **HU-07** — Como anfitrião, quero remover um participante, para tirar um apelido impróprio ou um intruso.
- **HU-08** — Como anfitrião, quero encerrar a partida, para liberar o PIN quando desisto de jogar.

## Regras de negócio

### Organizar uma partida

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Só o **dono** do quiz, com sessão iniciada, organiza uma partida dele. Jogar não exige conta. | spec 001, RN-01, RN-10 · kahoot-reference §1 |
| RN-02 | Só um quiz **publicado** e fora da lixeira pode ser organizado. Num **rascunho**, a ação aparece indisponível, com a explicação "Salve o quiz no editor para poder jogar." Num quiz na lixeira, a ação não aparece. | spec 006, RN-01, RN-04 · kahoot-reference §3.6 |
| RN-03 | Há dois pontos de entrada, ambos com o nome **"Organizar ao vivo"**: um botão na página do quiz e a opção do diálogo "O quiz está pronto", que deixa de estar marcada "Em breve" (altera a spec 006, RN-15a). | kahoot-reference §6.1 · referência visual do Kahoot |
| RN-04 | A partida usa a **versão jogável vigente no momento em que é criada** e guarda o **título** que o quiz tem nesse momento. Editar, Salvar de novo ou renomear o quiz depois não muda uma partida já criada. Isto precisa a spec 006, RN-05, que dizia "quando ela começa". | spec 006, RN-05, RN-06 · constituição, artigo V |
| RN-05 | Num quiz com **alterações não salvas**, a partida usa a versão salva, e a página do quiz avisa, junto ao botão: "A partida usa a última versão salva." | spec 006, RN-18, RN-19 · decisão do produto (2026-10-01) |
| RN-06 | Não há escolha de experiência: a partida é sempre no **modo clássico**, e "Organizar ao vivo" leva direto ao lobby. | decisão do produto (2026-10-01) |
| RN-07 | Um quiz tem **no máximo uma partida aberta**. Acionar "Organizar ao vivo" de novo cria uma partida nova, com outro PIN, e **encerra** a que estava aberta para aquele quiz (RN-31). | decisão do produto (2026-10-01) |
| RN-08 | Organizar uma partida **não** conta como modificação do quiz: não muda a data de "última modificação" nem a ordem de "Recentes". | spec 001 e 002, pergunta em aberto · decisão do produto (2026-10-01) |

### PIN do jogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | Toda partida tem um **PIN do jogo (`GamePin`)** de **6 dígitos**, sem zero à esquerda, sorteado (não sequencial) e **único entre as partidas abertas**. | kahoot-reference §6.3 · referência visual do Kahoot |
| RN-10 | O PIN é exibido em dois grupos de três dígitos ("265 914"). | referência visual do Kahoot |
| RN-11 | Uma partida fica aberta por no máximo **8 horas** desde a criação. Passado o prazo, ela conta como encerrada, e o PIN, o link e o QR deixam de funcionar. | kahoot-reference §6.3 |
| RN-12 | O PIN de uma partida encerrada pode ser sorteado de novo para outra partida. | kahoot-reference §6.3 ("PINs são temporários") |

### Lobby do anfitrião

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | Enquanto a partida é criada, a tela mostra **"Prepare-se para participar"** e **"Carregando PIN do jogo"**. Se a criação falhar, mostra "Não foi possível abrir a partida." com **Tentar de novo** e **Voltar ao quiz**. | referência visual do Kahoot · decisão do produto |
| RN-14 | O lobby mostra, no topo, a instrução **"Entre em {endereço de entrada}"**, **"PIN do jogo:"** com o PIN em destaque e o **QR code**. | referência visual do Kahoot · kahoot-reference §6.3 |
| RN-15 | O QR code leva ao **link de entrada** da partida (RN-37). Clicar nele o **expande** no centro da tela ("Expandir código QR"); o X, Esc ou um clique fora o recolhem. | referência visual do Kahoot |
| RN-16 | **"Copiar link para compartilhar"** copia o link de entrada e confirma com "Link copiado". | referência visual do Kahoot · kahoot-reference §6.3 |
| RN-17 | O lobby lista os jogadores em **cartões com o apelido**, na ordem em que entraram, e mostra o **total de jogadores** no cabeçalho. Sem jogadores, mostra **"Aguardando os participantes"**. | referência visual do Kahoot · kahoot-reference §6.3 |
| RN-18 | Um jogador que entra aparece na tela do anfitrião **sem recarregar a página**, em até 2 segundos em condições normais de rede. A entrada é anunciada a leitores de tela. | kahoot-reference §6.3 · constituição, artigo VIII |
| RN-19 | A partida vive no servidor: **recarregar** a tela do anfitrião, ou voltar a ela, mostra o mesmo lobby, com o mesmo PIN e os mesmos jogadores. | constituição, artigo V |
| RN-20 | Só o dono da partida abre a tela do anfitrião. Para qualquer outra pessoa, a partida não existe. | spec 001, RN-10 |
| RN-21 | O cabeçalho tem o botão de **tela cheia**, que alterna entre entrar e sair da tela cheia do navegador. | referência visual do Kahoot · kahoot-reference §6.2 |
| RN-22 | O botão **Iniciar** aparece ao lado do cadeado, marcado **"Em breve"**: visível e indisponível. Ele passa a funcionar na spec 009. | referência visual do Kahoot · decisão do produto (2026-10-01) |

### Travar a entrada

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-23 | O **cadeado** alterna entre entrada liberada e **entrada bloqueada (`locked`)**. A dica do botão diz o que ele fará: "Bloqueie o jogo para impedir que outros participantes entrem" ou "Desbloqueie o jogo para que outros participantes entrem". | referência visual do Kahoot · kahoot-reference §6.2, §6.3 |
| RN-24 | Com a entrada bloqueada, **ninguém novo entra**, por PIN, link ou QR. Quem já entrou continua na partida. | kahoot-reference §6.3 |
| RN-25 | Quem tenta entrar numa partida bloqueada vê **"Este jogo está bloqueado. Peça ao anfitrião para desbloquear."**, na etapa em que estiver (PIN ou apelido). | decisão do produto (2026-10-01) |
| RN-26 | Com a entrada bloqueada, a área do PIN na tela do anfitrião troca o PIN e o QR por um cadeado e **"Jogo bloqueado: ninguém mais pode entrar"**. Desbloquear traz o PIN e o QR de volta, os mesmos. | decisão do produto (2026-10-01) |

### Remover um participante

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-27 | Passar o mouse sobre o cartão de um jogador, ou focá-lo pelo teclado, **risca o apelido** e mostra **"Remover participante"**. Clicar, tocar ou pressionar Enter abre a confirmação. | referência visual do Kahoot · constituição, artigo VIII |
| RN-28 | A confirmação pergunta **"Remover {apelido}?"**, explica "Este participante será removido, mas poderá voltar usando outro apelido." e oferece **Cancelar** e **Remover**. | referência visual do Kahoot |
| RN-29 | Removido, o jogador some da lista e do total. No dispositivo dele, a tela volta à entrada do PIN com **"Ah, não! Você foi expulso do jogo."** | referência visual do Kahoot |
| RN-30 | O **apelido removido fica bloqueado** naquela partida: ninguém mais entra com ele. A pessoa pode voltar com outro apelido, se a entrada não estiver bloqueada. | referência visual do Kahoot ("poderá voltar usando outro apelido") |

### Encerrar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-31 | O botão de **sair** do lobby pergunta **"Encerrar o jogo?"**, explica "Os participantes serão desconectados e o PIN deixará de funcionar." e oferece **Cancelar** e **Encerrar**. Encerrar leva o anfitrião à página do quiz. | decisão do produto (2026-10-01) · kahoot-reference §6.2 ("End kahoot") |
| RN-32 | Numa partida encerrada (pelo anfitrião, por uma nova partida do mesmo quiz ou pelo prazo), cada jogador volta à entrada do PIN com **"O anfitrião encerrou o jogo."**, e a tela do anfitrião, se reaberta, informa "Esta partida foi encerrada." com **Voltar ao quiz**. | decisão do produto (2026-10-01) |
| RN-33 | **Fechar ou recarregar** a aba do anfitrião não encerra a partida: ela segue aberta até ser encerrada ou vencer o prazo. | constituição, artigo V · decisão do produto |
| RN-34 | Mover o quiz para a lixeira não afeta uma partida aberta. **Excluir definitivamente** o quiz encerra a partida aberta dele. | spec 001, RN-22 · decisão do produto (2026-10-01) |

### Entrada do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-35 | A **página de entrada** (`/join`) é pública, não pede conta e é pensada primeiro para o celular. Mostra o campo **"PIN"** ("Inserir PIN") e o botão **Entrar**. | kahoot-reference §9 · constituição, artigo VIII · referência visual do Kahoot |
| RN-36 | O campo do PIN abre o teclado numérico, aceita só dígitos e ignora espaços. Entrar sem nada digitado não envia. | referência visual do Kahoot · decisão do produto |
| RN-37 | O **link de entrada** (`/join/{PIN}`) e o QR code pulam a digitação do PIN e abrem direto na etapa do apelido. | kahoot-reference §6.3, §9 |
| RN-38 | Um PIN que não corresponde a uma partida aberta (inexistente, encerrada ou vencida) deixa o campo em vermelho e mostra **"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo."** A mensagem é a mesma nos três casos. Um link de entrada com PIN assim abre a entrada do PIN com essa mensagem. | referência visual do Kahoot |
| RN-39 | Os **PINs errados são limitados a 30 por minuto por endereço de rede (IP)**. Acima disso, a página mostra "Muitas tentativas. Aguarde um momento e tente de novo.", até o minuto virar. PINs certos não contam. | decisão do produto (2026-10-01), contra a adivinhação de PINs |
| RN-40 | A etapa do **apelido** mostra o campo "Apelido" ("Insira seu apelido"), o botão **"Ok, vamos lá!"** e o aviso **"Não use seu nome verdadeiro"**. | referência visual do Kahoot |
| RN-41 | O **apelido (`Nickname`)** tem de **1 a 15 caracteres** percebidos, depois de tirar os espaços das pontas e juntar espaços repetidos. Vazio não envia; o campo não aceita digitar além do limite. | kahoot-reference §9 (15 caracteres, terceiros) · spec 004, RN-04 |
| RN-42 | O apelido é **único na partida**, sem diferenciar maiúsculas, minúsculas e acentos ("José" e "jose" são o mesmo). Um apelido em uso, ou bloqueado por remoção (RN-30), mostra **"Esse apelido já está em uso. Escolha outro."**, e o jogador continua na etapa do apelido. | kahoot-reference §9 · decisão do produto (2026-10-01) |
| RN-43 | Depois de entrar, o jogador vê a **tela de espera**: o apelido em destaque e **"Pronto! Está vendo seu apelido na tela?"**. O apelido fica fixo até o fim da partida. | referência visual do Kahoot · kahoot-reference §9 |
| RN-44 | O jogador é **anônimo** e pertence àquele navegador naquela partida: recarregar a página, ou abrir de novo o link ou o PIN no mesmo navegador, volta à tela de espera com o mesmo apelido, sem criar outro jogador. | kahoot-reference §9 (recomendação) · constituição, artigo VIII |
| RN-45 | Uma partida aceita no máximo **200 jogadores**. Cheia, quem tenta entrar vê "Este jogo está cheio." O limite é técnico (tamanho das mensagens em tempo real e da tela do anfitrião) e configurável; não há limite por plano. | kahoot-reference §6.3 · constituição, artigo VI |
| RN-46 | O que o jogador vê depende do servidor: se ele foi removido ou a partida foi encerrada enquanto estava sem conexão, ao voltar ou recarregar ele vê a entrada do PIN com a mensagem correspondente (RN-29, RN-32). | constituição, artigos V e VIII |

## Critérios de aceite

### Organizar

#### CA-01 — Organizar pela página do quiz

- **Dado** um criador na página de um quiz publicado
- **Quando** ele aciona "Organizar ao vivo"
- **Então** vê "Prepare-se para participar" e, em seguida, o lobby com um PIN de 6 dígitos, o QR code e "Aguardando os participantes"
- **E** o total de jogadores é 0

#### CA-02 — Organizar pelo diálogo "O quiz está pronto"

- **Dado** um criador que acabou de salvar o quiz no editor e vê "O quiz está pronto"
- **Quando** ele escolhe "Organizar ao vivo"
- **Então** vai para o lobby de uma partida nova desse quiz
- **E** a opção não está mais marcada "Em breve"

#### CA-03 — Rascunho não pode ser organizado

- **Dado** um quiz que nunca foi salvo como versão jogável
- **Quando** o criador abre a página dele
- **Então** "Organizar ao vivo" está indisponível, com "Salve o quiz no editor para poder jogar."
- **E** uma tentativa direta de criar a partida é recusada

#### CA-04 — Quiz na lixeira

- **Dado** um quiz publicado que está na lixeira
- **Quando** o criador abre a página dele
- **Então** não há "Organizar ao vivo", e uma tentativa direta de criar a partida é recusada

#### CA-05 — Quiz de outra pessoa

- **Dado** um quiz publicado de outro criador
- **Quando** alguém que não é o dono tenta organizar uma partida dele
- **Então** a resposta é a mesma de um quiz que não existe

#### CA-06 — Alterações não salvas

- **Dado** um quiz publicado com 3 perguntas na versão jogável e uma quarta ainda não salva
- **Quando** o criador abre a página do quiz
- **Então** vê, junto ao botão, "A partida usa a última versão salva."
- **E** a partida criada usa a versão com 3 perguntas

#### CA-07 — A partida não muda com o quiz

- **Dado** uma partida aberta de um quiz chamado "Capitais"
- **Quando** o criador renomeia o quiz para "Geografia" e salva uma nova versão no editor
- **Então** a partida aberta continua com o título "Capitais" e com a versão em que foi criada

#### CA-08 — Uma partida aberta por quiz

- **Dado** uma partida aberta de um quiz, com PIN 265 914 e um jogador na espera
- **Quando** o criador aciona "Organizar ao vivo" de novo no mesmo quiz
- **Então** vê o lobby de uma partida nova, com outro PIN e sem jogadores
- **E** o jogador da partida anterior volta à entrada do PIN com "O anfitrião encerrou o jogo."

#### CA-09 — Organizar não mexe em "Recentes"

- **Dado** dois quizzes, em que "A" foi modificado por último
- **Quando** o criador organiza uma partida de "B"
- **Então** "A" continua antes de "B" em "Recentes", e a data de última modificação de "B" não muda

### PIN e lobby

#### CA-10 — PIN único

- **Dado** uma partida aberta com um PIN
- **Quando** outra partida é criada
- **Então** ela recebe um PIN de 6 dígitos diferente, que não começa com zero

#### CA-11 — Prazo de 8 horas

- **Dado** uma partida criada há mais de 8 horas
- **Quando** um jogador digita o PIN dela
- **Então** vê "Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo."
- **E** o anfitrião, ao reabrir a tela, vê "Esta partida foi encerrada."

#### CA-12 — QR code expandido

- **Dado** o lobby aberto
- **Quando** o anfitrião clica no QR code
- **Então** o QR aparece grande no centro da tela
- **E** o X, a tecla Esc ou um clique fora o recolhem

#### CA-13 — O QR e o link levam ao apelido

- **Dado** o lobby de uma partida com PIN 265 914
- **Quando** alguém abre o endereço contido no QR code, ou o link copiado
- **Então** cai direto na etapa do apelido daquela partida, sem digitar o PIN

#### CA-14 — Copiar o link

- **Dado** o lobby aberto
- **Quando** o anfitrião aciona "Copiar link para compartilhar"
- **Então** o link de entrada vai para a área de transferência, e a tela confirma "Link copiado"

#### CA-15 — Jogador aparece no lobby

- **Dado** o lobby aberto e vazio
- **Quando** um jogador entra com o apelido "ACT"
- **Então** o cartão "ACT" aparece na tela do anfitrião sem que ele recarregue
- **E** o total de jogadores passa a 1, e "Aguardando os participantes" some

#### CA-16 — Ordem de entrada

- **Dado** o lobby aberto
- **Quando** entram "Ana", depois "Bia", depois "Caio"
- **Então** os cartões aparecem nessa ordem, e o total é 3

#### CA-17 — Recarregar o lobby

- **Dado** o lobby com dois jogadores
- **Quando** o anfitrião recarrega a página
- **Então** vê o mesmo PIN e os mesmos dois jogadores

#### CA-18 — Tela do anfitrião só para o dono

- **Dado** uma partida aberta
- **Quando** outro criador, ou alguém sem sessão, abre o endereço da tela do anfitrião
- **Então** o outro criador vê a página de não encontrado, e quem não tem sessão é levado a entrar na conta

#### CA-19 — Falha ao criar a partida

- **Dado** que a criação da partida falha
- **Quando** o criador aciona "Organizar ao vivo"
- **Então** vê "Não foi possível abrir a partida.", com "Tentar de novo" e "Voltar ao quiz"

#### CA-20 — Iniciar ainda indisponível

- **Dado** o lobby com um jogador
- **Quando** o anfitrião olha o botão Iniciar
- **Então** ele está visível, marcado "Em breve" e não pode ser acionado

### Travar

#### CA-21 — Bloquear a entrada

- **Dado** o lobby com um jogador e a entrada liberada
- **Quando** o anfitrião aciona o cadeado
- **Então** a área do PIN passa a mostrar "Jogo bloqueado: ninguém mais pode entrar", sem o PIN e sem o QR
- **E** o jogador que já estava continua na lista e na tela de espera

#### CA-22 — Entrar com o jogo bloqueado

- **Dado** uma partida com a entrada bloqueada
- **Quando** alguém digita o PIN, ou abre o link de entrada
- **Então** vê "Este jogo está bloqueado. Peça ao anfitrião para desbloquear." e não chega à tela de espera

#### CA-23 — Bloqueio durante a escolha do apelido

- **Dado** um jogador na etapa do apelido de uma partida liberada
- **Quando** o anfitrião bloqueia a entrada e o jogador envia o apelido
- **Então** o jogador vê "Este jogo está bloqueado. Peça ao anfitrião para desbloquear." e não entra

#### CA-24 — Desbloquear

- **Dado** uma partida com a entrada bloqueada
- **Quando** o anfitrião aciona o cadeado de novo
- **Então** o mesmo PIN e o mesmo QR voltam à tela, e novos jogadores conseguem entrar

### Remover

#### CA-25 — Remover um participante

- **Dado** o lobby com os jogadores "ACT" e "Bia"
- **Quando** o anfitrião passa o mouse sobre "ACT", clica e confirma em "Remover"
- **Então** "ACT" some da lista, e o total passa a 1
- **E** no dispositivo de "ACT" aparece a entrada do PIN com "Ah, não! Você foi expulso do jogo."

#### CA-26 — Cancelar a remoção

- **Dado** a confirmação "Remover ACT?" aberta
- **Quando** o anfitrião aciona Cancelar
- **Então** "ACT" continua na lista e na tela de espera

#### CA-27 — Apelido removido fica bloqueado

- **Dado** que "ACT" foi removido da partida
- **Quando** alguém tenta entrar nela com "ACT" ou "act"
- **Então** vê "Esse apelido já está em uso. Escolha outro."
- **E** a mesma pessoa entra normalmente com "ACT2"

#### CA-28 — Remover pelo teclado e pelo toque

- **Dado** o lobby com o jogador "ACT"
- **Quando** o anfitrião chega ao cartão com a tecla Tab e pressiona Enter, ou toca no cartão numa tela de toque
- **Então** a confirmação "Remover ACT?" abre

#### CA-29 — Último jogador removido

- **Dado** o lobby com um único jogador
- **Quando** o anfitrião o remove
- **Então** o total volta a 0, e "Aguardando os participantes" reaparece

### Encerrar

#### CA-30 — Encerrar a partida

- **Dado** o lobby com um jogador
- **Quando** o anfitrião aciona sair e confirma em "Encerrar"
- **Então** vai para a página do quiz
- **E** o jogador volta à entrada do PIN com "O anfitrião encerrou o jogo."
- **E** o PIN deixa de ser reconhecido

#### CA-31 — Desistir de encerrar

- **Dado** a confirmação "Encerrar o jogo?" aberta
- **Quando** o anfitrião aciona Cancelar
- **Então** o lobby continua aberto, com o mesmo PIN e os mesmos jogadores

#### CA-32 — Fechar a aba não encerra

- **Dado** o lobby com um jogador
- **Quando** o anfitrião fecha a aba e volta ao endereço da tela do anfitrião
- **Então** vê o lobby com o mesmo PIN e o mesmo jogador

#### CA-33 — Reabrir uma partida encerrada

- **Dado** uma partida encerrada
- **Quando** o anfitrião abre o endereço da tela dela
- **Então** vê "Esta partida foi encerrada." e "Voltar ao quiz"

#### CA-34 — Exclusão definitiva do quiz

- **Dado** uma partida aberta de um quiz que foi para a lixeira
- **Quando** o criador exclui o quiz definitivamente
- **Então** a partida é encerrada, e o PIN deixa de ser reconhecido

### Entrada do jogador

#### CA-35 — Entrar pelo PIN

- **Dado** uma partida aberta com PIN 265 914
- **Quando** alguém sem conta abre a página de entrada, digita "265914" e aciona Entrar
- **Então** vê a etapa do apelido, com "Não use seu nome verdadeiro"

#### CA-36 — PIN com espaço

- **Dado** uma partida aberta com PIN 265 914
- **Quando** o jogador digita "265 914"
- **Então** o PIN é aceito como "265914"

#### CA-37 — PIN errado

- **Dado** que não há partida aberta com o PIN 569 172
- **Quando** o jogador digita "569172" e aciona Entrar
- **Então** o campo fica em vermelho, com "Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo."
- **E** ele continua na entrada do PIN, podendo corrigir

#### CA-38 — Muitas tentativas

- **Dado** uma rede de onde o PIN foi errado 30 vezes no último minuto
- **Quando** tenta mais uma vez
- **Então** vê "Muitas tentativas. Aguarde um momento e tente de novo.", mesmo que o PIN esteja certo

#### CA-39 — Apelido aceito

- **Dado** um jogador na etapa do apelido
- **Quando** ele digita "  ACT  " e aciona "Ok, vamos lá!"
- **Então** vê a tela de espera com "ACT" e "Pronto! Está vendo seu apelido na tela?"

#### CA-40 — Limite do apelido

- **Dado** um jogador na etapa do apelido
- **Quando** ele tenta digitar 16 caracteres
- **Então** o campo fica com 15
- **E** um apelido de 15 caracteres, mesmo com emoji, é aceito

#### CA-41 — Apelido vazio

- **Dado** um jogador na etapa do apelido
- **Quando** ele aciona "Ok, vamos lá!" com o campo vazio ou só com espaços
- **Então** nada é enviado, e ele continua na etapa do apelido

#### CA-42 — Apelido repetido

- **Dado** uma partida em que "José" já entrou
- **Quando** outro jogador tenta entrar com "jose"
- **Então** vê "Esse apelido já está em uso. Escolha outro." e continua na etapa do apelido

#### CA-43 — Recarregar a tela de espera

- **Dado** o jogador "ACT" na tela de espera
- **Quando** ele recarrega a página, ou abre de novo o link de entrada no mesmo navegador
- **Então** volta à tela de espera como "ACT"
- **E** o lobby continua com um só "ACT"

#### CA-44 — Partida cheia

- **Dado** uma partida com 200 jogadores
- **Quando** mais alguém tenta entrar
- **Então** vê "Este jogo está cheio." e não entra

#### CA-45 — Removido enquanto estava sem conexão

- **Dado** o jogador "ACT" na tela de espera, com o celular sem conexão
- **Quando** o anfitrião o remove e o celular volta a ter conexão
- **Então** "ACT" vê a entrada do PIN com "Ah, não! Você foi expulso do jogo."

#### CA-46 — No celular

- **Dado** a página de entrada aberta num celular
- **Quando** o jogador toca no campo do PIN
- **Então** o teclado numérico abre, e os campos e botões ficam ao alcance do toque, sem rolagem horizontal

## Experiência (telas e estados)

As telas da partida usam o tema escuro do Quizio, em roxo, com as cores e a tipografia do design system. As telas são as da demonstração do Kahoot, sem o cenário de sala de aula.

- **Página do quiz**: o botão "Organizar ao vivo" em destaque, antes de "Editar". Em rascunho, indisponível com a explicação; com alterações não salvas, o aviso de uma linha.
- **Abrindo a partida**: o cartaz branco "Prepare-se para participar" e, abaixo, a faixa "Entre em {endereço}" ao lado de "Carregando PIN do jogo".
- **Lobby do anfitrião**:
  - Cabeçalho escuro com o nome do Quizio ao centro, o botão de sair à esquerda e, à direita, o total de jogadores com o ícone de pessoa e o botão de tela cheia.
  - No topo, o cartão branco em duas partes: "Entre em **{endereço}**" e "PIN do jogo:" com o PIN grande; ao lado, o QR code quadrado. Abaixo, "Copiar link para compartilhar".
  - À direita, o cadeado e o botão Iniciar juntos, numa cápsula escura.
  - No centro, o nome do Quizio e a grade de cartões dos jogadores; cada cartão roxo escuro traz o apelido. Com muitos jogadores, a grade quebra em linhas e rola.
  - Sem jogadores, a faixa "Aguardando os participantes".
- **QR expandido**: o fundo escurece, e o QR aparece grande, com o X no canto.
- **Jogo bloqueado**: o cadeado fechado e destacado; no lugar do PIN e do QR, o cadeado e "Jogo bloqueado: ninguém mais pode entrar".
- **Remover**: o apelido riscado no cartão com a dica "Remover participante"; a confirmação em diálogo branco, com "Cancelar" neutro e "Remover" em vermelho.
- **Encerrar**: diálogo no mesmo formato, com "Cancelar" e "Encerrar" em vermelho.
- **Entrada do jogador (PIN)**: o nome do Quizio grande sobre o roxo; um cartão branco com "PIN", o campo "Inserir PIN" e o botão escuro "Entrar". As mensagens de erro e de expulsão aparecem numa faixa vermelha na base da tela, com ícone de alerta; no PIN errado, o campo também fica com borda vermelha e ícone de alerta.
- **Apelido**: o mesmo cartão, com "Apelido", o campo "Insira seu apelido" e o botão "Ok, vamos lá!"; na base, "Não use seu nome verdadeiro". O erro de apelido aparece na faixa vermelha.
- **Espera**: o apelido grande no centro e "Pronto! Está vendo seu apelido na tela?".
- **Estados**: abrindo, lobby vazio, lobby com jogadores, QR expandido, bloqueado, confirmando remoção, confirmando encerramento, partida encerrada (anfitrião), falha ao abrir; no jogador, PIN, PIN não reconhecido, muitas tentativas, bloqueado, cheio, apelido, apelido em uso, espera, expulso, encerrado.
- **Tela do anfitrião em telas pequenas**: continua utilizável num tablet ou celular, com o PIN e o QR empilhados.

## Divergências intencionais do Kahoot

- **Sem escolha de experiência** (RN-06): o Kahoot pergunta entre clássico, equipe, precisão e outros. O Quizio só tem o clássico por enquanto, então vai direto ao lobby.
- **Sem avatar**: o Kahoot deixa o jogador escolher personagem e acessório, e mostra o avatar no cartão. Aqui o cartão e a tela de espera têm só o apelido (decisão do usuário, 2026-10-01).
- **Sem "Conquistas", sem a barra do app e sem troca de idioma** na tela do jogador.
- **Sem som e sem configurações no cabeçalho** do anfitrião: música e opções de jogo ficam para a spec 012 (decisão do usuário, 2026-10-01).
- **Sem o cenário e sem temas**: fundo roxo liso do design system.
- **A instrução de entrada cita só o endereço do Quizio**, sem "ou com o app".
- **Iniciar como "Em breve"** (RN-22): no Kahoot ele inicia a partida; aqui isso chega na spec 009.
- **Uma partida aberta por quiz** (RN-07): o Kahoot permite várias sessões do mesmo kahoot ao mesmo tempo. Aqui a nova encerra a anterior, para não deixar lobbies esquecidos com PIN ativo.
- **Encerrar explícito no lobby** (RN-31): no Kahoot a sessão acaba quando o anfitrião sai da página. Aqui a partida vive no servidor e sobrevive a um recarregamento (RN-33), então o encerramento é uma ação.
- **Sem filtro de apelidos impróprios**: o Kahoot troca apelidos ofensivos por um neutro. Aqui o anfitrião remove (RN-27 a RN-30); o filtro e o gerador de apelidos ficam para a spec 012.
- **Limite de 200 jogadores** (RN-45), técnico e configurável, em vez dos limites por plano do Kahoot.

## Fora de escopo

- Iniciar a partida e tudo o que vem depois: ciclo da pergunta (spec 009), pontuação e placar (spec 010), pódio e fim de jogo (spec 011).
- Reconexão durante o jogo, entrada tardia, opções de jogo, gerador e filtro de apelidos, entrada em duas etapas, música e efeitos sonoros (spec 012).
- Saber se um jogador fechou a aba ou perdeu a conexão: no lobby, quem entrou continua na lista até ser removido.
- Relatórios e histórico de partidas (spec 013).
- Modo equipe (spec 018) e os demais modos.
- Avatares.
- Várias partidas abertas do mesmo quiz, e playlist de quizzes.
- Atribuir e jogar solo (spec 017).

## Perguntas em aberto

- [ ] **Iniciar como "Em breve"** (RN-22) — nesta etapa o lobby termina em travar, remover e encerrar. A alternativa seria deixar o botão de fora até a spec 009.
- [x] **Uma partida aberta por quiz** (RN-07) — aceita pelo usuário em 2026-10-01: o limite é por quiz, e quizzes diferentes podem ter partidas abertas ao mesmo tempo. Para duas turmas em paralelo, duplica-se o quiz.
- [x] **Limite de 200 jogadores** (RN-45) — mantido pelo plano: os eventos do lobby levam um jogador por vez, bem abaixo do teto de 10 KB.
- [ ] **Tela do jogo bloqueado e textos sem captura** (RN-25, RN-26, RN-42) — o cadeado ativado e o apelido repetido não aparecem nas capturas; os textos são propostos. Se houver captura do Kahoot, ajustar.
- [x] **O que a partida copia do quiz** (herdada da spec 006) — resolvido: a versão jogável e o título do momento da criação (RN-04).
- [x] **"Recentes" depois das partidas** (herdada das specs 001 e 002) — resolvido: organizar não altera "Recentes" (RN-08).
- [x] **Imagens de versões antigas** (herdada da spec 007) — resolvido: nenhuma versão guardada é apagada enquanto o quiz existe, e as imagens seguem a regra da spec 007, RN-36; uma partida sempre encontra as imagens da versão em que foi criada.

## Changelog

- 2026-10-01 — spec criada, com as capturas da demonstração do Kahoot enviadas pelo usuário (lobby, QR expandido, PIN, apelido, espera, remover participante, expulso, PIN errado). Decisões do usuário: a partida ao vivo é entregue em etapas; nesta, só apelido (sem avatar); travar e remover entram no lobby; o cabeçalho do anfitrião tem só o total de jogadores e a tela cheia; "Conquistas" fica fora. Decisões tomadas sem consulta prévia: Iniciar como "Em breve" (RN-22); uma partida aberta por quiz (RN-07); encerrar explícito (RN-31); PIN de 6 dígitos e prazo de 8 horas (RN-09, RN-11); apelido de 1 a 15 caracteres, único sem diferenciar maiúsculas e acentos (RN-41, RN-42); limite de 200 jogadores (RN-45); limite de PINs errados por minuto (RN-39); textos do jogo bloqueado, cheio, encerrado e do apelido em uso.
- 2026-10-01 — aprovada pelo usuário, que aceitou a regra de uma partida aberta por quiz (RN-07). Combinado: detalhes de interface e de regras podem ser ajustados durante o desenvolvimento, registrando aqui cada mudança de regra. As demais perguntas em aberto (Iniciar como "Em breve", limite de 200, textos sem captura) seguem com o valor proposto.
- 2026-10-01 — ajuste vindo do plano: o limite de PINs errados passa de 10 por dispositivo para 30 por endereço de rede (RN-39, CA-38). O servidor só enxerga o IP, e uma sala inteira costuma sair pelo mesmo; 10 erros por minuto travariam uma turma grande.
- 2026-10-01 — implementada (tarefas T01 a T16). Os critérios de aceite têm teste automatizado verde em domínio, casos de uso, PGlite, API, componentes e E2E com anfitrião e jogadores em navegadores separados, em desktop e celular; as exceções estão em `tasks.md`. Decisões de base no ADR 0009. Ajuste vindo da implementação: os formulários do jogador só aparecem quando a página está interativa.
