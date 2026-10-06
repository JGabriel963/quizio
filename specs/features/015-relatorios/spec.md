---
id: "015"
title: Relatórios
status: done # draft | approved | planned | in-progress | done
contexts: [reports, game, library]
created: 2026-10-06
---

# 015 — Relatórios

## Contexto e problema

Uma partida do Quizio termina no pódio, e depois dele não sobra nada para ver. O anfitrião fica sem saber quais perguntas o grupo errou, quem ficou para trás e como cada jogador respondeu. As respostas estão todas guardadas (specs 009 e 010), mas nenhuma tela as mostra depois do jogo. Os dois pontos de entrada já existem desde a spec 002 e estão parados: o item **Relatórios** da navegação principal e o cartão **"Relatórios mais recentes"** da página inicial, os dois marcados "Em breve".

No Kahoot, isso é a área **Relatórios**. O usuário mandou as capturas dela em 2026-10-06:

- a **lista**, com uma linha por partida (capa com o número de perguntas, título, "Sessão ao vivo", participantes, percentual de respostas corretas, data de término) e o menu de cada linha: "Abrir relatório", "Jogar de novo", "Baixar o relatório", "Renomear", "Mover para a lixeira"; ao lado, as seções "Kahoots" e "Lixeira";
- o **relatório** aberto: o título com o lápis para renomear, "Ao vivo", a data e "Organizado por"; as abas Resumo, Participantes, Perguntas e Feedback;
- o **Resumo**: o percentual geral num anel, uma frase de incentivo com "Jogar de novo", os totais (participantes, perguntas, tempo) e os cartões **"Perguntas difíceis"**, **"Ajuda necessária"** e **"Não concluiu"**, cada um com a sua explicação;
- a aba **Participantes**, com "Todos" e "Ajuda necessária" e as colunas apelido, classificação, respostas corretas, não respondido e pontuação final;
- a aba **Perguntas**, com "Todos" e "Perguntas difíceis" e as colunas pergunta, tipo e respostas corretas.

As explicações do Kahoot fixam os limites que a referência deixava em aberto: pergunta difícil é a que **menos de 35%** dos participantes acertam; precisa de ajuda quem acertou **menos de 35%** das respostas no jogo inteiro; não concluiu quem deixou pergunta sem resposta.

Decisões do usuário (2026-10-06): toda partida iniciada vira relatório, inclusive a encerrada no meio; os relatórios **ficam** quando o quiz é excluído de vez; a exclusão é por **lixeira**, como no Kahoot; **renomear** entra; a aba Feedback, "Ver pódio", o quiz só com as perguntas difíceis e o download ficam de fora.

## Objetivo

Depois de uma partida, o criador abre o relatório dela e vê como o grupo foi: o resultado geral, as perguntas que mais derrubaram, quem precisa de ajuda, e o detalhe de cada participante e de cada pergunta. Os relatórios ficam numa lista própria, onde podem ser renomeados, mandados para a lixeira e restaurados.

## Personas

- **Criador / Anfitrião (`Host`)** — organizou a partida e quer entender o resultado: o que revisar com o grupo e com quem.
- **Jogador (`Player`)** — não vê relatório nenhum. O que ele recebe continua sendo o resultado no próprio celular (specs 010 e 011).

## Histórias de usuário

- **HU-01** — Como criador, quero ver a lista das partidas que organizei, para voltar ao resultado de qualquer uma.
- **HU-02** — Como criador, quero um resumo da partida, para saber de relance como o grupo foi.
- **HU-03** — Como criador, quero ver quais perguntas foram difíceis, para saber o que revisar.
- **HU-04** — Como criador, quero ver quem precisa de ajuda e quem deixou perguntas sem resposta, para saber com quem conversar.
- **HU-05** — Como criador, quero ver as respostas de um participante, pergunta a pergunta, para entender onde ele errou.
- **HU-06** — Como criador, quero ver como o grupo respondeu a uma pergunta, para saber qual alternativa errada atraiu mais gente.
- **HU-07** — Como criador, quero renomear um relatório, para distinguir duas partidas do mesmo quiz ("Turma A", "Turma B").
- **HU-08** — Como criador, quero mandar relatórios para a lixeira e poder restaurá-los, para limpar a lista sem medo de errar.
- **HU-09** — Como criador, quero jogar de novo a partir de um relatório, para repetir o quiz com o mesmo grupo.
- **HU-10** — Como criador, quero que os relatórios continuem existindo depois que eu excluir o quiz, para não perder o histórico.

## Regras de negócio

