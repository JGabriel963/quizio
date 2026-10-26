---
id: "038"
title: Grupos 5/5 — Atribuições no grupo
status: done # draft | approved | planned | in-progress | done
contexts: [groups, game, reports, library]
created: 2026-10-26
---

# 038 — Grupos 5/5 — Atribuições no grupo

## Contexto e problema

A spec 029 criou a **atribuição (`Assignment`)**: um quiz que cada participante joga no próprio ritmo até um prazo, compartilhado por link, PIN ou QR. As specs 034 e 035 criaram os grupos, mas o grupo ainda não serve para isso: "Atribuir" está "Em breve" na caixa "Publicar algo", no cartão "Configurar seu grupo" e na aba Atribuições; "Atribuir a grupos", no diálogo de compartilhar da atribuição, também. A chave "Os membros podem criar atividades" (spec 035) está guardada sem efeito.

O usuário mandou as capturas do fluxo no Kahoot em 2026-10-26:

1. a página do grupo com **"Atribuir"** na caixa "Publicar algo" e no cartão "Configurar seu grupo";
2. **"Selecionar kahoot"**: "Pesquisar kahoots" e a lista dos kahoots do usuário (capa, número de perguntas, título, descrição, dono, visibilidade, "há 7 horas") e **Fechar**;
3. **"Configurações da atividade atribuída"**: data e hora do prazo, **Opções** (Timer da pergunta, Ordem aleatória de respostas, Gerador de apelido, Personagens, cada uma com a ajuda ?), "Limite de participantes: 40", **"Adicionar mensagem"**, **"Atribuir agora"** e **Fechar**;
4. o mural depois de atribuir: **"{nome} atribuiu um kahoot"**, a data ("26 de outubro às 15:01"), o menu ⋮, o cartão do kahoot com **Iniciar**, **"0 curtidas"** e **"Curtir"**; no cartão "Configurar seu grupo", "Criar publicação" aparece feito;
5. **"Criar publicação"**, aberto por "Adicionar mensagem": "Digite seu texto" com o contador de 500, o kahoot com o X, **Cancelar** e **Publicar**;
6. o mural com duas atribuições, uma delas com a mensagem "TESTE";
7. o mesmo mural visto por um **membro**: sem "Atribuir" e sem ⋮;
8. **Iniciar** abre uma aba nova com a capa da atividade e, depois, a tela de apelido de sempre ("Atividade por…", "Aberto por 2 dias", "Insira um apelido");
9. a aba **Atribuições**: **"Atribuir"**, a troca entre cartões e lista, **"Kahoots"**, **"Classificar por: Mais recentes"** e os cartões ("Kahoot", "⏱ 3 dias", capa, título, ⋮, quem atribuiu); vista pelo membro, sem "Atribuir" e sem ⋮; e a **lista**, com Título, Atribuído por, Prazo e Atribuído ("há 3 minutos");
10. o **⋮** da publicação, visto pelo administrador que atribuiu: **"Excluir publicação"**, em vermelho, com a lixeira;
11. a publicação de uma atribuição **encerrada** no relatório: **"{nome} compartilhou um arquivo"**, a mensagem "TESTE", no lugar do cartão o quadro tracejado **"{nome} excluiu o anexo da publicação"**, **"1 curtida"** e o botão **"Curtida"** destacado;
12. fora do grupo, o diálogo **"Compartilhe com os participantes"** com **"Adicionar participantes"** → **"Atribuir a grupos"** e **"Atribuir por e-mail"**, pagos no Kahoot.

As capturas 1 a 9 e 12 vieram juntas; a 11 veio durante a escrita desta spec, e a 10 depois da aprovação.

Observações do usuário: atribuir no grupo **já é uma publicação**; quem joga **entra com apelido**, como em qualquer atribuição, só muda o caminho até ela; "Adicionar mensagem" troca o diálogo por "Criar publicação", e Cancelar fecha tudo; o **relatório é o de sempre**, sem menção ao grupo; e o que acontece depois de "Atribuir a grupos" não pôde ser visto, porque exige plano pago.

Esta é a etapa 5 das 5 de Grupos, entregue antes da 036 (Atividade) e da 037 (Compartilhado), por decisão do usuário. Por isso ela cria o **mural**, só com publicações de atribuição; a 036 acrescenta as publicações de texto.

