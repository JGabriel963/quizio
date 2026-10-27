---
id: "040"
title: Notificações
status: done # draft | approved | planned | in-progress | done
contexts: [groups, identity]
created: 2026-10-27
---

# 040 — Notificações

## Contexto e problema

Os grupos (specs 034 a 038) trouxeram publicações, quizzes compartilhados e atribuições, mas o criador só descobre o que aconteceu num grupo se abrir o grupo. As cinco specs deixaram **"Notificações"** fora de escopo, apontando para **o sino da barra superior**, que o Quizio ainda não tem.

As capturas do Kahoot mandadas pelo usuário em 2026-10-27 (junto com as da spec 039) mostram:

1. o **sino** na barra superior, à direita da foto, com um **ponto vermelho** quando há novidades;
2. o painel **"Notificações"**, aberto pelo sino, com **⋮** e a seção **"Novo"**: cada notificação tem o ícone de quem agiu com a marca de grupo, o **nome** em negrito, **"compartilhou uma nova postagem com o grupo GRUPO 1."** ou **"compartilhou novos kahoots com o grupo GRUPO 1."** e, em azul, o **ponto** e **"há 15 horas"**, sobre um fundo azul-claro;
3. o mesmo painel com o sino já aberto, sem o ponto vermelho;
4. a **página da publicação** que a notificação abre: **voltar**, "{nome} compartilhou um kahoot", a data, o cartão do kahoot com **Iniciar** e ⋮, "0 curtidas" e **Curtir**, com a coluna de grupos ao lado.

## Objetivo

O criador vê no sino, de qualquer tela, o que os outros fizeram nos seus grupos desde a última vez, e vai direto à publicação ou à tela do grupo com um clique.

## Personas

- **Membro** (o administrador incluído) — recebe as notificações dos grupos em que está.
- **Administrador** — recebe também as entradas no grupo.

## Histórias de usuário

- **HU-01** — Como membro, quero ver no sino quando há novidades nos meus grupos, para não ter que abrir grupo por grupo.
- **HU-02** — Como membro, quero abrir uma notificação e cair direto na publicação, para ver e reagir a ela.
- **HU-03** — Como membro, quero marcar todas como lidas, para limpar o que já vi.
- **HU-04** — Como administrador, quero saber quando alguém entra no meu grupo, para acompanhar quem está chegando.
- **HU-05** — Como membro, quero saber quando fui removido de um grupo ou ele foi excluído, para entender por que ele sumiu.

## Regras de negócio

### O que gera notificação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Uma **notificação (`Notification`)** é um aviso para **uma pessoa** sobre algo que **outra pessoa** fez num grupo. Ninguém é notificado do que ele mesmo fez. | captura 2 · decisão do produto (2026-10-27) |
| RN-02 | Uma **publicação de texto, imagem ou PDF** (spec 036) notifica **todos os membros** do grupo, menos quem publicou: **"{nome} compartilhou uma nova postagem com o grupo {grupo}."**. | captura 2 · spec 036 |
| RN-03 | **Compartilhar quizzes** com o grupo (spec 037, RN-06) notifica todos os membros, menos quem compartilhou: **"{nome} compartilhou um novo kahoot com o grupo {grupo}."** com um quiz e **"{nome} compartilhou novos kahoots com o grupo {grupo}."** com vários. | captura 2 · spec 037, RN-06 |
| RN-04 | **Atribuir** no grupo (spec 038) notifica todos os membros, menos quem atribuiu: **"{nome} atribuiu um kahoot ao grupo {grupo}."**. | spec 038, RN-14 · decisão do produto (2026-10-27) |
| RN-05 | A **entrada** de alguém pelo link de convite (spec 034, RN-25) notifica **só o administrador**: **"{nome} entrou no grupo {grupo}."**. | spec 034 (fora de escopo: notificações de entrada) · decisão do produto (2026-10-27) |
| RN-06 | Ser **removido** de um grupo notifica quem saiu: **"Você foi removido do grupo {grupo}."**; a **exclusão** do grupo notifica todos os membros, menos o administrador: **"O grupo {grupo} foi excluído."**. Sair por conta própria não notifica ninguém. | spec 034 (fora de escopo: notificações de remoção e exclusão) · decisão do produto (2026-10-27) |
| RN-07 | Curtidas, mudanças nas Configurações do grupo, comentários e menções **não** geram notificação. | decisão do produto (2026-10-27) |
| RN-08 | Só recebe a notificação quem é membro **no momento** em que a ação acontece: quem entra depois não recebe as notificações do que veio antes. | decisão do produto (2026-10-27) |

### O sino

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | O **sino** fica na barra superior de todas as telas da área do criador, **à direita da foto** da conta, com o rótulo acessível "Notificações". | capturas 1 e 3 |
| RN-10 | O sino mostra um **ponto vermelho** quando há notificações que chegaram **depois da última vez que o painel foi aberto**; abrir o painel tira o ponto, sem marcar as notificações como lidas. O rótulo acessível passa a ser "Notificações, há novidades". | capturas 1 e 3 · decisão do produto (2026-10-27) |
| RN-11 | Uma notificação nova chega ao sino **sem recarregar a página**, em poucos segundos, em qualquer tela da área do criador. | decisão do produto (2026-10-27) |