### O que é um relatório

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Um **relatório (`Report`)** é o resultado de **uma partida ao vivo que foi iniciada e já acabou**: a que chegou ao pódio, a que o anfitrião encerrou no meio (spec 013, RN-02) e a que venceu o prazo de 8 horas depois de iniciada (spec 008). Cada partida tem um relatório, e só um. **O relatório é da partida, não do quiz**: jogar o mesmo quiz outra vez (por "Organizar ao vivo", "Jogar novamente" ou "Jogar de novo") gera outro relatório, e os anteriores ficam como estão. | kahoot-reference §10 · decisão do usuário (2026-10-06) |
| RN-02 | Uma partida **encerrada ainda no lobby** não gera relatório. Uma partida **em andamento** ainda não tem relatório: ele aparece quando ela acaba. | decisão do usuário (2026-10-06) |
| RN-03 | O relatório é **só do criador que organizou a partida**. Para qualquer outra pessoa, ele não existe: o endereço responde "não encontrado", como um relatório que nunca existiu. | constituição · spec 001 (recursos de outros donos) |
| RN-04 | O relatório é **independente do quiz**: mostra as perguntas **como foram jogadas** (a versão, a ordem e as alternativas daquela partida, spec 009, RN-03 e spec 012), e nada do que o criador editar no quiz depois muda o que ele mostra. | kahoot-reference §10 · spec 006 |
| RN-05 | **Excluir o quiz definitivamente não apaga os relatórios** das partidas dele. Altera a spec 008, em que as partidas iam embora junto com o quiz. No relatório de um quiz que não existe mais (ou que está na lixeira), "Jogar de novo" e "Ver quiz" não aparecem. | kahoot-reference §10 · decisão do usuário (2026-10-06) |
| RN-06 | As **imagens** (a capa do quiz e a imagem de cada pergunta) aparecem no relatório **enquanto existirem**. Elas pertencem ao quiz (spec 007, RN-36): quando ele é excluído de vez, ou quando uma versão antiga perde a imagem, o relatório passa a mostrar a imagem padrão no lugar da capa e as perguntas sem imagem. Os textos e os números não mudam. | spec 007, RN-36 · decisão do produto (2026-10-06) |
| RN-07 | O relatório é **somente leitura**: nada nele muda as respostas, os pontos ou a classificação. A única coisa editável é o nome (RN-45). | decisão do produto (2026-10-06) |

### O que conta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-08 | **Participantes** são os jogadores que estavam na partida quando ela foi iniciada ou que entraram durante o jogo (spec 012, RN-13). Quem foi removido no lobby não é participante. | spec 008, RN-30 · spec 012 |
| RN-09 | **Perguntas jogadas** são as que chegaram à revelação (spec 009, RN-11). Numa partida que foi até o pódio, são todas. Numa partida encerrada no meio, a pergunta que estava na tela sem ter sido revelada, e as que vinham depois dela, **não entram em nenhuma conta**; o relatório diz quantas foram jogadas, de quantas. | decisão do produto (2026-10-06) |
| RN-10 | Para cada participante, as **perguntas dele** são as perguntas jogadas a partir da primeira que ele pôde responder (spec 012, RN-13). As perguntas anteriores à entrada de quem chegou atrasado **não contam para ele**: nem como erro, nem como não respondida. | decisão do produto (2026-10-06) |
| RN-11 | Uma resposta é **correta** quando o servidor a marcou como correta (spec 009, RN-22). Uma resposta **parcialmente correta** (múltipla escolha, spec 010, RN-06) **não conta como acerto** nos percentuais; no detalhe ela aparece como "Parcialmente correta", com os pontos que rendeu. | decisão do produto (2026-10-06) |
| RN-12 | **Não respondida** é a pergunta do participante (RN-10) para a qual ele não enviou resposta a tempo. Ela conta como **não acertada** nos percentuais. | referência visual do Kahoot ("não enviaram uma resposta a tempo") |
| RN-13 | O **percentual de acertos de um participante** é o número de respostas corretas dele dividido pelo número de perguntas dele (RN-10). | referência visual do Kahoot · kahoot-reference §10.2 |
| RN-14 | O **percentual de acertos de uma pergunta** é o número de participantes que a acertaram dividido pelo número de participantes que podiam respondê-la (RN-10). | referência visual do Kahoot · kahoot-reference §10.3 |
| RN-15 | O **percentual geral** da partida é o total de respostas corretas dividido pelo total de respostas possíveis: a soma, para cada participante, das perguntas dele. | referência visual do Kahoot ("38% correto") |
| RN-16 | Os percentuais aparecem **arredondados para o inteiro mais próximo**. As comparações com 35% (RN-17, RN-18) usam o valor **exato**, antes de arredondar. Sem nenhuma pergunta jogada não há percentual: aparece "—". | decisão do produto (2026-10-06) |
| RN-17 | Uma **pergunta difícil (`DifficultQuestion`)** é uma pergunta jogada com percentual de acertos **menor que 35%**. Com exatamente 35% ela não é difícil. Perguntas "Sem pontos" entram na conta como as outras. | referência visual do Kahoot ("menos de 35% dos participantes acerta a resposta") · kahoot-reference §10.1 |
| RN-18 | **Ajuda necessária (`needsHelp`)** lista os participantes com percentual de acertos **menor que 35%** no jogo inteiro. Quem não teve nenhuma pergunta (entrou e a partida acabou antes da pergunta seguinte) não entra. | referência visual do Kahoot ("acertaram menos de 35% das respostas no jogo inteiro") |
| RN-19 | **Não concluiu (`didNotFinish`)** lista os participantes com ao menos uma pergunta não respondida (RN-12), com quantas foram. | referência visual do Kahoot ("não enviaram uma resposta a tempo ou saíram do jogo antes de concluir") |
| RN-20 | A **classificação** e a **pontuação final** de cada participante são as da partida (spec 010, RN-19; spec 011): pelo total de pontos, com o empate pela ordem de entrada. Numa partida encerrada no meio, valem os pontos das perguntas jogadas. | spec 010 · spec 011 |
| RN-21 | O **tempo** da partida vai do momento em que ela foi iniciada até o momento em que acabou, em minutos inteiros ("11 min"); abaixo de um minuto, "menos de 1 min". O **tempo médio de resposta** de uma pergunta é a média dos tempos de quem respondeu, em segundos com duas casas ("4,86 s"). | referência visual do Kahoot · kahoot-reference §10.1, §10.3 |