## Objetivo

Quem pode atribuir escolhe um quiz, define o prazo e as opções, escreve uma mensagem se quiser, e a atividade aparece no mural e na aba Atribuições do grupo. Os membros a abrem com **Iniciar** e jogam como em qualquer atribuição; curtem a publicação; e o criador de uma atribuição feita fora do grupo pode mandá-la para os seus grupos.

## Personas

- **Administrador (`GroupRole` `admin`)**: sempre pode atribuir; remove qualquer atribuição do grupo.
- **Membro (`GroupRole` `member`)**: vê, inicia e curte as atribuições; atribui só quando "Os membros podem criar atividades" está ligada.
- **Participante**: quem joga a atividade, com apelido e sem conta (spec 030). Pode ser membro do grupo ou qualquer pessoa com o link.

## Histórias de usuário

- **HU-01**: Como administrador, quero atribuir um quiz ao grupo, para que todos os membros o vejam e joguem até o prazo.
- **HU-02**: Como quem atribui, quero escrever uma mensagem junto, para explicar a atividade.
- **HU-03**: Como membro, quero ver as atividades no mural e na aba Atribuições e abri-las com um clique, para jogar sem procurar link ou PIN.
- **HU-04**: Como membro, quero curtir uma atividade, para reagir a ela.
- **HU-05**: Como quem atribuiu, quero abrir o relatório e tirar a atividade do grupo, para acompanhar e corrigir um engano.
- **HU-06**: Como criador, quero mandar para os meus grupos uma atribuição criada fora deles, para não ter de criá-la de novo.
- **HU-07**: Como administrador, quero que a chave "Os membros podem criar atividades" deixe os membros atribuírem, para dividir a tarefa.

## Regras de negócio

### Quem atribui

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Pode **atribuir no grupo** o **administrador** e, quando "Os membros podem criar atividades" está ligada, **qualquer membro**. Para os demais, nenhum "Atribuir" aparece, e o servidor recusa o pedido. A chave passa a ter efeito (spec 035, RN-16). | capturas 1 e 7 · spec 035, RN-07 |
| RN-02 | "Atribuir" aparece em três lugares, todos com o mesmo fluxo: a caixa **"Publicar algo"**, o passo **"Atribuir"** do cartão "Configurar seu grupo" (que continua só do administrador) e o botão **"Atribuir"** da aba Atribuições. Na caixa, "Criar publicação" e "Compart." continuam "Em breve" (specs 036 e 037). | capturas 1 e 9 · spec 034, RN-15, RN-17 |
| RN-03 | Uma atribuição feita no grupo é uma **atribuição comum** (spec 029): da pessoa que atribuiu, com a versão jogável e o título do quiz no momento, o prazo, as opções, o PIN de 8 dígitos e o link; aparece nos **relatórios** dela como qualquer outra, **sem menção ao grupo**; é jogada como na spec 030, com apelido e sem conta. | observações do usuário (2026-10-26) · spec 029, RN-01, RN-04, RN-27 · spec 030 |

### Selecionar o quiz

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | "Atribuir" abre **"Selecionar kahoot"**: o campo **"Pesquisar kahoots"** e a lista dos quizzes **da própria pessoa** que podem ser jogados (publicados e fora da lixeira, spec 029, RN-03), dos editados por último para os mais antigos. Cada linha mostra a capa (ou a capa padrão) com "N perguntas", o título, a primeira linha da descrição, o nome do dono, a visibilidade e "há {tempo}" desde a última edição. **Fechar** fecha sem nada criado. | captura 2 · spec 029, RN-03 |
| RN-05 | A pesquisa filtra pelo título, sem diferenciar maiúsculas, minúsculas e acentos. Sem quizzes jogáveis, a lista diz "Você ainda não tem quizzes salvos para atribuir." e oferece **"Ir para a biblioteca"**; sem resultado na pesquisa, "Nenhum quiz encontrado.". Rascunhos nunca salvos não aparecem. | captura 2 · spec 001 (pesquisa) · decisão do produto (2026-10-26) |
| RN-06 | Escolher um quiz troca o diálogo por "Configurações da atividade atribuída". | captura 3 |

