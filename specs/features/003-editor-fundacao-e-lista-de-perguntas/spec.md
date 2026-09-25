---
id: "003"
title: Editor 1/5 — Fundação e lista de perguntas
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, library]
created: 2026-09-25
---

# 003 — Editor 1/5: fundação e lista de perguntas

## Contexto e problema

As features 001 e 002 entregaram conta, biblioteca e painel, mas um quiz do Quizio ainda é só uma capa com título: não tem perguntas, e não há onde criá-las. Todo o resto do roadmap (partida, relatórios, novos tipos) depende de um quiz com conteúdo.

No Kahoot, esse conteúdo nasce no **editor** (`create.kahoot.it/creator/<id>`): uma tela cheia, sem a navegação do resto do site, com a lista de perguntas à esquerda, a pergunta selecionada no centro e o painel de propriedades à direita. Tudo o que se digita é salvo sozinho ("Salvo em: Meus rascunhos"); o botão "Salvar" do cabeçalho não salva o texto, ele libera o quiz para ser jogado.

O editor é grande demais para uma entrega só, então foi dividido em cinco specs (roadmap, mudança de 2026-09-25):

| Spec | Etapa | Entrega |
| --- | --- | --- |
| **003** | **Fundação e lista de perguntas** | **Esta spec.** Tela do editor, criar direto no editor, lista de perguntas, texto da pergunta, salvamento automático |
| 004 | Pergunta Quiz completa | Alternativas (2 a 6), corretas, seleção simples/múltipla, tempo, pontos, avisos de pergunta incompleta |
| 005 | Verdadeiro ou falso e troca de tipo | Escolher o tipo ao adicionar, pergunta V/F, trocar o tipo de uma pergunta |
| 006 | Salvar a versão jogável | Botão Salvar, validação do quiz inteiro, versão congelada para as partidas |
| 007 | Mídia nas perguntas | Imagem na pergunta e nas alternativas |

Esta etapa entrega o esqueleto em que as outras quatro vão se encaixar: a tela, a estrutura de perguntas ordenadas e o salvamento automático. Ao final dela, o criador já monta a sequência de perguntas de um quiz, só com os enunciados.

## Objetivo

O criador abre o editor de um quiz, monta e reorganiza a lista de perguntas e escreve o enunciado de cada uma, sem nunca precisar apertar um botão de salvar e sem perder o que digitou.

## Personas

- **Criador (`Creator`)** — pessoa com conta, dona dos próprios quizzes (kahoot-reference §1). É a única que abre o editor de um quiz.

Jogadores e anfitriões não aparecem nesta feature.

## Histórias de usuário

- **HU-01** — Como criador, quero que "Criar" me leve direto ao editor com uma pergunta pronta para preencher, para começar a escrever sem passar por um formulário.
- **HU-02** — Como criador, quero ver todas as perguntas do quiz numa lista ao lado, para saber onde estou e pular entre elas.
- **HU-03** — Como criador, quero adicionar, duplicar, reordenar e excluir perguntas, para montar a sequência que vou apresentar.
- **HU-04** — Como criador, quero que tudo o que eu digito seja salvo sozinho e que a tela me diga isso, para não ter medo de fechar a aba.
- **HU-05** — Como criador, quero editar o título e os demais dados do quiz sem sair do editor, para não quebrar o ritmo.
- **HU-06** — Como criador, quero sair do editor para a página do quiz e voltar a ele por um botão "Editar", para alternar entre revisar e editar.

## Regras de negócio

### Acesso e navegação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O editor de um quiz fica no endereço **`/creator/<id do quiz>`** e exige sessão, como as demais telas do criador (spec 001, RN-09). | kahoot-reference §3 (`/creator/<id>`) · decisão do produto (2026-09-25) |
| RN-02 | Só o dono abre o editor. Para qualquer outra pessoa, e para um id inexistente, o editor mostra "Quiz não encontrado", sem distinguir os dois casos. | spec 001, RN-10 |
| RN-03 | Um quiz **na lixeira** não abre no editor: a tela avisa que ele está na lixeira e oferece o caminho para a Lixeira da biblioteca, onde ele pode ser restaurado. | spec 001, RN-22 |
| RN-04 | A ação **Criar** (barra superior, estado vazio do painel e da biblioteca) cria na hora um **rascunho sem título** com **uma pergunta do tipo Quiz em branco** e abre o editor dele, já com essa pergunta selecionada. Não há formulário antes. | kahoot-reference §3 · decisão do produto (2026-09-25) — substitui a RN-13 da spec 002 |
| RN-05 | A página do quiz (`/quizzes/<id>`) continua existindo e ganha a ação **Editar**, que abre o editor. Abrir um quiz pela biblioteca ou pelo painel continua levando à página do quiz. | decisão do produto (2026-09-25) |
| RN-06 | O editor ocupa a tela inteira, **sem a navegação principal** nem a barra superior das demais telas do criador. A ação **Sair** do cabeçalho leva à página do quiz. | kahoot-reference §3 · decisão do produto (2026-09-25) — exceção à RN-04 da spec 002 |

