---
id: "002"
title: Página inicial
status: done # draft | approved | planned | in-progress | done
contexts: [library, quiz]
created: 2026-09-25
---

# 002 — Página inicial

## Contexto e problema

A feature 001 entregou conta, quizzes e biblioteca, mas a porta de entrada do Quizio continua sendo a tela de apresentação do scaffold: um criador que já tem sessão abre `/`, vê um título, um subtítulo e um botão "Ir para a biblioteca". Todo o resto do produto fica escondido atrás de um cabeçalho com um único link.

Isso cobra dois preços. O primeiro é diário: quem volta ao Quizio para continuar um quiz gasta um clique numa página de marketing que não lhe diz nada. O segundo é estrutural: as features seguintes do roadmap (editor, partida, relatórios, pastas, descoberta) não têm onde aparecer, e cada uma vai ter que inventar sua própria navegação.

No Kahoot, essa porta de entrada é a tela **Início**: uma navegação lateral fixa com as áreas do produto, uma barra superior com pesquisa e o botão de criar, e um corpo com cartões de acesso rápido ao conteúdo do usuário ("Seus kahoots", "Relatórios mais recentes"). É esse leiaute que o Quizio vai espelhar.

A [referência funcional](../../product/kahoot-reference.md) documenta a biblioteca (§11.1) mas **não tem uma seção sobre a tela inicial**: as regras abaixo vêm da referência visual da home do Kahoot e de decisões de produto tomadas em 2026-09-25.

## Objetivo

Um criador com sessão é recebido por um painel que mostra seus quizzes mais recentes e dá acesso a criar, pesquisar e circular por todas as áreas do Quizio — inclusive as que ainda serão implementadas, sinalizadas como tais.

## Personas

- **Criador (`Creator`)** — pessoa com conta, dona dos próprios quizzes (kahoot-reference §1). É quem usa o painel.
- **Visitante** — pessoa sem sessão ativa, que continua vendo a apresentação pública do Quizio.

Jogadores não aparecem nesta feature: eles entram pelo PIN, nunca pela área do criador (kahoot-reference §1, §9).

## Histórias de usuário

- **HU-01** — Como criador, quero que o Quizio me receba com um painel em vez de uma página de apresentação, para retomar meu trabalho assim que entro.
- **HU-02** — Como criador, quero ver meus quizzes mais recentes na página inicial, para abrir em um clique o que eu estava fazendo.
- **HU-03** — Como criador, quero criar um quiz de qualquer tela, para não ter que voltar à biblioteca antes.
- **HU-04** — Como criador, quero pesquisar nos meus quizzes de qualquer tela, para achar um conteúdo antigo sem navegar até a biblioteca.
- **HU-05** — Como criador, quero uma navegação principal sempre visível, para circular entre as áreas do Quizio sem me perder.
- **HU-06** — Como criador, quero enxergar o que ainda está por vir, para saber o que o Quizio vai oferecer e não procurar o que ainda não existe.
- **HU-07** — Como visitante, quero que a página `/` continue apresentando o Quizio e me levando a entrar, para saber o que é o produto antes de criar conta.

## Regras de negócio

### Porta de entrada

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O endereço `/` atende aos dois públicos: **sem sessão** mostra a apresentação pública do Quizio, com as ações de entrar e criar conta; **com sessão** mostra a **página inicial (`Home`)** do criador. | decisão do produto (2026-09-25) |
| RN-02 | Depois de entrar ou criar conta **sem um destino pedido**, o criador chega à página inicial. Com um destino pedido, continua valendo a RN-09 da spec 001: ele volta à página que tentou abrir. | decisão do produto (2026-09-25) — substitui o destino padrão da spec 001 |
| RN-03 | Ao sair, o criador volta para `/` e passa a ver a apresentação pública. | decisão do produto (2026-09-25) |