### A lista

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | O item **Relatórios** da navegação principal (spec 002, RN-04, RN-05) deixa de ser "Em breve" e abre a área de relatórios, com duas seções em abas, como a Biblioteca: **Relatórios** e **Lixeira**. | spec 002, RN-05 · referência visual do Kahoot |
| RN-23 | A seção Relatórios lista os relatórios do criador que estão fora da lixeira, **do que acabou mais recentemente para o mais antigo**. | referência visual do Kahoot |
| RN-24 | Cada linha mostra: a **capa** do quiz com o número de perguntas do quiz jogado ("15 perguntas"); o **nome** do relatório e, abaixo, "Ao vivo"; o número de **participantes**; o **percentual geral** de respostas corretas, num anel; e a **data e a hora em que a partida acabou**. | referência visual do Kahoot |
| RN-25 | Uma partida **encerrada antes do fim** leva essa marca na linha, ao lado de "Ao vivo". Sem nenhuma pergunta jogada, o percentual aparece como "—". | decisão do produto (2026-10-06) — o Kahoot mostra "?" e "Nenhuma" |
| RN-26 | Acionar a linha **abre o relatório**. O menu de cada linha tem **"Abrir relatório"**, **"Jogar de novo"** (RN-48), **"Renomear"** (RN-45) e **"Mover para a lixeira"** (RN-50). | referência visual do Kahoot |
| RN-27 | A lista tem **pesquisa pelo nome** do relatório, sem diferenciar maiúsculas de minúsculas nem acentos, como a da biblioteca (spec 001). | referência visual do Kahoot ("Pesquisar título") · spec 001 |
| RN-28 | A lista mostra **20 relatórios** e o link **"Mostrar mais"** traz os 20 seguintes, até acabarem. | decisão do produto (2026-10-06) |
| RN-29 | Cada linha tem uma **caixa de seleção**, e o cabeçalho, uma que marca todas as linhas mostradas. Com ao menos uma marcada aparece a ação para as selecionadas: "Mover para a lixeira" na seção Relatórios; "Restaurar" e "Excluir definitivamente" na Lixeira. | referência visual do Kahoot |
| RN-30 | Sem nenhum relatório, a seção explica que eles aparecem depois de uma partida ao vivo e oferece o caminho para a Biblioteca. Uma pesquisa sem resultado diz que nada foi encontrado para o termo. | decisão do produto (2026-10-06) |
| RN-31 | O cartão **"Relatórios mais recentes"** da página inicial (spec 002, RN-19) deixa de ser "Em breve": mostra os relatórios mais recentes fora da lixeira, na mesma quantidade do cartão "Seus quizzes", cada um com o nome, a data e o percentual geral, e o link "Ver tudo (N)" para a lista. Sem relatórios, explica que eles aparecem depois de uma partida. | spec 002, RN-19 |

### O relatório aberto

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-32 | O cabeçalho mostra "Relatório", o **nome** com o lápis de renomear, "Ao vivo", a **data e a hora em que a partida foi iniciada** e **"Organizado por {nome do criador}"**. Numa partida encerrada antes do fim, mostra também "Encerrada antes do fim". | referência visual do Kahoot |
| RN-33 | O relatório tem três abas: **Resumo**, **Participantes (N)** e **Perguntas (N)**, com N participantes (RN-08) e N perguntas jogadas (RN-09). A aba aberta faz parte do endereço: recarregar ou compartilhar o endereço consigo mesmo volta à mesma aba. | referência visual do Kahoot |
| RN-34 | O menu **"Opções de relatório"** tem **"Ver quiz"** (abre a página do quiz, RN-05) e **"Mover para a lixeira"**. | referência visual do Kahoot |

### Resumo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-35 | O primeiro cartão mostra o **percentual geral** num anel ("38% correto"), uma **frase** conforme o resultado e o botão **"Jogar de novo"** (RN-48). As frases: com 80% ou mais, "Excelente resultado!"; de 50% a 79%, "Bom trabalho!"; abaixo de 50%, "A prática leva à perfeição!". Abaixo dela, um texto curto convidando a jogar de novo. Sem nenhuma pergunta jogada, o cartão diz que a partida acabou antes da primeira revelação. | referência visual do Kahoot · faixas: decisão do produto (2026-10-06) |
| RN-36 | O segundo cartão mostra os totais: **Participantes**, **Perguntas** (as jogadas; "7 de 15" quando a partida foi encerrada antes do fim) e **Tempo** (RN-21). | referência visual do Kahoot |
| RN-37 | **"Perguntas difíceis (N)"** mostra a mais difícil delas (a de menor percentual; no empate, a que foi jogada primeiro): o número e o tipo, o enunciado, a imagem, o percentual de acertos e o tempo médio de resposta. Com mais de uma, o link **"Ver tudo (N)"** abre a aba Perguntas em "Perguntas difíceis". Sem nenhuma, o cartão diz "Nenhuma pergunta foi difícil para o grupo". O "?" do título explica a regra dos 35%. | referência visual do Kahoot |
| RN-38 | **"Ajuda necessária (N)"** mostra os participantes da RN-18, do menor percentual para o maior, com o apelido e o percentual; até cinco no cartão, e o título leva à aba Participantes em "Ajuda necessária". **Todos aparecem, sem nada borrado.** Sem nenhum, "Ninguém precisou de ajuda". O "?" explica a regra. | referência visual do Kahoot · constituição (sem paywall) |
| RN-39 | **"Não concluiu (N)"** mostra os participantes da RN-19, com o apelido e quantas perguntas ficaram sem resposta, de quem deixou mais para quem deixou menos; até cinco no cartão. Sem nenhum, "Excelente! Todos concluíram". O "?" explica a regra. | referência visual do Kahoot |

