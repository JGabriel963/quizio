---
id: "042"
title: Temas prontos
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game]
created: 2026-10-27
---

# 042 — Temas prontos

## Contexto e problema

Todas as telas de jogo do Quizio têm o mesmo fundo: o roxo liso do design system (spec 008, "Sem o cenário e sem temas"). No Kahoot, o criador escolhe um **tema (`Theme`)** para o quiz, que muda o fundo e as cores da tela do editor, do lobby, das perguntas, do placar, do pódio e do celular do jogador (kahoot-reference §2 e §3.1). É a personalização mais visível de um quiz, e no Kahoot boa parte dela é paga.

Esta é a primeira de duas specs de temas. Esta entrega o catálogo de **temas prontos** e o tema aplicado em todas as telas de jogo. Os **temas personalizados** ("Crie seu tema": logotipo, fundo enviado, cor de contraste e "Seus temas") ficam para a spec 043.

## Objetivo

O criador escolhe um tema pronto num painel do editor, vê o tema na hora atrás da pergunta, e toda partida ao vivo ou atribuição criada depois aparece com esse tema, com o texto sempre legível.

## Personas

- **Criador**: escolhe o tema no editor.
- **Anfitrião**: apresenta a partida com o tema do quiz.
- **Jogador / participante**: vê o tema no celular, ao vivo e na atribuição.

## Histórias de usuário

- **HU-01** — Como criador, quero escolher um tema pronto para o meu quiz, para dar a ele uma cara própria sem precisar desenhar nada.
- **HU-02** — Como criador, quero ver o tema atrás da pergunta enquanto edito, para saber como o quiz vai aparecer no jogo.
- **HU-03** — Como anfitrião, quero que o lobby, as perguntas, o placar e o pódio apareçam com o tema do quiz, para a partida ter o clima que o criador escolheu.
- **HU-04** — Como jogador, quero ver o mesmo tema no celular, para sentir que estou na mesma partida da tela grande.
- **HU-05** — Como participante de uma atribuição, quero jogar com o tema do quiz.
- **HU-06** — Como criador, quero escolher o tema também pelo celular.

## Regras de negócio

### Catálogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O Quizio tem um **catálogo de temas prontos**, todos gratuitos. Cada tema tem um nome em português, um fundo, uma **cor de destaque** e um **tom (`ThemeTone`)**: escuro (`dark`) ou claro (`light`). | kahoot-reference §2 (Tema) · constituição, artigo VI |
| RN-02 | O catálogo tem **14 temas em 3 grupos**: **Padrão** (Padrão, o roxo de hoje); **Cores**, todos escuros (Roxo, Azul, Verde-azulado, Vermelho, Laranja, Grafite); e **Claros**, todos claros (Claro, Azul claro, Verde claro, Amarelo claro, Laranja claro, Lilás, Bege). | decisão do produto (2026-10-27) |
| RN-03 | A arte dos temas é **própria do Quizio**: fundos geométricos (degradês, curvas e montanhas), sem ilustrações do Kahoot. | decisão do produto (2026-10-27) · ADR 0013 (mesmo motivo para os avatares) |
| RN-04 | O **tema padrão** é **Padrão**. Todo quiz que já existe, todo quiz novo e toda partida ou atribuição criada antes desta feature aparecem com ele, ou seja, exatamente como hoje. | decisão do produto (2026-10-27) |
| RN-05 | O servidor só aceita temas do catálogo (`QUIZ.UNKNOWN_THEME`). Um tema guardado que deixou de existir no catálogo aparece como **Padrão**, sem erro. | decisão do produto (2026-10-27) |

### No quiz

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | O **tema do quiz (`Quiz.themeId`)** é escolhido pelo criador no editor e **salvo ao escolher**, como o resto do editor. | kahoot-reference §3.1 (Tema) |
| RN-07 | O tema **não faz parte da versão jogável**, como título, descrição, capa e visibilidade (spec 006): trocá-lo **não** gera "Alterações não salvas" nem pede Salvar, e vale também num rascunho nunca salvo. | decisão do produto (2026-10-27) · spec 006 |
| RN-08 | Duplicar um quiz copia o tema: a cópia do próprio criador, "Duplicar" e "Duplique para editar" de um quiz compartilhado ou público (specs 001, 037 e 039). | decisão do produto (2026-10-27) |
| RN-09 | Os temas prontos não são arquivos do criador: nada é enviado nem apagado ao escolher, trocar ou excluir. Os arquivos dos temas personalizados (spec 043) seguem as regras já existentes para imagens: só são apagados quando nada mais os usa. | decisão do produto (2026-10-27) · spec 007 |