### O painel

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-12 | O sino abre o painel **"Notificações"** sob ele (em telas estreitas, na largura da tela), com **⋮** no cabeçalho. Esc, clicar fora ou acionar o sino de novo fecham o painel. | capturas 2 e 3 |
| RN-13 | O painel tem duas seções: **"Novo"** (as **não lidas**) e **"Anteriores"** (as lidas), cada uma dos mais novos para os mais antigos; uma seção vazia não aparece. Mostra as **20 mais recentes** e, rolando até o fim, as 20 seguintes. | captura 2 · decisão do produto (2026-10-27) |
| RN-14 | Cada notificação mostra a **foto** de quem agiu (spec 039; o ícone padrão sem foto) com a **marca de grupo** no canto, o **nome** em negrito, o texto com o **nome do grupo** em negrito e o tempo ("agora", "há 5 minutos", "há 15 horas", "há 3 dias"). As **não lidas** têm o fundo azul-claro e o **ponto azul** antes do tempo, em azul; as lidas, fundo branco e tempo em cinza. As de RN-06 mostram o **ícone de grupo** no lugar da foto. | captura 2 |
| RN-15 | O **⋮** tem **"Marcar todas como lidas"**, indisponível quando não há não lidas: todas passam para "Anteriores". | captura 2 · decisão do produto (2026-10-27) |
| RN-16 | Sem nenhuma notificação, o painel diz "Você não tem notificações." e explica "As novidades dos seus grupos aparecem aqui.". | decisão do produto (2026-10-27) |

### Abrir uma notificação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | Acionar uma notificação a **marca como lida**, fecha o painel e leva a: a **página da publicação** (RN-19), nas de RN-02 a RN-04; **Membros do grupo**, nas de RN-05. As de RN-06 só são marcadas como lidas, sem levar a lugar nenhum. | captura 4 · decisão do produto (2026-10-27) |
| RN-18 | Uma notificação cuja publicação foi **excluída**, ou de um grupo de que a pessoa **não é mais membro** (saiu, foi removida, o grupo foi excluído) ou que foi **excluído**, **some do painel** — menos as de RN-06, que existem justamente para esses casos. Some também a de quem excluiu a conta (spec 039, RN-39). | decisão do produto (2026-10-27) |

### Página da publicação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-19 | A **página da publicação (`GroupPostPage`)** mostra **uma publicação** do mural exatamente como no mural (cabeçalho, data, ⋮, texto, anexo, curtidas e Curtir, specs 036 a 038), com **voltar** à aba Atividade do grupo, dentro da tela do grupo com a coluna de grupos ao lado. Tem endereço próprio e só abre para os membros (spec 034, RN-05). | captura 4 |
| RN-20 | Uma publicação que **não existe mais** mostra "Esta publicação não está mais disponível." com **Voltar ao grupo**. Excluir a publicação pela página volta ao mural. | decisão do produto (2026-10-27) |

### Guarda

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | As notificações **lidas** com mais de **90 dias** deixam de aparecer. O prazo é um limite técnico da instância, configurável. | constituição, artigo VI · decisão do produto (2026-10-27) |
| RN-22 | Cada pessoa só vê **as próprias** notificações; nenhuma tela mostra as de outra pessoa. | decisão do produto (2026-10-27) |

## Critérios de aceite

### CA-01 — Publicação notifica os outros membros

- **Dado** um grupo "GRUPO 1" com Ana (administradora), Bruno e Carla
- **Quando** Bruno publica uma mensagem
- **Então** Ana e Carla veem no painel, em "Novo", "Bruno compartilhou uma nova postagem com o grupo GRUPO 1." com "agora"
- **E** Bruno não recebe notificação

### CA-02 — Compartilhar um e vários quizzes

- **Dado** o mesmo grupo
- **Quando** Bruno compartilha um quiz e, depois, três quizzes de uma vez
- **Então** Ana vê "Bruno compartilhou um novo kahoot com o grupo GRUPO 1." e "Bruno compartilhou novos kahoots com o grupo GRUPO 1."

### CA-03 — Atribuir no grupo

- **Quando** Ana atribui um quiz ao grupo
- **Então** Bruno e Carla veem "Ana atribuiu um kahoot ao grupo GRUPO 1." e Ana não recebe nada

### CA-04 — Entrada no grupo

- **Dado** o link de convite do GRUPO 1
- **Quando** Davi aceita o convite
- **Então** só Ana vê "Davi entrou no grupo GRUPO 1.", e acioná-la abre Membros do grupo

### CA-05 — Remoção e exclusão

- **Quando** Ana remove Carla do grupo
- **Então** Carla vê "Você foi removido do grupo GRUPO 1." com o ícone de grupo, e acioná-la só a marca como lida
- **Quando** Ana exclui o grupo
- **Então** Bruno vê "O grupo GRUPO 1 foi excluído." e Ana não recebe nada
- **E** as notificações de publicações do GRUPO 1 somem do painel de Bruno