### Navegação principal

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | Todas as telas do criador compartilham a mesma **navegação principal (`MainNav`)**, nesta ordem: **Início**, **Biblioteca**, **Relatórios**, **Descobrir**, **Grupos**. Ela fica na **barra lateral** e em nenhum outro lugar: a barra superior não tem itens de navegação. | decisão do produto (2026-09-25) |
| RN-05 | Os itens cujas features ainda não foram entregues aparecem marcados **"Em breve"**: não navegam, não são acionáveis por teclado como link e são anunciados como indisponíveis. Hoje isso vale para Relatórios (006), Descobrir e Grupos (013). Cada feature entregue ativa o seu item. | decisão do produto (2026-09-25) |
| RN-06 | O item correspondente à tela aberta fica destacado. **Biblioteca** é o item ativo em qualquer uma das suas seções (Recentes, Rascunhos, Lixeira) e nas telas de um quiz. | decisão do produto (2026-09-25) |
| RN-07 | A navegação principal só aparece para quem tem sessão. A apresentação pública não a exibe. | decisão do produto (2026-09-25) |
| RN-08 | Em telas estreitas, a navegação principal fica atrás de um botão que a abre e a fecha, com os mesmos itens, na mesma ordem e com as mesmas marcações. | decisão do produto (2026-09-25) · constituição, artigo VIII |

### Navegação secundária (seções de uma área)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | Quando uma área tem seções, elas aparecem como **abas** no topo do conteúdo, e não como uma segunda coluna. Hoje isso vale para a **Biblioteca**, cujas seções **Recentes**, **Rascunhos** e **Lixeira** deixam a coluna lateral e viram abas. | decisão do produto (2026-09-25) — substitui o arranjo da spec 001 |
| RN-23 | Cada aba é um **destino real**, não um botão: ela troca o endereço (`/library?section=…`), funciona com voltar e avançar do navegador e pode ser aberta em nova aba. A aba da seção aberta fica marcada como atual. Trocar de seção continua limpando a pesquisa, como na spec 001. | decisão do produto (2026-09-25) · spec 001 RN-19 |

### Barra superior

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | A barra superior das telas do criador tem, e só tem: a marca (que leva à página inicial), a **pesquisa**, a ação **Criar** e o menu do usuário já existente. Nenhum link de navegação mora nela (RN-04). | decisão do produto (2026-09-25) |
| RN-10 | A pesquisa da barra superior busca **nos quizzes do próprio criador**, com as mesmas regras da RN-19 da spec 001 (filtra por título, ignorando maiúsculas/minúsculas e acentos). Enviá-la leva à Biblioteca, seção **Recentes**, com o texto já aplicado. | decisão do produto (2026-09-25) · spec 001 RN-19 |
| RN-11 | Uma pesquisa vazia ou só com espaços não navega nem filtra nada. | decisão do produto (2026-09-25) |
| RN-12 | A pesquisa **não** busca conteúdo público de outras pessoas; isso chega com a descoberta pública (013). | decisão do produto (2026-09-25) |
| RN-13 | A ação **Criar** abre o mesmo formulário de dados do quiz da spec 001 e, ao salvar, leva à tela do quiz criado. Ela está disponível em todas as telas do criador. | decisão do produto (2026-09-25) · spec 001 |

### Conteúdo do painel

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | O painel abre com uma saudação que usa o nome do criador. | decisão do produto (2026-09-25) |
| RN-15 | O cartão **"Seus quizzes"** mostra até **6** quizzes do criador que estão fora da lixeira, do mais recentemente modificado para o menos recente — a mesma ordem da seção Recentes (spec 001, RN-16). | decisão do produto (2026-09-25) · kahoot-reference §11.1 |
| RN-16 | Cada quiz do painel mostra capa (ou a imagem padrão), título (ou "Quiz sem título"), número de perguntas e última modificação em tempo relativo, e abre o quiz ao ser acionado. As demais ações (editar dados, duplicar, excluir) continuam só na biblioteca. | decisão do produto (2026-09-25) · spec 001 RN-12, RN-15 |
| RN-17 | O cartão "Seus quizzes" traz um link **"Ver tudo (N)"** para a seção Recentes, onde `N` é o total de quizzes do criador fora da lixeira. Com 6 quizzes ou menos, o link continua aparecendo. | decisão do produto (2026-09-25) |
| RN-18 | Um criador sem nenhum quiz fora da lixeira vê, no lugar da lista, um estado vazio que convida a criar o primeiro quiz. | decisão do produto (2026-09-25) |
| RN-19 | O cartão **"Relatórios mais recentes"** aparece marcado "Em breve", sem dados, explicando que os relatórios chegam com as partidas. Ele passa a mostrar conteúdo real na feature 006. | decisão do produto (2026-09-25) |
| RN-20 | Quizzes na lixeira nunca aparecem no painel. | spec 001 RN-22 |
| RN-21 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Porta de entrada

#### CA-01 — Visitante continua vendo a apresentação