### Na partida e na atribuição

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | Uma partida ao vivo **copia o tema do quiz quando é criada** ("Organizar ao vivo", "Jogar novamente", "Iniciar" de um quiz compartilhado). Uma atribuição faz o mesmo, também quando é criada num grupo. | decisão do produto (2026-10-27) · kahoot-reference §2 (o criador define o tema padrão da sessão) |
| RN-11 | Trocar o tema do quiz **não muda** uma partida ou atribuição já criada, nem no lobby. A próxima partida usa o tema novo. | decisão do produto (2026-10-27) |
| RN-12 | O anfitrião **não troca** o tema na hora de jogar nesta entrega. | decisão do produto (2026-10-27) · diverge de kahoot-reference §3.1 |
| RN-13 | O tema vale em **todas as telas de jogo do anfitrião**: lobby, abertura da pergunta, pergunta, revelação, placar, pódio e classificação, e partida encerrada. A tela de abertura, que aparece antes de a partida existir, usa o tema do quiz quando a página de onde ela foi aberta já o conhece (página do quiz, editor, quiz compartilhado ou público) e **Padrão** quando abre da biblioteca. | kahoot-reference §2 (aparência visual da partida) · decisão do produto (2026-10-27, plano) |
| RN-14 | O tema vale no **celular do jogador a partir do momento em que a partida é conhecida**: apelido, personagem, espera, pergunta, resultado, fim e avisos de conexão. A entrada do PIN (`/join` sem partida) continua com **Padrão**, porque ainda não se sabe qual é a partida. | decisão do produto (2026-10-27) |
| RN-15 | O tema vale em **todas as telas da atribuição**: capa, apelido, personagem, perguntas, resultado, Pontuações e fim. | decisão do produto (2026-10-27) |
| RN-16 | Uma **imagem usada como fundo** de uma pergunta (spec 007) cobre o tema naquela pergunta, no editor e no jogo, como hoje. | spec 007, RN-23 |
| RN-17 | Diálogos, painéis e cartões brancos (o PIN no lobby, o enunciado, os diálogos de confirmação) continuam brancos sobre qualquer tema. As alternativas continuam com as cores e as formas fixas (`answer-red/blue/yellow/green`), em todos os temas. | kahoot-reference §6.5 · constituição, artigo VIII |
| RN-18 | O tema não aparece fora do jogo e do editor: relatórios, biblioteca, página do quiz e grupos continuam no tema claro do Quizio. | spec 015, RN-54 · spec 002 |

### Contraste

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-19 | **O contraste é automático**: o texto e os ícones que ficam direto sobre o fundo do tema ou sobre a cor de destaque (o nome do Quizio, os apelidos no lobby, o placar, o pódio, os avisos do celular) usam a cor clara ou a escura, a que for mais legível. | decisão do usuário (2026-10-27) |
| RN-20 | Em todos os temas do catálogo, esse texto tem contraste de **pelo menos 4,5:1** com o que está atrás dele. Um tema que não alcance isso não entra no catálogo. | decisão do produto (2026-10-27) · WCAG 2.2, critério 1.4.3 |
| RN-21 | Num tema claro, as telas de jogo deixam o visual escuro: o texto sobre o fundo fica escuro (como "Light" e "Light blue" no Kahoot). | referência visual do Kahoot (2026-10-27) |