### Participantes

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-40 | A aba tem duas listas: **"Todos (N)"** e **"Ajuda necessária (N)"**. As colunas são **Apelido**, **Classificação**, **Respostas corretas** (anel e percentual), **Não respondido** (o número de perguntas, ou "—" quando nenhuma) e **Pontuação final**. "Todos" vem pela classificação; "Ajuda necessária", do menor percentual para o maior. | referência visual do Kahoot |
| RN-41 | As listas mostram **10 linhas** e "Mostrar mais" traz as outras. | referência visual do Kahoot |
| RN-42 | Acionar um participante abre o **detalhe dele**: o apelido, a classificação, a pontuação final e o percentual, e uma linha por pergunta dele (RN-10), na ordem em que foram jogadas, com o número e o enunciado, **o que ele respondeu** (a forma e o texto de cada alternativa marcada, ou "Sem resposta"), se foi **correta, parcialmente correta ou incorreta**, os **pontos** e o **tempo de resposta**. Dali se volta à lista. | kahoot-reference §10.2 |

### Perguntas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-43 | A aba tem duas listas: **"Todos (N)"** e **"Perguntas difíceis (N)"**, na ordem em que as perguntas foram jogadas (a ordem daquela partida, spec 012, RN-09). As colunas são o **número**, a **Pergunta**, o **Tipo** ("Quiz", "Verdadeiro ou falso") e **Respostas corretas** (anel e percentual). Mostram 10 linhas e "Mostrar mais", e têm uma **pesquisa pelo enunciado**. | referência visual do Kahoot |
| RN-44 | Acionar uma pergunta abre o **detalhe dela**: o enunciado e a imagem; o percentual de acertos, o tempo médio de resposta e quantos não responderam; **cada alternativa** como foi mostrada na partida (forma, cor e texto), com a marca de correta e **quantos participantes a escolheram**; e a lista dos participantes que podiam respondê-la, cada um com o que respondeu, se acertou, os pontos e o tempo. Dali se volta à lista. | kahoot-reference §10.3 |

### Renomear, jogar de novo e lixeira

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-45 | O **nome do relatório** começa igual ao título do quiz no momento da partida (spec 008). **Renomear** (pelo lápis do cabeçalho ou pelo menu da linha) muda só o nome do relatório: o quiz e os outros relatórios não mudam. | referência visual do Kahoot |
| RN-46 | O nome tem de **1 a 95 caracteres**, contados como no título do quiz (spec 001), sem os espaços das pontas. Nome vazio ou longo demais não é aceito, e o motivo aparece no campo. | spec 001 (limite do título) |
| RN-47 | Se a mudança de nome falhar, o nome anterior continua valendo e um aviso diz que não foi possível renomear. | decisão do produto (2026-10-06) |
| RN-48 | **"Jogar de novo"** cria uma partida nova do mesmo quiz, na versão jogável **atual** dele, com outro PIN e sem jogadores, e leva o criador ao lobby (spec 011, RN-15). A ação só aparece quando o quiz existe, está fora da lixeira e tem versão jogável. | referência visual do Kahoot · spec 011, RN-15 |
| RN-49 | No **pódio**, a tela do anfitrião ganha a ação **"Ver relatório"**, que abre o relatório daquela partida. Altera a spec 011, que deixava o relatório de fora do fim do jogo. A "Classificação" do pódio (spec 011, RN-14) continua. | kahoot-reference §10 · spec 011 |
| RN-50 | **"Mover para a lixeira"** tira o relatório da lista e do cartão da página inicial e o põe na seção **Lixeira**. Um aviso confirma, com **"Desfazer"**, como na biblioteca (spec 001). | referência visual do Kahoot · decisão do usuário (2026-10-06) |
| RN-51 | Um relatório na lixeira **não pode ser aberto nem renomeado**: as ações são **"Restaurar"** e **"Excluir definitivamente"**. O endereço dele mostra que o relatório está na lixeira e oferece Restaurar. | spec 001, RN-22 |
| RN-52 | A lixeira **não expira**. **Restaurar** devolve o relatório à lista, intacto. | kahoot-reference §11.1 · spec 001, RN-23 |
| RN-53 | **Excluir definitivamente** só é feito a partir da lixeira, pede confirmação explícita e é irreversível: a partida, os participantes e as respostas dela deixam de existir. O quiz não é afetado. | spec 001, RN-24 |

### Apresentação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-54 | As telas de relatório são da área do criador: **tema claro**, dentro da navegação principal, e não as telas escuras do jogo. Funcionam em telas estreitas: as tabelas viram listas, sem rolagem horizontal da página. | spec 002 · constituição, artigo VIII |
| RN-55 | Todo anel de percentual tem o **número ao lado**, e nenhuma informação depende só da cor: correta, parcialmente correta, incorreta e sem resposta têm texto ou ícone. As alternativas usam a forma e a cor da partida. | constituição, artigo VIII |
| RN-56 | Cada tela tem os estados de **carregando**, **erro** (com "Tentar novamente") e **vazio**. Datas e horas aparecem no fuso do aparelho, no formato "13 de jun. de 2026, 17:45". | spec 001 · decisão do produto (2026-10-06) |

## Critérios de aceite

### O que vira relatório