### Perguntas e lista

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | Um quiz tem uma **lista ordenada de perguntas (`Question`)**. Nesta etapa toda pergunta é do tipo **Quiz (`quiz`)**; Verdadeiro ou falso chega na spec 005. | kahoot-reference §2, §4.1.1 |
| RN-08 | Todo quiz aberto no editor tem **pelo menos uma pergunta**. Um quiz que ainda não tem nenhuma (os criados antes desta feature) ganha uma pergunta Quiz em branco ao ser aberto no editor. | decisão do produto (2026-09-25) |
| RN-09 | Uma **pergunta em branco** tem enunciado vazio e, a partir da spec 004, os valores padrão de tempo e pontos. Pergunta em branco é permitida no rascunho: ela só impede salvar a versão jogável (spec 006). | kahoot-reference §3.6 |
| RN-10 | O **enunciado (`text`)** tem no máximo **120 caracteres**, contados como caracteres percebidos (acentos e emoji contam 1). O campo não aceita digitar além disso, e o que é colado é cortado no limite. Espaços nas pontas são ignorados ao salvar; um enunciado só com espaços conta como vazio. | kahoot-reference §4 (regras comuns), §4.1.1 |
| RN-11 | **Adicionar** cria uma pergunta Quiz em branco **logo depois da pergunta selecionada** e a seleciona. | kahoot-reference §3.2 · decisão do produto (2026-09-25) |
| RN-12 | **Duplicar** cria uma cópia da pergunta **logo depois da original**, com todo o conteúdo dela, e seleciona a cópia. A cópia é independente da original. | kahoot-reference §3.2 |
| RN-13 | **Reordenar** é feito arrastando uma pergunta na lista, ou pelo teclado (mover para cima / para baixo). A nova ordem é salva e é a ordem em que as perguntas serão apresentadas na partida. | kahoot-reference §3.2 · constituição, artigo VIII (acessibilidade) |
| RN-14 | **Excluir** remove a pergunta na hora, sem pedir confirmação, e oferece **"Desfazer"**, que a devolve com o mesmo conteúdo e na mesma posição. Depois de excluir, fica selecionada a pergunta que ocupou a posição dela, ou a anterior se ela era a última. | kahoot-reference §3.2 · decisão do produto (2026-09-25) |
| RN-15 | **Não é possível excluir a única pergunta do quiz.** A ação fica indisponível e explica o motivo: "Não é possível excluir todo o conteúdo". | referência visual do Kahoot (2026-09-25) |
| RN-16 | Um quiz tem no máximo **200 perguntas**. Com 200, Adicionar e Duplicar ficam indisponíveis e explicam o motivo. O limite existe por razão técnica (tamanho da partida e da versão salva) e é configurável. | kahoot-reference §3.2 · constituição, artigo VI |
| RN-17 | Cada item da lista mostra o número da posição, o tipo ("Quiz"), o começo do enunciado (ou nada, se vazio) e uma miniatura no formato da pergunta. A pergunta selecionada fica destacada. | kahoot-reference §3.2 · referência visual do Kahoot |

### Dados do quiz no editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | O **título** do quiz é editado direto no cabeçalho do editor, com as regras da spec 001 (RN-12: até 95 caracteres, opcional no rascunho, vazio vira "Quiz sem título" fora do editor). | kahoot-reference §3.1 · spec 001, RN-12 |
| RN-19 | A ação **Configurações** do cabeçalho abre os dados do quiz — título, descrição, capa e visibilidade — com as mesmas regras e o mesmo formulário da spec 001. Salvar ali fecha o formulário e atualiza o cabeçalho. | kahoot-reference §3.1 · spec 001, RN-12 a RN-15 |