### Painel de temas no editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | À direita do editor fica uma **barra com dois botões**, "Temas" e "Propriedades", cada um com ícone e nome; o que está aberto fica destacado. O editor abre com "Propriedades". | referência visual do Kahoot (2026-10-27) |
| RN-23 | O painel "Temas" tem o título "Temas" e o X que fecha o painel; com o painel fechado, a pergunta ganha a largura, e um botão da barra o abre de novo. O X do painel de propriedades faz o mesmo. | referência visual do Kahoot (2026-10-27) |
| RN-24 | No topo do painel fica a seção **"Seus temas"** com o quadro tracejado e o "+", marcado como **"Em breve"** até a spec 043. Abaixo, os grupos do catálogo (RN-02), cada um com o nome e a seta que recolhe e expande; todos começam abertos. | referência visual do Kahoot (2026-10-27) · decisão do produto |
| RN-25 | Cada tema aparece como **miniatura** do fundo, em duas colunas, com o nome numa faixa na base. O tema do quiz fica com a borda azul. | referência visual do Kahoot (2026-10-27) |
| RN-26 | Escolher um tema troca o fundo da pergunta **na hora**, mostra a carga na miniatura enquanto salva e usa o estado de salvamento do cabeçalho de sempre ("Salvando…", "Salvo", "Não foi possível salvar · Tentar de novo"). Se o salvamento falhar, o tema anterior volta. | spec 003 (salvamento automático) · referência visual do Kahoot (2026-10-27) |
| RN-27 | Os temas são escolhidos também pelo teclado; o leitor de tela anuncia o nome de cada um e qual está escolhido. | constituição, artigo VIII · decisão do produto |
| RN-28 | Em **telas estreitas**, onde a barra da direita não cabe, um botão **"Temas"** no editor abre o mesmo painel deslizante, como as propriedades já fazem nessas telas. | decisão do usuário (2026-10-27) |
| RN-29 | O **centro do editor** mostra o fundo do tema escolhido atrás do enunciado, da mídia e das respostas, com o contraste automático no que fica direto sobre o fundo. | referência visual do Kahoot (2026-10-27) |

## Critérios de aceite

### Catálogo

#### CA-01 — Catálogo completo

- **Dado** o painel "Temas" aberto
- **Quando** o criador olha os grupos
- **Então** vê "Seus temas" com o "+" marcado "Em breve" e os grupos Padrão (1 tema), Cores (6) e Claros (7), cada tema com a miniatura e o nome

#### CA-02 — Quizzes de antes continuam iguais

- **Dado** um quiz criado antes desta feature e uma partida aberta dele
- **Quando** o criador abre o editor e o anfitrião volta à partida
- **Então** os dois aparecem com Padrão, o mesmo roxo de antes, e a miniatura Padrão está marcada no painel

#### CA-03 — Tema fora do catálogo é recusado

- **Dado** um pedido para salvar o tema de um quiz com um tema que não está no catálogo
- **Quando** o servidor recebe o pedido
- **Então** recusa com `QUIZ.UNKNOWN_THEME`, e o tema do quiz não muda

#### CA-04 — Tema que saiu do catálogo

- **Dado** um quiz e uma partida guardados com um tema que não existe mais no catálogo
- **Quando** o editor e as telas de jogo abrem
- **Então** aparecem com Padrão, sem erro

#### CA-05 — Contraste em todo o catálogo

- **Dado** cada tema do catálogo
- **Quando** o texto direto sobre o fundo e sobre a cor de destaque recebe a cor automática
- **Então** o contraste é de pelo menos 4,5:1 em todos eles

### Editor

#### CA-06 — Escolher um tema

- **Dado** um quiz com o tema Padrão aberto no editor
- **Quando** o criador abre "Temas" e escolhe "Azul claro"
- **Então** o centro do editor mostra o fundo Azul claro na hora, a miniatura mostra a carga e depois fica com a borda azul, o cabeçalho mostra "Salvo", e ao recarregar a página o tema continua Azul claro

#### CA-07 — Tema não pede Salvar

- **Dado** um quiz publicado, sem alterações não salvas
- **Quando** o criador troca o tema
- **Então** o selo "Alterações não salvas" não aparece e sair do editor não abre o diálogo de alterações não salvas

#### CA-08 — Tema num rascunho

- **Dado** um quiz que nunca foi salvo como versão jogável
- **Quando** o criador escolhe "Vermelho"
- **Então** o tema é salvo e continua no rascunho

#### CA-09 — Falha ao salvar o tema

- **Dado** o editor sem conexão com o servidor
- **Quando** o criador escolhe um tema
- **Então** o cabeçalho mostra "Não foi possível salvar · Tentar de novo", e o tema anterior volta a ficar marcado e no fundo

#### CA-10 — Tema claro no editor

- **Dado** um quiz com o tema "Claro"
- **Quando** o criador olha o centro do editor
- **Então** o que fica direto sobre o fundo aparece em cor escura, e o enunciado e as alternativas continuam com o visual de sempre

#### CA-11 — Imagem de fundo cobre o tema

- **Dado** um quiz com o tema "Laranja" e uma pergunta com a imagem como fundo
- **Quando** o criador seleciona essa pergunta e depois outra sem imagem de fundo
- **Então** a primeira mostra a imagem cobrindo o centro, e a segunda mostra o fundo Laranja