#### CA-01 — Partida que foi até o pódio

- **Dado** uma partida de três perguntas com dois jogadores, jogada até o pódio
- **Quando** o criador abre Relatórios
- **Então** a partida aparece no topo da lista, com o título do quiz, "3 perguntas", "Ao vivo", 2 participantes, o percentual geral e a data em que acabou

#### CA-02 — Partida encerrada no meio

- **Dado** uma partida de cinco perguntas em que o anfitrião acionou "Encerrar agora" durante as respostas da terceira pergunta
- **Quando** o criador abre o relatório dela
- **Então** vê "Encerrada antes do fim", "Perguntas (2)" e, no Resumo, "2 de 5"
- **E** os percentuais consideram só as duas primeiras perguntas

#### CA-03 — Encerrada sem nenhuma revelação

- **Dado** uma partida encerrada durante as respostas da primeira pergunta
- **Quando** o criador a vê na lista e a abre
- **Então** a linha mostra "—" em respostas corretas
- **E** o Resumo diz que a partida acabou antes da primeira revelação, com os participantes contados e "Perguntas (0)"

#### CA-04 — Encerrada no lobby não gera relatório

- **Dado** uma partida com dois jogadores no lobby
- **Quando** o anfitrião a encerra sem iniciar
- **Então** ela não aparece em Relatórios

#### CA-05 — Partida em andamento ainda não aparece

- **Dado** uma partida na segunda pergunta
- **Quando** o criador abre Relatórios em outra aba
- **Então** a partida não está na lista
- **E** depois que ela chega ao pódio, aparece

#### CA-06 — Relatório de outro criador

- **Dado** o endereço do relatório de uma partida organizada por outro criador
- **Quando** o criador o abre
- **Então** vê "não encontrado", como para um endereço que nunca existiu

#### CA-05a — Cada partida do mesmo quiz tem o seu relatório

- **Dado** o quiz "Capitais", com o relatório de uma partida jogada ontem por Ana e Bia
- **Quando** o criador joga o mesmo quiz hoje, com Caio e Dani, até o pódio
- **Então** a lista mostra dois relatórios chamados "Capitais", o de hoje primeiro, cada um com a sua data, os seus participantes e o seu percentual
- **E** o relatório de ontem continua com Ana e Bia e os mesmos números
- **E** renomear ou mandar para a lixeira um deles não muda o outro

### As contas

#### CA-07 — Percentual geral

- **Dado** uma partida de 4 perguntas com 2 participantes, em que Ana acertou 3 e errou 1, e Bia acertou 1, errou 1 e não respondeu 2
- **Quando** o criador abre o Resumo
- **Então** vê "50% correto" (4 de 8)

#### CA-08 — Percentual do participante e não respondidas

- **Dado** a partida do CA-07
- **Quando** o criador abre Participantes
- **Então** Ana aparece com 75% e "—" em Não respondido
- **E** Bia, com 25% e 2 em Não respondido

#### CA-09 — Quem entrou atrasado

- **Dado** uma partida de 4 perguntas em que Caio entrou durante as respostas da segunda e acertou a terceira e a quarta
- **Quando** o criador abre Participantes
- **Então** Caio aparece com 100% e "—" em Não respondido
- **E** o detalhe dele mostra só as perguntas 3 e 4
- **E** o percentual das perguntas 1 e 2 não conta Caio entre os que podiam responder

#### CA-10 — Resposta parcialmente correta

- **Dado** uma pergunta de múltipla escolha com duas alternativas corretas, em que Ana marcou só uma delas
- **Quando** o criador abre o detalhe de Ana
- **Então** a pergunta aparece como "Parcialmente correta", com os pontos que rendeu
- **E** ela não conta como acerto no percentual de Ana nem no da pergunta

#### CA-11 — Limite da pergunta difícil

- **Dado** uma partida com 20 participantes, em que a pergunta 1 foi acertada por 6 (30%), a pergunta 2 por 7 (35%) e a pergunta 3 por 8 (40%)
- **Quando** o criador abre a aba Perguntas em "Perguntas difíceis"
- **Então** vê só a pergunta 1

#### CA-12 — Limite da ajuda necessária

- **Dado** uma partida de 20 perguntas, em que Ana acertou 6 (30%), Bia acertou 7 (35%) e Caio acertou 14
- **Quando** o criador abre Participantes em "Ajuda necessária"
- **Então** vê só Ana

#### CA-13 — Não concluiu

- **Dado** uma partida em que Bia deixou duas perguntas sem resposta e os outros responderam todas
- **Quando** o criador abre o Resumo
- **Então** "Não concluiu (1)" mostra Bia, com 2 perguntas sem resposta
- **E** numa partida em que todos responderam tudo, o cartão diz "Excelente! Todos concluíram"

#### CA-14 — Jogador removido no lobby

- **Dado** uma partida em que Dani foi removida no lobby e outros dois jogadores jogaram
- **Quando** o criador abre o relatório
- **Então** vê 2 participantes, e Dani não aparece em nenhuma lista

#### CA-15 — Tempo da partida

- **Dado** uma partida iniciada às 17:45:10 que chegou ao pódio às 17:56:40
- **Quando** o criador abre o Resumo
- **Então** vê "Tempo 11 min"
- **E** numa partida que durou 40 segundos, "menos de 1 min"

### A lista

#### CA-16 — Navegação principal

- **Dado** o criador em qualquer tela da área dele
- **Quando** ele aciona Relatórios na navegação principal
- **Então** a área de relatórios abre, com as abas Relatórios e Lixeira, e o item fica destacado