### CA-06 — Quem entra depois

- **Dado** uma publicação feita no grupo antes da entrada de Davi
- **Então** Davi não tem notificação dela

### CA-07 — Ponto vermelho

- **Dado** Ana com o painel fechado e sem novidades
- **Quando** Bruno publica
- **Então** o sino de Ana ganha o ponto vermelho sem recarregar a página
- **Quando** Ana abre o painel
- **Então** o ponto some e a notificação continua em "Novo", com fundo azul-claro e ponto azul

### CA-08 — Abrir uma notificação

- **Dado** a notificação da publicação de Bruno em "Novo"
- **Quando** Ana a aciona
- **Então** o painel fecha e abre a página da publicação, com voltar, a publicação, as curtidas e Curtir
- **E** ao abrir o painel de novo, a notificação está em "Anteriores", com fundo branco e tempo em cinza

### CA-09 — Marcar todas como lidas

- **Dado** três notificações não lidas
- **Quando** Ana aciona ⋮ › Marcar todas como lidas
- **Então** as três passam para "Anteriores", "Novo" some e a opção fica indisponível

### CA-10 — Painel vazio

- **Dado** um criador sem notificações
- **Quando** ele abre o painel
- **Então** vê "Você não tem notificações." e "As novidades dos seus grupos aparecem aqui."

### CA-11 — Mais de 20

- **Dado** 25 notificações
- **Quando** Ana abre o painel
- **Então** vê as 20 mais recentes e, rolando até o fim, as outras 5

### CA-12 — Publicação excluída

- **Dado** Ana com a notificação de uma publicação de Bruno
- **Quando** Bruno exclui a publicação
- **Então** a notificação some do painel de Ana
- **E** o endereço da publicação mostra "Esta publicação não está mais disponível." com Voltar ao grupo

### CA-13 — Página da publicação só para membros

- **Dado** o endereço de uma publicação do GRUPO 1
- **Quando** alguém que não é membro o abre
- **Então** vê a mesma tela de um grupo que não existe

### CA-14 — Foto de quem agiu

- **Dado** Bruno com foto (spec 039) e Carla sem foto
- **Então** as notificações de Bruno mostram a foto dele e as de Carla, o ícone padrão, ambas com a marca de grupo

### CA-15 — Guarda de 90 dias

- **Dado** uma notificação lida há 91 dias e uma não lida há 91 dias
- **Então** só a não lida aparece no painel

### CA-16 — Celular

- **Dado** uma tela estreita
- **Quando** o criador aciona o sino
- **Então** o painel ocupa a largura da tela e fecha com o sino ou Esc

## Experiência (telas e estados)

- **Barra superior**: o sino à direita da foto; ponto vermelho no canto quando há novidades.
- **Painel**: cabeçalho "Notificações" com ⋮; seções "Novo" e "Anteriores"; lista rolável com altura limitada; carregando (esqueletos de três linhas); vazio (RN-16); falha ao carregar ("Não foi possível carregar as notificações." com **Tentar de novo**).
- **Página da publicação**: a tela do grupo, com a coluna de grupos, o botão voltar e a publicação num cartão; estado indisponível (RN-20).

## Divergências intencionais do Kahoot

- **"Anteriores"**: as capturas mostram só "Novo"; o Quizio dá nome à seção das lidas.
- **Entrada, remoção e exclusão do grupo** notificam (o Kahoot não mostrou nas capturas): as specs 034 e 038 os deixaram para o sino.
- **"Atribuiu um kahoot ao grupo"**: no Kahoot, a atribuição chega como postagem; o Quizio diz o que foi.
- **Sem e-mails**: as notificações ficam só no sino (o Quizio não envia e-mail; spec 039).

## Fora de escopo

- Notificações por **e-mail** e **push** no celular.
- **Silenciar** um grupo ou escolher que tipo de notificação receber.
- Notificações de **curtidas**, **comentários**, **menções** e de coisas fora dos grupos (fim de uma atribuição, relatórios).
- Excluir uma notificação.

## Perguntas em aberto

- [ ] O fim do prazo de uma atribuição (spec 029) deveria avisar quem a criou? — fica fora; pode entrar depois sem mudar o painel.

## Changelog

- 2026-10-27 — spec criada a partir das capturas do sino e da página da publicação do Kahoot, junto com a spec 039.
- 2026-10-27 — spec entregue (status `done`). Todos os 16 CAs têm teste automatizado verde (core, PGlite, realtime, API, componentes e E2E desktop/celular). Escolhas feitas na implementação, dentro das regras:
  - as notificações são uma leitura dos grupos (ADR 0020): publicação excluída, saída, remoção, grupo ou conta excluídos as tiram sem código de limpeza;
  - na entrega, as contas existentes começam com tudo lido e visto, para o histórico dos grupos não chegar como "Novo";
  - o sino mora ao lado da foto, dentro do menu da conta com sessão; o painel é um `Popover` novo do design system;
  - "Mostrar mais" carrega mais 20 também quando a lista chega ao fim (rolagem);
  - a página da publicação é `/groups/{grupo}/posts/{publicação}`, com o mesmo cartão do mural.