- **Dado** um visitante sem sessão
- **Quando** ele abre `/`
- **Então** vê a apresentação pública do Quizio com as ações de entrar e criar conta
- **E** não vê a navegação principal, a pesquisa nem a ação Criar

#### CA-02 — Criador é recebido pelo painel

- **Dado** um criador com sessão ativa
- **Quando** ele abre `/`
- **Então** vê a página inicial com a saudação usando seu nome, a navegação principal, a barra superior e os cartões "Seus quizzes" e "Relatórios mais recentes"

#### CA-03 — Entrar sem destino pedido leva ao painel

- **Dado** um visitante que abriu a tela de entrada diretamente, sem destino pedido
- **Quando** ele entra com credenciais válidas
- **Então** chega à página inicial

#### CA-04 — Entrar com destino pedido preserva o destino

- **Dado** um visitante que tentou abrir a biblioteca e foi levado à tela de entrada
- **Quando** ele entra com credenciais válidas
- **Então** chega à biblioteca, e não à página inicial

#### CA-05 — Sair volta à apresentação pública

- **Dado** um criador na página inicial
- **Quando** ele sai da conta
- **Então** passa a ver a apresentação pública em `/`, sem a navegação principal

### Navegação principal

#### CA-06 — Itens e ordem

- **Dado** um criador em qualquer tela da área do criador
- **Quando** ele olha a navegação principal
- **Então** vê, na barra lateral e nesta ordem, Início, Biblioteca, Relatórios, Descobrir e Grupos
- **E** a barra superior não tem nenhum item de navegação — só marca, pesquisa, Criar e menu do usuário

#### CA-07 — Item "Em breve" não navega

- **Dado** um criador na página inicial
- **Quando** ele aciona Relatórios, Descobrir ou Grupos
- **Então** continua na página inicial
- **E** cada um desses itens exibe a marcação "Em breve" e é anunciado como indisponível

#### CA-08 — Item ativo

- **Dado** um criador na página inicial
- **Quando** ele vai para a Biblioteca, alterna entre Recentes, Rascunhos e Lixeira e depois abre um quiz
- **Então** Biblioteca fica destacada como item ativo em todas essas telas
- **E** Início fica destacado apenas em `/`

#### CA-09 — Navegação em tela estreita

- **Dado** um criador em uma tela estreita
- **Quando** ele aciona o botão da navegação principal
- **Então** vê os mesmos cinco itens, na mesma ordem e com as mesmas marcações
- **E** ao escolher Biblioteca, chega à biblioteca e a navegação se fecha

### Navegação secundária

#### CA-21 — Seções da biblioteca em abas

- **Dado** um criador na Biblioteca
- **Quando** ele olha o topo do conteúdo
- **Então** vê as abas Recentes, Rascunhos e Lixeira, com a seção aberta marcada como atual
- **E** não há mais uma coluna lateral de seções dentro da página

#### CA-22 — Aba é endereço, não botão

- **Dado** um criador na Biblioteca, seção Recentes
- **Quando** ele aciona a aba Lixeira e depois usa o voltar do navegador
- **Então** o endereço passa a apontar para a Lixeira e o voltar devolve Recentes
- **E** a barra lateral mantém **Biblioteca** como área ativa nas duas seções

### Barra superior

#### CA-10 — Pesquisar da página inicial

- **Dado** um criador com os quizzes "Revisão de Álgebra" e "História do Brasil"
- **Quando** ele pesquisa "algebra" na barra superior da página inicial
- **Então** chega à Biblioteca, seção Recentes, com o texto aplicado, vendo só "Revisão de Álgebra"

#### CA-11 — Pesquisa vazia não faz nada

- **Dado** um criador na página inicial
- **Quando** ele envia a pesquisa vazia ou só com espaços
- **Então** continua na página inicial e nenhuma pesquisa é feita

#### CA-12 — Criar a partir da barra superior

- **Dado** um criador na página inicial
- **Quando** ele aciona Criar, preenche o título e salva
- **Então** o quiz é criado como rascunho e ele chega à tela desse quiz
- **E** ao voltar à página inicial, o novo quiz aparece no topo de "Seus quizzes"

### Conteúdo do painel

#### CA-13 — Quizzes recentes, ordem e limite

- **Dado** um criador com 8 quizzes fora da lixeira, modificados em momentos diferentes
- **Quando** ele abre a página inicial
- **Então** "Seus quizzes" mostra os 6 mais recentemente modificados, do mais recente para o menos recente
- **E** o link "Ver tudo (8)" leva à seção Recentes com os 8