#### CA-17 — Ordem

- **Dado** três partidas que acabaram ontem, hoje de manhã e agora
- **Quando** o criador abre Relatórios
- **Então** elas aparecem nessa ordem invertida: a de agora primeiro

#### CA-18 — Lista vazia

- **Dado** um criador que nunca organizou uma partida
- **Quando** ele abre Relatórios
- **Então** vê a explicação de que os relatórios aparecem depois de uma partida ao vivo e o caminho para a Biblioteca

#### CA-19 — Pesquisa

- **Dado** os relatórios "Capitais", "História do Brasil" e "Química"
- **Quando** o criador pesquisa "quimica"
- **Então** vê só "Química"
- **E** pesquisando "xyz", vê que nada foi encontrado para "xyz"

#### CA-20 — Mostrar mais

- **Dado** um criador com 25 relatórios
- **Quando** ele abre Relatórios
- **Então** vê 20 e o link "Mostrar mais"
- **E** ao acioná-lo, vê os 25 e o link some

#### CA-21 — Cartão da página inicial

- **Dado** um criador com relatórios
- **Quando** ele abre a página inicial
- **Então** o cartão "Relatórios mais recentes" mostra os mais recentes, com nome, data e percentual, e "Ver tudo (N)"
- **E** acionar um deles abre o relatório
- **E** para um criador sem relatórios, o cartão explica que eles aparecem depois de uma partida, sem "Em breve"

### O relatório aberto

#### CA-22 — Cabeçalho e abas

- **Dado** o relatório de uma partida de 15 perguntas com 25 participantes
- **Quando** o criador o abre
- **Então** vê "Relatório", o nome, "Ao vivo", a data e a hora do início e "Organizado por" com o nome dele
- **E** as abas Resumo, Participantes (25) e Perguntas (15), com o Resumo aberto

#### CA-23 — A aba fica no endereço

- **Dado** o relatório aberto na aba Perguntas
- **Quando** o criador recarrega a página
- **Então** continua na aba Perguntas

#### CA-24 — Resumo

- **Dado** uma partida com percentual geral de 38%, 6 perguntas difíceis e 11 participantes abaixo de 35%
- **Quando** o criador abre o Resumo
- **Então** vê o anel com "38% correto", a frase "A prática leva à perfeição!" e "Jogar de novo"
- **E** "Perguntas difíceis (6)" com a pergunta de menor percentual (enunciado, imagem, percentual e tempo médio) e "Ver tudo (6)"
- **E** "Ajuda necessária (11)" com os cinco de menor percentual, todos legíveis

#### CA-25 — Frases do resumo

- **Dado** partidas com percentual geral de 85%, 60% e 20%
- **Quando** o criador abre o Resumo de cada uma
- **Então** vê "Excelente resultado!", "Bom trabalho!" e "A prática leva à perfeição!"

#### CA-26 — Dos cartões para as abas

- **Dado** o Resumo de uma partida com perguntas difíceis e participantes que precisam de ajuda
- **Quando** o criador aciona "Ver tudo" em Perguntas difíceis
- **Então** a aba Perguntas abre em "Perguntas difíceis"
- **E** acionando o título de "Ajuda necessária", a aba Participantes abre em "Ajuda necessária"

#### CA-27 — Nada difícil, ninguém precisando de ajuda

- **Dado** uma partida em que toda pergunta foi acertada por mais da metade e todo participante acertou mais da metade
- **Quando** o criador abre o Resumo
- **Então** vê "Perguntas difíceis (0)" com "Nenhuma pergunta foi difícil para o grupo" e "Ajuda necessária (0)" com "Ninguém precisou de ajuda"

#### CA-28 — Lista de participantes

- **Dado** uma partida com 25 participantes
- **Quando** o criador abre a aba Participantes
- **Então** vê os dez primeiros da classificação, cada um com apelido, classificação, percentual, não respondido e pontuação final, e "Mostrar mais"
- **E** ao acioná-lo, vê os 25

#### CA-29 — Detalhe do participante

- **Dado** Ana, que acertou a pergunta 1 em 3,2 s com 893 pontos, errou a 2 e não respondeu a 3
- **Quando** o criador aciona Ana na lista
- **Então** vê as três perguntas em ordem: a 1 com a alternativa que ela marcou, "Correta", 893 pontos e 3,2 s; a 2 com a alternativa marcada, "Incorreta" e 0 pontos; a 3 com "Sem resposta" e 0 pontos
- **E** consegue voltar à lista

#### CA-30 — Lista de perguntas

- **Dado** uma partida de 15 perguntas, jogada em ordem aleatória
- **Quando** o criador abre a aba Perguntas
- **Então** vê as dez primeiras **na ordem em que foram jogadas**, cada uma com número, enunciado, tipo e percentual, e "Mostrar mais"
- **E** pesquisando uma palavra do enunciado, vê só as perguntas que a contêm

#### CA-31 — Detalhe da pergunta

- **Dado** uma pergunta Quiz de quatro alternativas, em que 5 escolheram a correta, 12 uma errada, 3 outra errada, ninguém a quarta e 2 não responderam
- **Quando** o criador aciona a pergunta
- **Então** vê o enunciado, a imagem, o percentual de acertos, o tempo médio de resposta e "2 não responderam"
- **E** as quatro alternativas com forma, cor e texto, a correta marcada, e as contagens 5, 12, 3 e 0
- **E** a lista dos 22 participantes, cada um com o que respondeu, se acertou, os pontos e o tempo