### Salvamento automático

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-20 | Tudo o que o criador faz no editor é **salvo automaticamente (`Autosave`)**: adicionar, duplicar, reordenar e excluir perguntas na hora; textos (enunciado e título) pouco depois de o criador parar de digitar e sempre que ele sai do campo. Não existe botão para salvar o conteúdo. | kahoot-reference §3.6 · referência visual do Kahoot ("Salvo em: Meus rascunhos") · decisão do produto (2026-09-25) |
| RN-21 | O cabeçalho mostra o **estado do salvamento**: "Salvando…" enquanto há alteração a caminho, "Salvo" quando tudo chegou, e "Não foi possível salvar" com a opção de tentar de novo quando algo falhou. | referência visual do Kahoot · decisão do produto (2026-09-25) |
| RN-22 | Uma falha ao salvar **não apaga** o que o criador digitou: o texto continua na tela e é reenviado ao tentar de novo. | decisão do produto (2026-09-25) |
| RN-23 | Se o criador tentar sair do editor ou fechar a aba com alterações ainda não salvas, o editor tenta salvá-las antes; se não conseguir, o navegador pede confirmação para sair. | decisão do produto (2026-09-25) |
| RN-24 | Qualquer alteração feita no editor atualiza a **última modificação** do quiz, que sobe para o topo de Recentes e de "Seus quizzes". Apenas abrir o editor ou selecionar perguntas não altera. | spec 001, RN-18 |
| RN-25 | O quiz continua **rascunho** durante toda esta etapa. Torná-lo jogável é a ação Salvar, que chega na spec 006. | kahoot-reference §3.6 |

### Efeitos fora do editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-26 | O **número de perguntas** exibido na biblioteca, no painel e na página do quiz passa a ser o número real de perguntas. | spec 001, RN-15 · spec 002, RN-16 |
| RN-27 | **Duplicar um quiz** (spec 001, RN-20) passa a copiar também as perguntas, na mesma ordem e com o mesmo conteúdo. | spec 001, RN-20 · decisão do produto (2026-09-25) |
| RN-28 | Excluir definitivamente um quiz (spec 001, RN-24) exclui também as perguntas dele. | spec 001, RN-24 |
| RN-29 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Acesso e navegação

#### CA-01 — Criar abre o editor com uma pergunta em branco

- **Dado** um criador na página inicial
- **Quando** ele aciona **Criar**
- **Então** chega a `/creator/<id>` de um quiz novo, sem título, em rascunho
- **E** a lista tem uma única pergunta, "1 Quiz", selecionada, com o enunciado vazio e o texto de apoio "Comece a digitar a pergunta"
- **E** o novo quiz aparece em Rascunhos da biblioteca como "Quiz sem título", com "1 pergunta"

#### CA-02 — Editar a partir da página do quiz

- **Dado** um criador na página de um quiz seu
- **Quando** ele aciona **Editar**
- **Então** chega ao editor desse quiz, com a primeira pergunta selecionada

#### CA-03 — Sair volta à página do quiz

- **Dado** um criador no editor de um quiz, com tudo salvo
- **Quando** ele aciona **Sair**
- **Então** chega à página desse quiz, que mostra o título atualizado e o número de perguntas

#### CA-04 — Quiz de outra pessoa ou inexistente

- **Dado** um criador com sessão
- **Quando** ele abre `/creator/<id>` de um quiz de outro criador, ou de um id que não existe
- **Então** vê "Quiz não encontrado" nos dois casos, sem nenhum dado do quiz

#### CA-05 — Visitante sem sessão

- **Dado** um visitante sem sessão
- **Quando** ele abre `/creator/<id>`
- **Então** é levado à tela de entrada e, depois de entrar como dono, volta ao editor

#### CA-06 — Quiz na lixeira

- **Dado** um quiz do criador que está na lixeira
- **Quando** ele abre o editor desse quiz
- **Então** vê o aviso de que o quiz está na lixeira e o caminho para a Lixeira da biblioteca
- **E** nenhuma pergunta pode ser criada ou alterada

#### CA-07 — Quiz antigo sem perguntas

- **Dado** um quiz criado antes desta feature, com 0 perguntas
- **Quando** o criador abre o editor dele
- **Então** o quiz passa a ter uma pergunta Quiz em branco, selecionada