### Configurações da atividade atribuída

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | **"Configurações da atividade atribuída"** tem a **data** e a **hora** do prazo, cada uma num seletor, e **"Opções"**: **Timer da pergunta**, **Ordem aleatória de respostas**, **Gerador de apelido** e **Personagens**, nesta ordem, cada uma com a chave e a ajuda (?) com a explicação da spec 029 (RN-11). Embaixo, **"Adicionar mensagem"**, **"Atribuir agora"** e **Fechar**. | captura 3 · spec 029, RN-11 |
| RN-08 | O prazo segue as regras da spec 029: obrigatório, em hora cheia, padrão **daqui a 3 dias às 12:00**, depois de agora e até 28 dias à frente (a configuração da instância). As opções também: Gerador de apelido "Em breve" e indisponível, os mesmos padrões, e as escolhas **ficam guardadas para quem atribui**, as mesmas de quando atribui fora do grupo. | captura 3 · spec 029, RN-07, RN-08, RN-12 a RN-15 |
| RN-09 | **Não há "Limite de participantes"** nem convite a fazer upgrade. | constituição, artigo VI · spec 029, RN-16 |
| RN-10 | **"Atribuir agora"** cria a atribuição, a publica no grupo **sem mensagem** e fecha o diálogo; a publicação aparece no topo do mural. **Fechar** fecha sem nada criado. Um prazo que passou enquanto o diálogo estava aberto é recusado como na spec 029 (RN-17), com o diálogo aberto. | captura 3 · spec 029, RN-17 |
| RN-11 | **"Adicionar mensagem"** troca o diálogo por **"Criar publicação"**: o campo **"Digite seu texto"** com o contador de **500 caracteres**, o cartão do quiz escolhido com o **X**, **Cancelar** e **Publicar**. Publicar fica indisponível enquanto o texto está vazio (só espaços conta como vazio); ele cria a atribuição com o prazo e as opções escolhidos e a publica **com a mensagem**. **Cancelar fecha tudo**, sem nada criado. O **X** volta a "Selecionar kahoot" para trocar o quiz, mantendo o prazo, as opções e o texto. | captura 5 · observação do usuário (2026-10-26) · decisão do produto (2026-10-26) |
| RN-12 | A mensagem tem de **1 a 500 caracteres** (contados com `characterCount`), sem os espaços das pontas, e guarda as quebras de linha. | captura 5 · spec 035, RN-05 |

### A publicação no mural

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | Atribuir no grupo cria uma **publicação (`GroupPost`)** do tipo **atribuição** no **mural (`GroupFeed`)** da aba Atividade. O mural mostra as publicações **das mais novas para as mais antigas**; sem nenhuma, continua o estado vazio da spec 034. | captura 4 · observação do usuário (2026-10-26) · spec 034, RN-15 |
| RN-14 | A publicação mostra o ícone e o **nome** de quem atribuiu com **"atribuiu um kahoot"**, a data ("26 de outubro às 15:01"), o **⋮** (RN-20), a **mensagem** quando há uma, e o **cartão da atividade**: capa com "N perguntas", título, nome de quem atribuiu, "há {tempo}" desde a atribuição e **Iniciar**. Embaixo, **"N curtidas"** e **"Curtir"**. | capturas 4 e 6 |
| RN-15 | **Iniciar** abre a **tela da atividade** (spec 029, RN-46; spec 030) **numa aba nova**, com a capa, o apelido e o jogo de sempre. Quem tem o link joga mesmo sem ser do grupo: o link é o da atribuição. | captura 8 · observação do usuário (2026-10-26) |
| RN-16 | Quando a atribuição **acaba** ("Encerrar agora" ou prazo vencido) ou seu relatório é **excluído para sempre**, a publicação **perde o anexo** e continua no mural: o cabeçalho passa a **"{nome} compartilhou um arquivo"**, a mensagem fica, e no lugar do cartão da atividade aparece o quadro tracejado **"{nome} excluiu o anexo da publicação"**, com o ícone de aviso; as curtidas e "Curtir" continuam. A atribuição sai da aba Atribuições (RN-23). | captura 10 (Encerrar agora) · decisão do produto (2026-10-26) para o prazo vencido e a exclusão do relatório |