#### CA-32 — O relatório não muda com o quiz

- **Dado** o relatório de uma partida
- **Quando** o criador edita o enunciado de uma pergunta do quiz e salva uma nova versão
- **Então** o relatório continua mostrando o enunciado como foi jogado

### Renomear

#### CA-33 — Renomear pelo cabeçalho

- **Dado** o relatório "Capitais" aberto
- **Quando** o criador aciona o lápis, troca o nome para "Capitais — Turma A" e confirma
- **Então** o cabeçalho e a lista mostram "Capitais — Turma A"
- **E** o quiz continua se chamando "Capitais"

#### CA-34 — Nome inválido

- **Dado** o campo de renomear aberto
- **Quando** o criador apaga o nome, ou digita 96 caracteres, e tenta confirmar
- **Então** o nome não muda e o campo diz o motivo

#### CA-35 — Falha ao renomear

- **Dado** o campo de renomear com um nome válido
- **Quando** a mudança não chega ao servidor
- **Então** o nome anterior continua na tela, com o aviso de que não foi possível renomear

### Jogar de novo e pódio

#### CA-36 — Jogar de novo

- **Dado** o relatório de uma partida de um quiz publicado
- **Quando** o criador aciona "Jogar de novo"
- **Então** chega ao lobby de uma partida nova desse quiz, com outro PIN e sem jogadores

#### CA-37 — Quiz excluído de vez

- **Dado** o relatório de uma partida
- **Quando** o criador exclui o quiz definitivamente e abre Relatórios
- **Então** o relatório continua na lista, com a imagem padrão no lugar da capa
- **E** aberto, mostra os mesmos números e textos, as perguntas sem imagem, e não oferece "Jogar de novo" nem "Ver quiz"

#### CA-38 — Quiz na lixeira

- **Dado** o relatório de uma partida de um quiz que foi para a lixeira
- **Quando** o criador abre o relatório
- **Então** "Jogar de novo" e "Ver quiz" não aparecem
- **E** restaurado o quiz, voltam a aparecer

#### CA-39 — Do pódio ao relatório

- **Dado** o anfitrião no pódio de uma partida
- **Quando** ele aciona "Ver relatório"
- **Então** o relatório daquela partida abre

### Lixeira

#### CA-40 — Mover para a lixeira

- **Dado** o relatório "Capitais" na lista
- **Quando** o criador aciona "Mover para a lixeira" no menu da linha
- **Então** ele sai da lista e do cartão da página inicial e aparece na seção Lixeira
- **E** o aviso oferece "Desfazer", que o devolve à lista

#### CA-41 — Vários de uma vez

- **Dado** cinco relatórios na lista
- **Quando** o criador marca três e aciona "Mover para a lixeira"
- **Então** os três vão para a Lixeira e os outros dois ficam
- **E** a caixa do cabeçalho marca e desmarca todas as linhas mostradas

#### CA-42 — Restaurar

- **Dado** um relatório na Lixeira
- **Quando** o criador aciona "Restaurar"
- **Então** ele volta à lista, na posição da data dele, com tudo o que tinha

#### CA-43 — Excluir definitivamente

- **Dado** um relatório na Lixeira
- **Quando** o criador aciona "Excluir definitivamente" e confirma
- **Então** ele some da Lixeira e o endereço dele passa a responder "não encontrado"
- **E** cancelando a confirmação, nada muda
- **E** o quiz e os outros relatórios continuam como estavam

#### CA-44 — Relatório na lixeira não abre

- **Dado** um relatório na Lixeira
- **Quando** o criador abre o endereço dele
- **Então** vê que o relatório está na lixeira, com a ação Restaurar, e não os dados

### Apresentação

#### CA-45 — Tela estreita

- **Dado** o criador num celular
- **Quando** ele abre a lista, o Resumo, a aba Participantes e a aba Perguntas
- **Então** tudo cabe na largura da tela, sem rolagem horizontal da página, e as mesmas informações estão lá

#### CA-46 — Sem depender de cor

- **Dado** o detalhe de um participante com uma resposta correta, uma incorreta e uma sem resposta
- **Quando** o criador o lê com um leitor de tela, ou sem distinguir as cores
- **Então** cada resultado é dito em texto, e cada percentual tem o seu número

#### CA-47 — Erro ao carregar

- **Dado** que a lista ou um relatório não pôde ser carregado
- **Quando** o criador abre a tela
- **Então** vê que não foi possível carregar, com "Tentar novamente", que carrega de novo

## Experiência (telas e estados)

Todas as telas ficam dentro da navegação principal, no tema claro.

- **Relatórios (lista)**: as abas **Relatórios** e **Lixeira**; a pesquisa pelo nome; a tabela com caixa de seleção, capa com o número de perguntas, nome e "Ao vivo" (mais "Encerrada antes do fim", quando for o caso), participantes, anel com o percentual, data de término e o menu da linha. Com linhas marcadas, a ação para as selecionadas aparece acima da tabela. Em telas estreitas, cada linha vira um cartão com as mesmas informações.
  - *Vazio*: explicação e caminho para a Biblioteca. *Pesquisa sem resultado*: "Nada encontrado para …". *Carregando*: linhas de espera. *Erro*: aviso com "Tentar novamente".