#### CA-12 — Barra Temas e Propriedades

- **Dado** o editor aberto numa tela larga
- **Quando** o criador aciona "Temas", depois "Propriedades" e depois o X do painel
- **Então** o painel troca de Temas para as propriedades da pergunta, com o botão aberto destacado na barra, e o X fecha o painel e deixa a pergunta mais larga, com a barra ainda à mostra

#### CA-13 — Grupos recolhem

- **Dado** o painel "Temas" aberto
- **Quando** o criador aciona a seta de "Cores"
- **Então** os temas de Cores somem e a seta vira; acionando de novo, eles voltam

#### CA-14 — Temas pelo teclado

- **Dado** o painel "Temas" aberto
- **Quando** o criador chega aos temas pelo teclado e escolhe "Grafite" sem usar o mouse
- **Então** o tema Grafite é escolhido e salvo, e o leitor de tela anuncia "Grafite" como escolhido

#### CA-15 — Temas no celular

- **Dado** o editor aberto num celular
- **Quando** o criador aciona "Temas" e escolhe "Verde claro"
- **Então** o painel desliza com os mesmos grupos, sem rolagem horizontal da página, e o tema é salvo e aparece atrás da pergunta

#### CA-16 — Duplicar copia o tema

- **Dado** um quiz com o tema "Lilás", seu e compartilhado num grupo
- **Quando** o criador o duplica, e um membro do grupo usa "Duplicar" no quiz compartilhado
- **Então** as duas cópias nascem com o tema Lilás

### Partida ao vivo

#### CA-17 — Partida com o tema do quiz

- **Dado** um quiz publicado com o tema "Verde-azulado"
- **Quando** o anfitrião aciona "Organizar ao vivo", um jogador entra e a partida vai do lobby até o pódio
- **Então** o lobby, a abertura das perguntas, as perguntas, as revelações, os placares e o pódio aparecem com o fundo Verde-azulado, com as alternativas nas cores e formas de sempre

#### CA-18 — Tema copiado na criação

- **Dado** uma partida aberta, no lobby, de um quiz com o tema "Roxo"
- **Quando** o criador troca o tema do quiz para "Bege" e o anfitrião recarrega o lobby
- **Então** o lobby continua com o tema Roxo
- **E** "Jogar novamente" depois do pódio cria a nova partida com o tema Bege

#### CA-19 — Tema claro na partida

- **Dado** um quiz com o tema "Amarelo claro"
- **Quando** a partida chega ao lobby com jogadores, ao placar e ao pódio
- **Então** o nome do Quizio, os apelidos, os nomes do placar e do pódio aparecem em cor escura, legíveis sobre o fundo, e o cartão do PIN e os diálogos continuam brancos

#### CA-20 — Celular do jogador

- **Dado** uma partida de um quiz com o tema "Azul"
- **Quando** um jogador abre `/join`, digita o PIN, escolhe o apelido e espera no lobby
- **Então** a entrada do PIN aparece com Padrão, e o apelido, a espera, as perguntas e o resultado aparecem com o fundo Azul

#### CA-21 — Imagem de fundo na partida

- **Dado** uma partida de um quiz com o tema "Vermelho" e uma pergunta com imagem como fundo
- **Quando** essa pergunta é mostrada na tela do anfitrião e no celular
- **Então** a imagem cobre o fundo naquela pergunta, e as outras perguntas mostram o fundo Vermelho

### Atribuição

#### CA-22 — Atribuição com o tema do quiz

- **Dado** um quiz com o tema "Laranja claro"
- **Quando** o criador o atribui, e um participante abre o link, joga até o fim
- **Então** a capa, o apelido, as perguntas, o resultado, Pontuações e o fim aparecem com o fundo Laranja claro

#### CA-23 — Atribuição não muda depois de criada

- **Dado** uma atribuição aberta de um quiz com o tema "Azul"
- **Quando** o criador troca o tema do quiz para "Claro" e um participante abre a atribuição
- **Então** a atribuição continua com o tema Azul

#### CA-24 — Atribuição no grupo

- **Dado** um quiz com o tema "Grafite"
- **Quando** um membro o atribui num grupo e um participante abre "Iniciar" no mural
- **Então** a atribuição aparece com o tema Grafite

### Fora do jogo

#### CA-25 — Relatório sem tema