### Curtir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | Todo **membro** (o administrador incluído) pode **curtir (`GroupPostLike`)** uma publicação, **uma vez**: o botão alterna entre **"Curtir"** e **"Curtida"** (destacado, quando a pessoa já curtiu); acionar "Curtida" descurte. | capturas 4, 7 e 10 · decisão do usuário (2026-10-26) |
| RN-18 | O total aparece como **"0 curtidas"**, **"1 curtida"**, **"N curtidas"**, e muda na hora para quem curtiu; os outros veem o total novo ao recarregar ou voltar à página. Curtir duas vezes ao mesmo tempo conta uma vez. | capturas 4 e 6 · spec 034 (sem tempo real) |
| RN-19 | Quem sai do grupo ou é removido continua com as curtidas que deu; elas somem só com a publicação. | decisão do produto (2026-10-26) |

### Menu ⋮

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-20 | O **⋮** da publicação e do cartão da aba Atribuições oferece, a **quem atribuiu e ao administrador**, **"Ver relatório"** (enquanto o relatório existir; continua depois que a atribuição acaba) e **"Excluir publicação"**, em vermelho, com a lixeira. Os demais não veem o ⋮. | capturas 4, 7, 9 e 10 · decisão do usuário (2026-10-26) |
| RN-20a | Quem atribuiu abre o próprio relatório, como sempre. O **administrador que não atribuiu** abre o relatório **somente para leitura**: o resumo, os participantes e as perguntas, com os detalhes, mas **sem** renomear, lixeira, excluir, alterar prazo, encerrar, compartilhar ou jogar de novo; o relatório não entra na lista de relatórios dele. O acesso vale enquanto a publicação estiver no grupo e a pessoa for administradora dele; de resto, o relatório é "não encontrado", como na spec 015. | decisão do usuário (2026-10-26) · spec 015, RN-03 |
| RN-21 | **"Excluir publicação"** pede confirmação ("Excluir a publicação?", "Ela some do mural e das atribuições do grupo, mas a atividade continua aberta para quem tem o link, até o prazo.", **Cancelar** / **Excluir**) e tira a publicação, com as curtidas, do mural e da aba. A atribuição, o relatório e o link **não mudam**. | decisão do usuário (2026-10-26) |

### Aba Atribuições

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | A aba **Atribuições** deixa de ser "Em breve": o título **"Kahoots"**, **"Atribuir"** para quem pode atribuir (RN-01), a troca entre **cartões** e **lista**, e **"Classificar por"** com **Mais recentes** (padrão), **Mais antigas** e **Prazo mais próximo**. A escolha entre cartões e lista fica lembrada no navegador. | capturas 9 a 11 · decisão do produto (2026-10-26) |
| RN-23 | A aba mostra as atribuições **abertas** do grupo, cada uma uma vez; a que acaba sai da aba (RN-16). O **cartão** mostra "Kahoot", o **tempo até o prazo** ("⏱ 3 dias", na unidade da spec 029, RN-10, sem o "em"), a capa com "N perguntas", o título, o ⋮ (RN-20) e o nome de quem atribuiu. A **lista** tem as colunas **Título** (capa e título), **Atribuído por** (o ícone de quem atribuiu, com o nome ao passar o mouse e para leitores de tela), **Prazo** ("3 dias") e **Atribuído** ("há 3 minutos"). Acionar um cartão ou uma linha faz o mesmo que Iniciar (RN-15). | capturas 10 e 11 |
| RN-24 | Sem nenhuma atribuição aberta, a aba diz "Nenhuma atividade foi atribuída a este grupo ainda." e, para quem pode atribuir, oferece **"Atribuir"**. | decisão do produto (2026-10-26) |