- **Lixeira**: a mesma tabela, com "Restaurar" e "Excluir definitivamente" na linha e para as selecionadas. A confirmação de excluir diz que a partida e as respostas dela serão apagadas e que isso não pode ser desfeito. *Vazia*: "A lixeira está vazia".
- **Relatório**: o cabeçalho (RN-32) com o menu "Opções de relatório", e as abas.
  - **Resumo**: o cartão do percentual com a frase e "Jogar de novo"; o cartão dos totais; e a fileira "Perguntas difíceis", "Ajuda necessária" e "Não concluiu", cada um com o "?" que explica a regra. Em telas estreitas, os cartões ficam um embaixo do outro.
  - **Participantes**: "Todos" e "Ajuda necessária"; a tabela; "Mostrar mais". O **detalhe do participante** abre sobre a aba, com os totais dele no alto e uma linha por pergunta.
  - **Perguntas**: "Todos" e "Perguntas difíceis"; a pesquisa; a tabela; "Mostrar mais". O **detalhe da pergunta** abre sobre a aba, com o enunciado e a imagem, os números, as alternativas com as contagens e a lista de quem respondeu o quê.
- **Renomear**: o nome vira um campo no lugar, com confirmar e cancelar; pelo menu da lista, um diálogo com o mesmo campo.
- **Página inicial**: o cartão "Relatórios mais recentes" com os relatórios e "Ver tudo (N)".
- **Pódio**: a ação "Ver relatório" junto de "Jogar novamente", "Classificação" e "Voltar ao quiz".

## Divergências intencionais do Kahoot

- **Nada borrado nem "Faça upgrade"** (RN-38): a lista de "Ajuda necessária" aparece inteira. O Quizio não tem paywall.
- **Sem a aba Feedback**: não há pesquisa de feedback ao fim da partida.
- **Sem a coluna "Apresenta"** na lista: o relatório é sempre de quem está vendo. O nome aparece em "Organizado por", dentro do relatório.
- **Partida encerrada no meio é marcada como tal** (RN-25), com a data em que acabou; o Kahoot mostra "Nenhuma" na data e "?" no percentual.
- **Quem entrou atrasado não é cobrado pelo que perdeu** (RN-10): o Kahoot não documenta como conta essas perguntas; aqui elas não entram no percentual do jogador.
- **Parcialmente correta não é acerto no percentual** (RN-11): o Kahoot não documenta o caso.
- **Frases do resumo em três faixas** (RN-35): só a frase da faixa mais baixa foi vista no Kahoot; as outras duas são nossas.
- **Sem "Filtros"**, **"Outros relatórios"**, **"Visualização expandida"**, **"Ver pódio"** e **"Compartilhar pódio"**.
- **As imagens somem com o quiz** (RN-06): no Kahoot o relatório é independente também nas imagens. Aqui elas pertencem ao quiz, e guardá-las por relatório fica para quando fizer falta.

## Fora de escopo

- **Baixar o relatório** (planilha XLSX), **imprimir** e salvar no Google Drive: spec própria.
- **Criar um quiz só com as perguntas difíceis**.
- **Ver pódio** e **compartilhar pódio** a partir do relatório.
- **Feedback** dos participantes ao fim da partida e a aba dele.
- **Filtros** da lista, ordenar as tabelas pelas colunas e a visualização expandida das perguntas.
- **Combinar relatórios** de várias partidas pelo identificador do jogador, e qualquer relatório para o jogador.
- Relatórios de **atribuições** e de jogo solo (spec 019).
- Guardar as imagens junto do relatório depois que o quiz é excluído.
- Expiração automática da lixeira.

## Perguntas em aberto

Decisões tomadas sem consulta prévia; todas podem ser revistas antes do plano:

- [ ] **Quem entrou atrasado** (RN-10) — as perguntas anteriores à entrada não contam para ele. A alternativa é contá-las como não respondidas, o que o poria em "Ajuda necessária" e em "Não concluiu" sem ter errado nada.
- [ ] **Parcialmente correta** (RN-11) — não conta como acerto. A alternativa é contar como acerto, como já acontece na sequência (spec 010, RN-10).
- [ ] **Frases do resumo** (RN-35) — três faixas, com textos nossos nas duas de cima. Se você tiver visto as outras frases no Kahoot, usamos as dele.
- [ ] **Detalhes do participante e da pergunta** (RN-42, RN-44) — não vieram capturas dessas duas telas; foram escritas a partir da referência (§10.2, §10.3). Com as capturas, o desenho segue o Kahoot.
- [ ] **Imagens depois do quiz excluído** (RN-06) — o relatório fica sem elas. A alternativa é o relatório segurar as imagens, o que impede o quiz excluído de liberar o espaço.
- [ ] **"Ver relatório" no pódio** (RN-49) — acrescentado por ser o caminho natural logo depois do jogo.

## Changelog

- 2026-10-06 — spec entregue. Os detalhes do participante e da pergunta (RN-42, RN-44) abrem num painel lateral sobre a aba; "Ver relatório" no pódio é um botão como os outros do fim do jogo.
- 2026-10-06 — a pedido do usuário, ficou explícito que cada partida do mesmo quiz gera o seu próprio relatório (RN-01, CA-05a).
- 2026-10-06 — spec criada, com as capturas da área de relatórios do Kahoot enviadas pelo usuário (lista, menu da linha, Resumo, explicações dos três cartões, Participantes, Perguntas, Feedback e "Opções de relatório"). Decisões do usuário: toda partida iniciada vira relatório; os relatórios ficam quando o quiz é excluído de vez; lixeira como no Kahoot; renomear entra; Feedback, "Ver pódio", o quiz com as perguntas difíceis e o download ficam de fora.