- **Dado** uma partida terminada de um quiz com o tema "Vermelho"
- **Quando** o criador abre o relatório
- **Então** o relatório continua no tema claro do Quizio, sem o fundo do tema

## Experiência (telas e estados)

As telas seguem as capturas do Kahoot enviadas pelo usuário (2026-10-27), com a arte própria do Quizio.

- **Barra da direita do editor**: uma coluna estreita na borda com dois botões empilhados, cada um com ícone e nome embaixo: "Temas" (ícone de paleta) e "Propriedades" (ícone de controles). O aberto tem fundo azul claro e borda azul.
- **Painel "Temas"**: ao lado da barra, no lugar das propriedades, com rolagem própria.
  - Cabeçalho "Temas" em negrito e o X à direita, com uma linha abaixo.
  - "Seus temas" com a seta e, abaixo, o quadro tracejado com o "+" cinza, com a dica "Em breve".
  - Cada grupo: o nome em cinza à esquerda, a seta à direita; abaixo, as miniaturas em duas colunas.
  - Miniatura: o fundo do tema num retângulo de cantos arredondados, com o nome em branco e negrito numa faixa na base, da cor de destaque do tema. Escolhida: borda azul. Salvando: a miniatura escurece com um círculo girando no meio.
- **Centro do editor**: o fundo do tema cobre a área atrás do enunciado, da mídia e das respostas, como o roxo de hoje.
- **Telas estreitas**: o botão "Temas" junto às ações do editor abre o painel deslizante com o mesmo conteúdo e o X para fechar.
- **Telas de jogo**: no lugar do roxo liso, o fundo do tema, que preenche a tela inteira em qualquer tamanho, sem rolagem horizontal. O cabeçalho escuro do anfitrião, os cartões brancos e os diálogos continuam como hoje. Os cartões dos apelidos no lobby e os blocos do pódio usam a cor de destaque do tema, com o texto no contraste automático.
- **Estados**: tema escolhido, salvando o tema, falha ao salvar (o tema anterior volta), painel fechado, grupo recolhido; nas telas de jogo, tema escuro, tema claro e pergunta com imagem de fundo.

## Divergências intencionais do Kahoot

- **Arte própria e menos temas** (RN-02, RN-03): o Kahoot tem dezenas de temas ilustrados (Sports, Festivos, Profissionais, Grátis). O Quizio começa com 14 temas geométricos, desenhados por ele, porque as ilustrações do Kahoot são protegidas.
- **Todos os temas são gratuitos** (RN-01): sem "Faça upgrade" nem aviso de recurso pago (constituição, artigo VI).
- **O anfitrião não troca o tema na hora de jogar** (RN-12): no Kahoot ele pode; aqui fica para depois (decisão do usuário, 2026-10-27).
- **"Seus temas" como "Em breve"** (RN-24): o "Crie seu tema" chega na spec 043.
- **Sem "Ajuda"** na barra da direita.

## Fora de escopo

- Temas personalizados: logotipo, fundo enviado ou da biblioteca, cor de contraste, a prévia em três telas e "Seus temas" (spec 043).
- Trocar o tema na hora de jogar, no painel de configurações do anfitrião.
- Temas ilustrados (estações, esportes, datas festivas) e decorações animadas, como a neve caindo.
- Pré-visualização do quiz (o ícone de olho do Kahoot).
- Música do lobby (spec 025).
- Tema nos relatórios, na biblioteca, na página do quiz e nos grupos.

## Perguntas em aberto

- [x] Os nomes e as cores exatas de cada tema — mantidos os nomes da RN-02; as cores ficaram as do catálogo entregue (todas acima de 4,5:1, conferidas no `/design-system`). Ajustes de arte podem vir depois, com IDs novos (ADR 0021).

## Changelog

- 2026-10-27 — spec criada.
- 2026-10-27 — na implementação, as faixas e etiquetas sobre o fundo (a faixa "Aguardando os participantes", os números da pergunta, as mensagens do celular) seguem o tom do tema: escuras com texto branco num tema escuro, claras com texto escuro num tema claro, como nos temas claros do Kahoot. O cabeçalho do anfitrião e o rodapé do celular continuam escuros em todos os temas. Complementa a RN-19.
- 2026-10-27 — entregue.
- 2026-10-27 — no plano, a RN-13 passou a dizer que a tela de abertura vinda da biblioteca usa Padrão: ela aparece antes de a partida existir, e a listagem não carrega o tema.