### Atribuir a grupos (fora do grupo)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-25 | No diálogo **"Compartilhe com os participantes"** (spec 029, RN-21), **"Adicionar participantes"** → **"Atribuir a grupos"** deixa de ser "Em breve" ("Atribuir por e-mail" continua). Ele só aparece enquanto a atribuição está aberta e só para o seu criador. | captura 10 · decisão do usuário (2026-10-26) |
| RN-26 | "Atribuir a grupos" abre a lista dos grupos onde a pessoa **pode atribuir** (RN-01), com uma marca para cada; os grupos que já têm essa atribuição aparecem marcados e indisponíveis, com "Já atribuída". A pessoa marca **um ou mais** e aciona **"Atribuir"**: a atribuição é publicada, **sem mensagem**, no mural e na aba de cada um, e aparece o aviso "Atividade atribuída a {N} grupo(s)". | decisão do usuário (2026-10-26) |
| RN-27 | Sem grupos onde possa atribuir, o diálogo diz "Você não tem grupos onde possa atribuir." e oferece **"Criar grupo"**, que leva à tela de grupos. | decisão do produto (2026-10-26) |
| RN-28 | Uma atribuição está **no máximo uma vez em cada grupo**: atribuir de novo ao mesmo grupo é recusado (ou ignorado, se vier de dois pedidos ao mesmo tempo). Atribuir de dentro do grupo cria sempre uma atribuição nova. | decisão do produto (2026-10-26) |

### Configurar seu grupo e o que acontece depois

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-29 | No cartão "Configurar seu grupo", **"Atribuir"** passa a aparecer **feito** quando o grupo tem ao menos uma atribuição, e **"Criar publicação"** quando o mural tem ao menos uma publicação (uma atribuição conta). | captura 4 · spec 034, RN-17 |
| RN-30 | **Excluir o grupo** apaga as publicações e as curtidas, mas **não as atribuições**: elas continuam abertas e nos relatórios de quem as criou. Excluir o quiz não mexe na publicação: o cartão só perde a capa, como o relatório (spec 015, RN-05). O relatório excluído para sempre é RN-16. | spec 034, pergunta em aberto · spec 015 · decisão do produto (2026-10-26) |
| RN-31 | Quem sai do grupo ou é removido **deixa as suas publicações** no grupo, com o nome; ele perde o ⋮ ali por não ser mais membro, e o administrador continua podendo excluí-las. | decisão do produto (2026-10-26) |
| RN-32 | Desligar "Os membros podem criar atividades" tira o "Atribuir" dos membros, mas **não tira** do grupo o que eles já atribuíram. | spec 035, RN-10 · decisão do produto (2026-10-26) |

## Critérios de aceite

### Atribuir no grupo

#### CA-01 — Onde está o Atribuir

- **Dado** o administrador na página do grupo
- **Então** vê "Atribuir" na caixa "Publicar algo", no cartão "Configurar seu grupo" e na aba Atribuições, todos acionáveis, e "Criar publicação" e "Compart." ainda "Em breve"
- **E** um membro, com "criar atividades" desligada, não vê "Atribuir" em nenhum lugar, e o servidor recusa uma atribuição pedida por ele
- **E** com a chave ligada, o membro vê "Atribuir" na caixa e na aba (não no cartão de configuração) e consegue atribuir

#### CA-02 — Selecionar kahoot

- **Dado** que Ana tem "Capitais" e "Geografia" salvos, um rascunho nunca salvo e um quiz na lixeira
- **Quando** aciona Atribuir
- **Então** vê "Selecionar kahoot" com "Capitais" e "Geografia", do editado por último ao mais antigo, com capa, "N perguntas", título, dono, visibilidade e "há {tempo}"
- **E** pesquisar "CAPITAIS" deixa só "Capitais"; "xyz" mostra "Nenhum quiz encontrado."
- **E** Fechar fecha sem nada criado

#### CA-03 — Sem quizzes

- **Dado** que Bruno não tem quizzes salvos
- **Quando** aciona Atribuir
- **Então** vê "Você ainda não tem quizzes salvos para atribuir." e "Ir para a biblioteca"

#### CA-04 — Configurações da atividade

- **Dado** "Capitais" escolhido
- **Então** vê "Configurações da atividade atribuída" com a data e a hora de daqui a 3 dias às 12:00, Timer da pergunta, Ordem aleatória de respostas, Gerador de apelido ("Em breve", indisponível) e Personagens, com as escolhas da última atribuição de Ana
- **E** não vê limite de participantes
- **E** um prazo no passado ou a mais de 28 dias é recusado com o diálogo aberto

#### CA-05 — Atribuir agora