#### CA-08 — Editor em tela cheia

- **Dado** um criador no editor
- **Quando** ele olha a tela
- **Então** vê o cabeçalho (marca, título, Configurações, estado do salvamento, Sair), a lista de perguntas à esquerda, a pergunta selecionada no centro e o painel de propriedades à direita
- **E** não vê a navegação principal nem a barra superior das demais telas

### Lista de perguntas

#### CA-09 — Adicionar depois da selecionada

- **Dado** um quiz com as perguntas A, B e C, com B selecionada
- **Quando** o criador aciona **Adicionar**
- **Então** a lista fica A, B, nova, C, com a nova pergunta selecionada e em branco
- **E** ao recarregar a página, a ordem continua A, B, nova, C

#### CA-10 — Duplicar

- **Dado** um quiz com as perguntas A ("Capital da França?") e B
- **Quando** o criador duplica A
- **Então** a lista fica A, cópia de A, B, com a cópia selecionada e com o enunciado "Capital da França?"
- **E** alterar o enunciado da cópia não altera o de A

#### CA-11 — Reordenar arrastando

- **Dado** um quiz com as perguntas A, B e C
- **Quando** o criador arrasta C para antes de A
- **Então** a lista fica C, A, B, com os números de posição atualizados
- **E** ao recarregar a página, a ordem continua C, A, B

#### CA-12 — Reordenar pelo teclado

- **Dado** um quiz com as perguntas A, B e C e o foco no item B
- **Quando** o criador usa a ação de mover B para cima
- **Então** a lista fica B, A, C e o foco continua em B

#### CA-13 — Excluir e desfazer

- **Dado** um quiz com as perguntas A, B e C, com B selecionada
- **Quando** o criador exclui B
- **Então** a lista fica A, C, com C selecionada, e aparece a opção "Desfazer"
- **Quando** ele aciona "Desfazer"
- **Então** a lista volta a ser A, B, C, com o conteúdo de B intacto

#### CA-14 — Excluir a última da lista seleciona a anterior

- **Dado** um quiz com as perguntas A e B, com B selecionada
- **Quando** o criador exclui B
- **Então** a lista fica só A, e A fica selecionada

#### CA-15 — Não excluir a única pergunta

- **Dado** um quiz com uma única pergunta
- **Quando** o criador tenta excluí-la, pela lista ou pelo painel de propriedades
- **Então** a ação está indisponível e explica "Não é possível excluir todo o conteúdo"
- **E** a pergunta continua no quiz

#### CA-16 — Limite de 200 perguntas

- **Dado** um quiz com 200 perguntas
- **Quando** o criador olha as ações Adicionar e Duplicar
- **Então** elas estão indisponíveis e explicam que o limite de 200 perguntas foi atingido
- **E** com 199 perguntas, Adicionar funciona e leva o quiz a 200

#### CA-17 — Selecionar uma pergunta

- **Dado** um quiz com as perguntas A e B, com A selecionada
- **Quando** o criador aciona B na lista
- **Então** o centro passa a mostrar o enunciado de B e B fica destacada na lista

### Enunciado

#### CA-18 — Escrever o enunciado

- **Dado** um criador no editor, com uma pergunta em branco selecionada
- **Quando** ele digita "Qual é a capital do Brasil?"
- **Então** o item da lista passa a mostrar esse enunciado
- **E** depois que ele para de digitar, o estado passa a "Salvo", e ao recarregar a página o enunciado continua lá

#### CA-19 — Limite de 120 caracteres

- **Dado** uma pergunta selecionada
- **Quando** o criador digita ou cola um texto de 130 caracteres
- **Então** o enunciado fica com os 120 primeiros e não aceita mais nenhum
- **E** um texto de exatamente 120 caracteres, incluindo acentos e emoji contados como 1, é aceito inteiro

#### CA-20 — Enunciado só com espaços

- **Dado** uma pergunta com o enunciado "Capital?"
- **Quando** o criador troca o enunciado por três espaços e sai do campo
- **Então** a pergunta é salva com o enunciado vazio, e o item da lista não mostra texto

### Dados do quiz

#### CA-21 — Título no cabeçalho