#### CA-14 — Lixeira não aparece no painel

- **Dado** um criador com 2 quizzes, um deles na lixeira
- **Quando** ele abre a página inicial
- **Então** "Seus quizzes" mostra apenas o quiz fora da lixeira, e o link diz "Ver tudo (1)"

#### CA-15 — Quiz sem título e sem capa

- **Dado** um criador cujo quiz mais recente não tem título nem capa
- **Quando** ele abre a página inicial
- **Então** esse quiz aparece como "Quiz sem título", com a imagem padrão, "0 perguntas" e a última modificação em tempo relativo

#### CA-16 — Abrir um quiz pelo painel

- **Dado** um criador na página inicial
- **Quando** ele aciona um quiz de "Seus quizzes"
- **Então** chega à tela desse quiz

#### CA-17 — Painel sem nenhum quiz

- **Dado** um criador que não tem nenhum quiz fora da lixeira
- **Quando** ele abre a página inicial
- **Então** no lugar da lista vê um estado vazio que convida a criar o primeiro quiz
- **E** a ação desse estado vazio abre o mesmo formulário de criação da barra superior

#### CA-18 — Relatórios ainda não existem

- **Dado** um criador na página inicial
- **Quando** ele olha o cartão "Relatórios mais recentes"
- **Então** vê a marcação "Em breve" e a explicação de que os relatórios chegam com as partidas, sem nenhum dado

#### CA-19 — Carregando

- **Dado** um criador abrindo a página inicial
- **Quando** os quizzes ainda estão sendo carregados
- **Então** "Seus quizzes" mostra marcadores de lugar no formato da lista, e o restante da página já está utilizável

#### CA-20 — Falha ao carregar os quizzes

- **Dado** um criador na página inicial
- **Quando** o carregamento de "Seus quizzes" falha
- **Então** esse cartão mostra uma mensagem de erro com a opção de tentar novamente
- **E** a navegação principal, a pesquisa e a ação Criar continuam funcionando

## Experiência (telas e estados)

- **Apresentação pública (`/` sem sessão)**: o que já existe hoje — marca, frase de apresentação e as ações de entrar e criar conta. Sem navegação principal, pesquisa ou Criar.
- **Página inicial (`/` com sessão)**, em três áreas:
  - **Navegação principal**, na barra lateral em telas largas e atrás de um botão em telas estreitas: Início, Biblioteca, Relatórios ("Em breve"), Descobrir ("Em breve"), Grupos ("Em breve"). O item ativo é destacado.
  - **Barra superior**: marca à esquerda (leva à página inicial), campo de pesquisa ao centro com o texto de apoio "Pesquisar nos meus quizzes", e à direita a ação **Criar** em destaque e o menu do usuário. Sem nenhum link de navegação.
  - **Corpo**: saudação com o nome do criador; cartão **"Seus quizzes"** com a lista (capa, título, número de perguntas, última modificação) e o link "Ver tudo (N)"; cartão **"Relatórios mais recentes"** marcado "Em breve".
- **Biblioteca**: a mesma casca (barra lateral + barra superior), e no topo do conteúdo as **abas** Recentes, Rascunhos e Lixeira, com a seção aberta marcada. Abaixo delas seguem a pesquisa da biblioteca e a lista, como na spec 001. A coluna lateral de seções deixa de existir.
- **Estados**:
  - Carregando: marcadores de lugar no formato da lista, dentro do cartão.
  - Vazio: convite a criar o primeiro quiz (CA-17).
  - Erro: mensagem no cartão afetado, com a opção de tentar novamente; o resto da página continua utilizável.
  - "Em breve": marcação visível e anunciada, sem link e sem dados.

## Divergências intencionais do Kahoot