- **Dado** o diálogo de configurações de "Capitais"
- **Quando** Ana aciona "Atribuir agora"
- **Então** o diálogo fecha e o topo do mural mostra "Ana atribuiu um kahoot", a data, o cartão de "Capitais" com Iniciar, "0 curtidas" e "Curtir", sem mensagem
- **E** a aba Atribuições mostra "Capitais"
- **E** a atribuição está nos relatórios de Ana como qualquer outra, com o prazo e as opções escolhidos

#### CA-06 — Adicionar mensagem

- **Dado** o diálogo de configurações
- **Quando** Ana aciona "Adicionar mensagem"
- **Então** vê "Criar publicação" com "Digite seu texto", o contador em 500, o cartão de "Capitais" com X, Cancelar e Publicar indisponível
- **E** ao escrever "Revisem até sexta" e acionar Publicar, o mural mostra a publicação com a mensagem acima do cartão
- **E** a mensagem não passa de 500 caracteres, e o servidor recusa uma vazia ou de 501

#### CA-07 — Cancelar e trocar o quiz

- **Dado** "Criar publicação" aberto
- **Quando** Ana aciona Cancelar
- **Então** tudo fecha e nada é criado (nem atribuição, nem publicação)
- **E** acionar o X volta a "Selecionar kahoot"; escolher "Geografia" e voltar à mensagem mantém o prazo, as opções e o texto

### Mural

#### CA-08 — Iniciar

- **Dado** uma publicação de atribuição aberta
- **Quando** Bruno (membro) aciona Iniciar
- **Então** a tela da atividade abre numa aba nova, e ele entra com um apelido e joga como em qualquer atribuição

#### CA-08a — Atividade encerrada

- **Dado** uma publicação com a mensagem "Revisem até sexta" e 1 curtida
- **Quando** Ana encerra a atribuição no relatório (ou o prazo vence)
- **Então** a publicação passa a "Ana compartilhou um arquivo", com "Revisem até sexta", o quadro "Ana excluiu o anexo da publicação" no lugar do cartão, "1 curtida" e "Curtir"/"Curtida" funcionando
- **E** a atribuição sai da aba Atribuições
- **E** o mesmo acontece quando Ana exclui para sempre o relatório de outra atribuição publicada

#### CA-09 — Ordem do mural

- **Dado** duas atribuições feitas no grupo, uma depois da outra
- **Então** a mais nova aparece em cima, para o administrador e para os membros

#### CA-10 — Curtir

- **Dado** uma publicação com "0 curtidas"
- **Quando** Bruno aciona Curtir
- **Então** vê "1 curtida" e o botão "Curtida", destacado
- **E** acionar "Curtida" volta a "0 curtidas" e "Curtir"
- **E** quando Ana e Bruno curtem, ela vê "2 curtidas" ao recarregar
- **E** dois pedidos de curtir de Bruno ao mesmo tempo contam uma curtida só
- **E** quem não é membro não consegue curtir

#### CA-11 — Menu ⋮

- **Dado** uma atribuição feita por Bruno (membro, com a chave ligada)
- **Então** Bruno e Ana (administradora) veem no ⋮ "Ver relatório" e "Excluir publicação"; Carla (membro) não vê o ⋮
- **E** "Ver relatório" leva Bruno ao relatório dele, com todas as ações
- **E** leva Ana ao mesmo relatório, somente para leitura: resumo, participantes e perguntas, sem renomear, lixeira, alterar prazo, encerrar, compartilhar nem jogar de novo, e ele não aparece na lista de relatórios dela
- **E** depois que a publicação é excluída, Ana recebe "não encontrado" ao abrir o relatório, e o servidor recusa a Carla o relatório em qualquer momento

#### CA-12 — Excluir publicação

- **Dado** o ⋮ de uma publicação
- **Quando** Ana aciona "Excluir publicação" e confirma
- **Então** a publicação some do mural e da aba Atribuições
- **E** o link da atividade continua levando ao jogo, e o relatório continua igual
- **E** o servidor recusa o pedido de exclusão vindo de um membro que não atribuiu

### Aba Atribuições

#### CA-13 — Cartões e lista

- **Dado** duas atribuições no grupo
- **Quando** Bruno (membro) abre a aba Atribuições
- **Então** vê "Kahoots", os cartões com "Kahoot", "⏱ 3 dias", capa, título e quem atribuiu, sem "Atribuir" nem ⋮
- **E** ao trocar para a lista, vê Título, Atribuído por, Prazo e Atribuído ("há 3 minutos"), e a escolha continua ao recarregar
- **E** acionar um cartão ou uma linha abre a atividade numa aba nova