- **Dado** um quiz sem título aberto no editor
- **Quando** o criador digita "Geografia" no título do cabeçalho
- **Então** depois que ele para de digitar, o estado passa a "Salvo"
- **E** a biblioteca passa a mostrar o quiz como "Geografia"
- **E** o título não aceita mais que 95 caracteres

#### CA-22 — Configurações

- **Dado** um criador no editor
- **Quando** ele aciona **Configurações**, troca a descrição e a visibilidade e salva
- **Então** o formulário fecha, o editor continua na mesma pergunta, e os novos dados aparecem na página do quiz

### Salvamento automático

#### CA-23 — Estado do salvamento

- **Dado** um criador no editor, com o estado "Salvo"
- **Quando** ele digita no enunciado
- **Então** o estado passa a "Salvando…" e, quando a alteração chega, volta a "Salvo"

#### CA-24 — Falha ao salvar

- **Dado** um criador no editor, sem conexão com o servidor
- **Quando** ele digita "Pergunta nova" no enunciado
- **Então** o estado passa a "Não foi possível salvar", com a opção de tentar de novo, e o texto continua na tela
- **Quando** a conexão volta e ele aciona tentar de novo
- **Então** o estado passa a "Salvo" e, ao recarregar, o enunciado é "Pergunta nova"

#### CA-25 — Sair com alteração pendente

- **Dado** um criador que acabou de digitar no enunciado, antes de a alteração ser enviada
- **Quando** ele aciona **Sair**
- **Então** a alteração é salva antes de a página do quiz abrir

#### CA-26 — Última modificação

- **Dado** dois quizzes do criador, X modificado ontem e Y modificado hoje
- **Quando** ele abre o editor de X, adiciona uma pergunta e volta à biblioteca
- **Então** X aparece antes de Y em Recentes
- **E** apenas abrir o editor de Y e selecionar perguntas, sem alterar nada, não muda a ordem

### Efeitos fora do editor

#### CA-27 — Número de perguntas

- **Dado** um quiz com 3 perguntas
- **Quando** o criador olha esse quiz na biblioteca, em "Seus quizzes" e na página do quiz
- **Então** os três lugares mostram "3 perguntas"

#### CA-28 — Duplicar um quiz copia as perguntas

- **Dado** um quiz "Geografia" com as perguntas A e B
- **Quando** o criador duplica o quiz pela biblioteca
- **Então** a cópia "Geografia (cópia)" tem as perguntas A e B, na mesma ordem
- **E** alterar uma pergunta da cópia não altera o original

#### CA-29 — Excluir definitivamente leva as perguntas

- **Dado** um quiz com perguntas, na lixeira
- **Quando** o criador o exclui definitivamente
- **Então** o quiz e as perguntas dele deixam de existir

### Estados da tela

#### CA-30 — Carregando e erro

- **Dado** um criador abrindo o editor
- **Quando** o quiz ainda está sendo carregado
- **Então** a tela mostra marcadores de lugar no formato do editor
- **E** se o carregamento falhar por outro motivo que não "não encontrado", mostra uma mensagem de erro com a opção de tentar de novo

## Experiência (telas e estados)

- **Cabeçalho**, de ponta a ponta:
  - à esquerda, a marca do Quizio (leva à página inicial, salvando antes o que estiver pendente);
  - um campo de título com o texto de apoio "Inserir título do quiz…" e, colado a ele, a ação **Configurações**;
  - o estado do salvamento ("Salvando…", "✓ Salvo", "Não foi possível salvar · Tentar de novo");
  - à direita, a ação **Sair**. O espaço do botão **Salvar** fica reservado para a spec 006.
- **Lista de perguntas (esquerda)**: cada item com o número e o tipo ("1 Quiz"), a miniatura com o começo do enunciado e, ao lado, as ações duplicar e excluir. A selecionada fica destacada. Abaixo da lista, o botão **Adicionar**. Os itens podem ser arrastados.
- **Pergunta (centro)**, sobre o fundo do editor:
  - o enunciado, em destaque no topo, com o texto de apoio "Comece a digitar a pergunta" e a contagem de caracteres restantes quando o texto se aproxima do limite;
  - abaixo, a área de mídia, marcada "Em breve" (spec 007);
  - abaixo, as quatro alternativas com cor e forma ("Adicionar resposta 1", "Adicionar resposta 2", "Adicionar resposta 3 (opcional)", "Adicionar resposta 4 (opcional)"), visíveis mas ainda não editáveis, marcadas "Em breve" (spec 004).