- **Sem cartões promocionais**. A home do Kahoot abre com um carrossel de propaganda de recursos pagos e um banner de upgrade. O Quizio não tem planos (constituição, artigo VI), então nada disso existe.
- **Sem "Lista de tarefas", "Cursos" e "Sessões do curso"**. Cursos são outro tipo de conteúdo, declarado fora de escopo na referência (§11.1); a lista de tarefas é onboarding do produto pago.
- **Sem "Kahootopia!", "Aprendizagem de idiomas" e "Features"** na navegação: são produtos e vitrines comerciais do Kahoot, não funcionalidades do Quizio.
- **Sem cartão "Atribuições"** por ora. Atribuir chega na feature 010; quando chegar, ela decide se ganha espaço no painel.
- **A pesquisa da barra superior busca a própria biblioteca** (RN-10). No Kahoot ela busca conteúdo público, que o Quizio só terá na descoberta (013). Quando a descoberta existir, esta spec precisa ser revisitada.
- **A Lixeira é uma aba** (RN-22). No Kahoot, a biblioteca tem uma segunda coluna (Kahoots, Histórias, Cursos, Minhas pastas, Lixeira) e só então as abas (Recentes, Rascunhos, Favoritos, Compartilhados comigo). O Quizio não tem histórias nem cursos, então essa coluna ficaria com um item só; as três seções viram abas no mesmo nível. Pastas e favoritos chegam na 012 e decidem então se a coluna volta.
- **Pontos de entrada do que ainda não existe ficam visíveis** (RN-05). O Kahoot não mostra o que não vende; o Quizio mostra o próprio roadmap, porque é um produto pessoal em construção e isso evita redesenhar a navegação a cada feature.

## Fora de escopo

- Qualquer dado real de relatórios, atribuições, grupos ou descoberta: estes cartões e itens são apenas marcações "Em breve" (features 006, 010 e 013).
- Ações de quiz no painel além de abrir (editar dados, duplicar e excluir continuam na biblioteca).
- Notificações, central de ajuda e qualquer conteúdo promocional.
- Personalização do painel: escolher, reordenar ou esconder cartões.
- Pesquisa com sugestões, histórico ou resultados fora da biblioteca.
- Alterar as regras da biblioteca da spec 001 (quais seções existem, ordenação, pesquisa, lixeira). Muda só onde as seções aparecem: abas no lugar da coluna lateral (RN-22).
- Preservar a pesquisa ao trocar de aba: continua limpando, como hoje (RN-23).
- Tema escuro: continua reservado às telas de jogo.

## Perguntas em aberto

- [ ] **"Recentes" depois das partidas** — herdada da spec 001: quando existirem partidas, organizar uma partida deve trazer o quiz para o topo de "Seus quizzes"? Decidir na feature 004.
- [ ] **Registrar a tela inicial na referência funcional** — a `kahoot-reference.md` documenta a biblioteca (§11.1) mas não a home. Vale abrir uma seção descrevendo-a, ou as decisões desta spec bastam como fonte?
- [ ] **Limite de 6 quizzes no painel (RN-15)** — escolhido por caber no cartão sem rolagem; revisar depois de usar com volume real.

## Changelog

- 2026-09-25 — spec criada. Decisões do produto registradas: `/` atende visitante e criador (RN-01); o destino padrão após entrar passa a ser a página inicial (RN-02); pontos de entrada de features futuras ficam visíveis e marcados "Em breve" (RN-05); a pesquisa da barra superior busca a biblioteca do próprio criador (RN-10). A feature entrou no roadmap como 002, empurrando as demais em um número.
- 2026-09-25 — spec aprovada. Numeração 002 confirmada com o roadmap renumerado, `/` servindo visitante e criador, pontos de entrada futuros visíveis como "Em breve" e busca restrita à biblioteca do próprio criador.
- 2026-09-25 — revisão depois de rever a referência do Kahoot: a navegação sai de vez da barra superior (RN-04, RN-09) e as seções de uma área passam a ser abas no topo do conteúdo (RN-22, RN-23). Na Biblioteca, Recentes/Rascunhos/Lixeira deixam a coluna lateral e viram abas. Acrescentados CA-21 e CA-22.
- 2026-09-25 — implementada. Todos os 22 CAs têm teste automatizado verde (core, PGlite, API, componentes e E2E desktop/mobile). Descobertas registradas no plano:
  - O `Link` do TanStack impõe `aria-current="page"` quando a própria rota casa, então a regra de área ativa (RN-06) virou a função pura `activeMainNavLabel`, testada à parte, e o item Início ganhou `activeOptions={{ exact: true }}`.
  - O primitivo `Button` com `render={<Link/>}` é anunciado como botão (Base UI aplica `role="button"`), então a apresentação pública usa `Link` com `buttonVariants`, preservando semântica de navegação.
  - A barra superior transbordava na horizontal em 412 px, o que fazia o Chrome reduzir o zoom e jogar os avisos para fora da área visível; em telas estreitas a pesquisa passou a ocupar a própria linha.