#### CA-14 — Classificar

- **Dado** três atribuições abertas com prazos diferentes
- **Quando** Bruno escolhe "Prazo mais próximo"
- **Então** a de prazo mais próximo vem primeiro
- **E** "Mais antigas" inverte a ordem de "Mais recentes"

#### CA-15 — Aba vazia

- **Dado** um grupo sem atribuições
- **Então** a aba diz "Nenhuma atividade foi atribuída a este grupo ainda.", com "Atribuir" para quem pode atribuir
- **E** o mesmo vale quando todas as atribuições do grupo já acabaram

### Atribuir a grupos

#### CA-16 — De fora do grupo

- **Dado** que Ana criou uma atribuição pela biblioteca, administra "Turma 7A" e "Coral" e é membro de "Jovens" com "criar atividades" desligada
- **Quando** aciona "Adicionar participantes" → "Atribuir a grupos"
- **Então** vê "Turma 7A" e "Coral", e não "Jovens"
- **E** ao marcar os dois e acionar Atribuir, vê "Atividade atribuída a 2 grupos", e a atribuição aparece no mural e na aba dos dois, sem mensagem
- **E** reabrir a lista mostra os dois marcados e indisponíveis, com "Já atribuída"

#### CA-17 — Sem grupos

- **Dado** que Bruno não tem grupos onde possa atribuir
- **Quando** aciona "Atribuir a grupos"
- **Então** vê "Você não tem grupos onde possa atribuir." e "Criar grupo"

#### CA-18 — Uma vez por grupo

- **Dado** uma atribuição já publicada em "Turma 7A"
- **Quando** chega outro pedido de publicá-la em "Turma 7A"
- **Então** o servidor recusa, e dois pedidos ao mesmo tempo deixam uma publicação só
- **E** uma atribuição encerrada não pode ser publicada em grupos, e só o criador da atribuição pode publicá-la

### Configurar seu grupo e exclusões

#### CA-19 — Passos feitos

- **Dado** um grupo novo
- **Quando** o administrador atribui um quiz
- **Então** "Atribuir" e "Criar publicação" aparecem feitos no cartão "Configurar seu grupo"

#### CA-20 — Excluir o grupo e o relatório

- **Dado** um grupo com uma atribuição publicada
- **Quando** o administrador exclui o grupo
- **Então** a atribuição continua aberta pelo link e nos relatórios de quem a criou

#### CA-21 — Quem saiu e a chave desligada

- **Dado** que Bruno atribuiu no grupo e depois saiu
- **Então** a publicação dele continua, com o nome, e o administrador pode removê-la
- **E** desligar "criar atividades" tira o "Atribuir" dos membros sem tirar o que já foi atribuído

## Experiência (telas e estados)

- **Selecionar kahoot** (diálogo): pesquisa com o ícone de lupa, lista rolável de linhas (capa à esquerda, textos à direita), Fechar. Estados: carregando (linhas esqueleto), vazio (RN-05), sem resultado, erro (Tentar novamente).
- **Configurações da atividade atribuída** (diálogo): os dois seletores lado a lado (empilhados em telas estreitas), "Opções" com as chaves e as ajudas, os botões. "Atribuir agora" ocupado enquanto cria; o erro do prazo aparece abaixo dos seletores.
- **Criar publicação** (diálogo): o campo de várias linhas com o contador no canto, o cartão do quiz com X, Cancelar e Publicar (ocupado enquanto publica).
- **Mural** (aba Atividade): a caixa "Publicar algo", o cartão "Configurar seu grupo" (administrador) e as publicações em cartões brancos. Cada publicação: cabeçalho (ícone, nome, "atribuiu um kahoot" ou "compartilhou um arquivo", data, ⋮), mensagem, cartão da atividade (ou o quadro tracejado do anexo excluído), linha "N curtidas" e o botão "Curtir"/"Curtida" separado por uma linha. Carregando: esqueletos; erro: Tentar novamente.
- **Aba Atribuições**: "Kahoots" com "Classificar por" à direita, "Atribuir" e a troca cartões/lista no topo; grade de cartões (1 coluna no celular) ou tabela (no celular, a lista vira linhas com título e prazo).
- **Atribuir a grupos** (diálogo sobre "Compartilhe com os participantes"): a lista dos grupos com as marcas, "Atribuir" (indisponível sem nenhum marcado), Cancelar; e o estado sem grupos (RN-27).