- **Painel de propriedades (direita)**: título "Propriedades da pergunta"; "Tipo de pergunta: Quiz", só leitura nesta etapa (spec 005); tempo, pontos e opções de resposta chegam na spec 004. No rodapé, as ações **Excluir** e **Duplicar** da pergunta selecionada, com as mesmas regras da lista.
- **Telas estreitas**: a pergunta ocupa a tela; a lista de perguntas e o painel de propriedades ficam atrás de botões que os abrem e fecham, com as mesmas ações.
- **Estados**: carregando (marcadores no formato do editor), não encontrado, na lixeira, erro com tentar de novo.
- **Página do quiz**: ganha a ação **Editar** em destaque e passa a mostrar o número real de perguntas.

## Divergências intencionais do Kahoot

- **Excluir sem confirmação, com "Desfazer"** (RN-14). O Kahoot pede confirmação; o Quizio já usa "Desfazer" nas ações da biblioteca e mantém o padrão, que é mais rápido e igualmente seguro.
- **Quiz na lixeira não abre no editor** (RN-03). No Kahoot rascunhos não vão para a lixeira; no Quizio vão (spec 001, RN-21), então é preciso definir o que acontece.
- **Sem "Crie" (IA), sem as abas Procurar / Gerar / Importar, sem Temas, sem pré-visualização e sem "Faça upgrade"**. IA, banco de perguntas e importação ficam para as features 016 e 017; temas e pré-visualização para a 017; "upgrade" não existe no Quizio (constituição, artigo VI).
- **Limite de 200 perguntas é configurável** (RN-16). O valor é o do Kahoot, mas no Quizio ele é uma decisão técnica, não de plano.

## Fora de escopo

- Alternativas, respostas corretas, seleção simples/múltipla, tempo limite, pontos, "aplicar a todas" e avisos de pergunta incompleta (spec 004).
- Tipo Verdadeiro ou falso, escolha do tipo ao adicionar e troca de tipo (spec 005).
- Botão **Salvar**, validação do quiz inteiro, versão jogável e status "publicado" (spec 006).
- Imagem e vídeo na pergunta e nas alternativas (spec 007).
- Edição simultânea em várias abas ou por várias pessoas: se o mesmo quiz estiver aberto em duas abas, vale a última alteração de cada campo, sem sincronização entre elas.
- Histórico de versões e desfazer além da exclusão de pergunta.
- Selecionar várias perguntas de uma vez (duplicar, excluir ou mover em lote).

## Perguntas em aberto

- [x] **Tempo para salvar o texto** — decidido no plano (2026-09-25): 800 ms depois da última tecla, e sempre ao sair do campo.
- [ ] **Posição da pergunta nova no Kahoot** — a RN-11 insere logo depois da selecionada; não foi confirmado se o Kahoot insere ali ou no fim da lista.
- [ ] **Cores e formas da 5ª e 6ª alternativa** — ainda não confirmadas na referência (§6.5). Não afetam esta etapa, mas precisam de decisão na spec 004.

## Changelog

- 2026-09-25 — spec criada, primeira de cinco specs do editor (003 a 007). Decisões do produto registradas: editor em `/creator/<id>` (RN-01); Criar abre o editor direto, com uma pergunta Quiz em branco (RN-04), substituindo a RN-13 da spec 002; a página do quiz continua sendo o destino ao abrir um quiz e ganha a ação Editar (RN-05); a única pergunta não pode ser excluída (RN-15); tudo é salvo automaticamente, e o Salvar do cabeçalho fica para a spec 006 (RN-20, RN-25).
- 2026-09-25 — spec aprovada.
- 2026-09-25 — plano aprovado (status `planned`), com o ADR 0008.
- 2026-09-25 — implementada. Os 30 CAs têm teste automatizado verde (domínio, casos de uso, PGlite, API, componentes e E2E em desktop e celular). Descobertas registradas no plano; as que mudam comportamento:
  - operações do editor não sobrescrevem mais uma mudança concorrente do título (`touch` grava só a última modificação);
  - "Salvando…" aparece na primeira tecla, então fechar a aba antes do envio sempre pede confirmação (RN-23);
  - offline, o salvamento falha visivelmente em vez de ficar pendente (CA-24);
  - Configurações só abre depois de salvar o título digitado.