## Divergências intencionais do Kahoot

- **"Atribuir a grupos" sem plano pago** (RN-25): é pago no Kahoot; aqui não há plano (constituição, artigo VI). O que acontece depois de escolher os grupos não pôde ser visto, e foi decidido com o usuário.
- **Sem "Limite de participantes: 40"** (RN-09): constituição, artigo VI.
- **"Atribuir" marcado feito em "Configurar seu grupo"** (RN-29): na captura 4, só "Criar publicação" aparece feito depois de atribuir; aqui os dois, porque o passo foi cumprido.
- **O X volta à seleção** (RN-11): o que o Kahoot faz não foi visto.
- **Prazo vencido e relatório excluído tratados como "Encerrar agora"** (RN-16): só o encerramento foi visto.
- **"Classificar por"** (RN-22): as opções do Kahoot não foram vistas; foram escolhidas três.

## Fora de escopo

- **Publicações de texto** e de quiz sem atribuição, comentários e outras reações: spec 036 (Atividade).
- **Compart.** e a aba Compartilhado: spec 037.
- **Ranking do grupo** (kahoot-reference §11.3): não apareceu nas capturas.
- **Atribuir por e-mail**: continua "Em breve" (depende de um provedor de envio).
- **Notificações** de nova atividade no grupo (o sino da barra superior).
- Identificar no relatório os participantes que são membros do grupo: o participante entra com apelido, sem conta.
- Editar a mensagem de uma publicação depois de publicada.

## Perguntas em aberto

- [ ] Quais são as opções de "Classificar por" no Kahoot? Decididas três (RN-22).

## Changelog

- 2026-10-26: spec criada com as capturas do fluxo de atribuir no grupo enviadas pelo usuário. Decisões do usuário: a 038 vem antes da 036 e da 037 e cria o mural só com atribuições; Curtir entra já; o ⋮ tem "Ver relatório" (quem atribuiu) e "Remover do grupo" (quem atribuiu e o administrador); "Atribuir a grupos" funciona fora do grupo, para vários grupos de uma vez; o diálogo é o do grupo no Kahoot ("Configurações da atividade atribuída"), com as regras de prazo e opções da 029.
- 2026-10-26: com a captura de uma atribuição encerrada no relatório, enviada pelo usuário durante a escrita: a publicação não ganha "Encerrada"; perde o anexo e vira "compartilhou um arquivo", com a mensagem e as curtidas (RN-16); o botão curtido diz "Curtida" (RN-17); a aba Atribuições mostra só as abertas (RN-23). Prazo vencido e relatório excluído seguem o mesmo caminho.
- 2026-10-26: spec aprovada pelo usuário. Depois, com a captura do ⋮ da publicação: "Remover do grupo" vira **"Excluir publicação"** (em vermelho, com a lixeira), e "Ver relatório" passa a ser também do administrador, que abre o relatório de outra pessoa somente para leitura (RN-20, RN-20a), por decisão do usuário.
- 2026-10-26: spec entregue (status `done`). Escolhas feitas na implementação, dentro das regras: a troca entre cartões e lista é um par de botões ("Cartões" e "Lista", o marcado pressionado); no relatório somente para leitura, "Organizado por" some, porque o relatório não sabe o nome de quem atribuiu, e uma atribuição aberta mostra os cartões comuns do resumo no lugar do convite e dos controles; no relatório, "Atribuir a grupos" fecha "Compartilhe com os participantes" antes de abrir a lista dos grupos (na biblioteca, abre por cima); a aba Atribuições também tem o ⋮ de cada atribuição, para quem pode usá-lo.
- 2026-10-26: pela spec 036 (RN-15), "Publicar" de "Criar publicação" aberto por "Adicionar mensagem" fica disponível com o texto vazio, porque o quiz é o anexo: a mensagem passa a ter de 0 a 500 caracteres (RN-11, RN-12).
