---
id: "043"
title: Temas personalizados
status: done # draft | approved | planned | in-progress | done
contexts: [themes, quiz, game]
created: 2026-10-28
---

# 043 — Temas personalizados

## Contexto e problema

A spec 042 entregou os **temas prontos**: 14 temas próprios do Quizio, escolhidos no painel "Temas" do editor e copiados para cada partida e atribuição. No topo do painel ficou a seção **"Seus temas"** com o "+" marcado "Em breve".

No Kahoot, esse "+" abre o **"Crie seu tema"**. Ali o criador monta um tema com o próprio logotipo, um fundo (um padrão ou uma imagem) e uma **cor de contraste**, que pinta os nomes do lobby e os blocos do pódio. Uma prévia mostra o lobby, a pergunta e o pódio. No Kahoot isso é pago (kahoot-reference, recursos premium, item 6). Uma escola, um curso ou uma empresa quer que o quiz tenha a sua cara.

## Objetivo

O criador monta temas próprios em "Seus temas", vê numa prévia como ficam as telas de jogo, aplica o tema aos seus quizzes como um tema pronto e pode editá-lo ou excluí-lo depois. Toda partida ou atribuição criada com ele aparece com esse fundo, essa cor e esse logotipo, com o texto sempre legível.

## Personas

- **Criador**: cria, edita e exclui os próprios temas e os aplica aos seus quizzes.
- **Anfitrião**: apresenta a partida com o tema, incluindo o logotipo na tela grande.
- **Jogador / participante**: vê o fundo e as cores do tema no celular.
- **Membro de grupo**: joga ou duplica um quiz compartilhado que usa o tema de outra pessoa.

## Histórias de usuário

- **HU-01** — Como criador, quero criar um tema com o logotipo e as cores da minha escola, para que meus quizzes tenham a nossa identidade.
- **HU-02** — Como criador, quero usar uma imagem minha como fundo, para que o quiz combine com o assunto.
- **HU-03** — Como criador, quero ver o lobby, a pergunta e o pódio numa prévia antes de salvar, para saber se ficou legível e bonito.
- **HU-04** — Como criador, quero reaproveitar meus temas em vários quizzes, para não montar tudo de novo.
- **HU-05** — Como criador, quero editar um tema e ver a mudança em todos os quizzes que o usam.
- **HU-06** — Como criador, quero excluir um tema que não uso mais.
- **HU-07** — Como anfitrião, quero que o logotipo do tema apareça no lobby, no placar e no pódio.
- **HU-08** — Como jogador, quero ler tudo no celular, qualquer que seja o fundo escolhido.

## Regras de negócio

### O tema personalizado

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Um **tema personalizado (`CustomTheme`)** pertence a um criador e aparece em **"Seus temas"**, no painel "Temas" do editor, só para ele. É gratuito e não há limite de quantos temas cada criador pode ter. | kahoot-reference, recursos premium, item 6 · constituição, artigo VI |
| RN-02 | Um tema personalizado tem: um **nome**, um **fundo**, uma **cor de contraste (`accentColor`)** e, opcionalmente, um **logotipo (`logo`)**. | referência visual do Kahoot (2026-10-27) |
| RN-03 | O **nome** é obrigatório, de 1 a 30 caracteres, e começa como "Meu tema". Dois temas do mesmo criador podem ter o mesmo nome. | decisão do produto (2026-10-28) |
| RN-04 | O **fundo** é uma de duas coisas: um **padrão de fundo (`BackgroundPattern`)** desenhado na **cor do fundo** escolhida, ou uma **imagem enviada** pelo criador. Não há biblioteca de imagens. | decisão do usuário (2026-10-28) · diverge do Kahoot |
| RN-05 | Há **4 padrões de fundo** próprios do Quizio, geométricos, no mesmo estilo dos temas prontos (spec 042, RN-03). O tema novo começa com o primeiro padrão. | decisão do usuário (2026-10-28) · spec 042, RN-03 |
| RN-06 | A **cor do fundo** e a **cor de contraste** são escolhidas na **biblioteca de cores** (48 cores, 8 tons em 6 faixas, como a do Kahoot) ou num **seletor livre** (quadrado de saturação e brilho, barra de matiz e código hexadecimal, com Cancelar e Ok); as cores escolhidas no seletor ficam em **"Cores personalizadas"** neste navegador. O tema novo começa com o roxo do Quizio no fundo e o azul do Quizio na cor de contraste. | referência visual do Kahoot (2026-10-27) · decisão do produto (2026-10-28) |
| RN-07 | A **imagem de fundo** e o **logotipo** são **recortados no navegador** antes do envio ("Recortar imagem": o logotipo em Paisagem ou Quadrado, o fundo em Paisagem 16:9, com zoom e arrastando a imagem) e seguem a política de mídia do Quizio: **JPEG, PNG, GIF ou WebP de até 10 MB**. Outro formato ou tamanho é recusado antes do envio, e o servidor confere de novo. | spec 007, RN-02 e RN-09 |
| RN-08 | A imagem de fundo **cobre a tela inteira** em qualquer tamanho, cortada pelas bordas quando a proporção não bate, como uma imagem usada como fundo de pergunta (spec 007). | spec 007, RN-23 |
| RN-09 | O logotipo aparece **inteiro**, sem corte, reduzido para caber na sua área. | decisão do produto (2026-10-28) |

### Contraste

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | O contraste continua **automático** (spec 042, RN-19): o texto sobre o fundo e sobre a cor de contraste fica claro ou escuro, o que for mais legível. O criador não escolhe a cor do texto. | spec 042, RN-19 · decisão do usuário (2026-10-27) |
| RN-11 | Uma **cor de contraste** ou uma **cor do fundo** com a qual nem o texto claro nem o escuro chega a **4,5:1** não é aceita: o editor avisa "Essa cor deixa o texto difícil de ler. Escolha uma mais clara ou mais escura." e não deixa salvar. As 12 cores da paleta passam todas. | spec 042, RN-20 · WCAG 2.2, critério 1.4.3 |
| RN-12 | Com uma **imagem de fundo**, o Quizio não sabe o que fica atrás de cada letra. O tom do tema (claro ou escuro) sai do **brilho médio da imagem**, e todo texto que ficaria direto sobre ela fica sobre as **faixas** do tom (as mesmas da spec 042: escuras com texto branco, ou claras com texto escuro). | decisão do produto (2026-10-28) · spec 042, changelog |

### Criar, editar e excluir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | O **"+"** de "Seus temas" deixa de ser "Em breve" e abre o **"Crie seu tema"**, como o do Kahoot: a **prévia** em cima e, embaixo, um cartão com uma linha para o **Nome**, o **Logotipo**, o **Plano de fundo** e a **Cor de contraste**, cada uma abrindo seu painel flutuante. | referência visual do Kahoot (2026-10-27) · spec 042, RN-24 |
| RN-14 | A **prévia** mostra a tela do anfitrião e o celular, no **lobby**, numa **pergunta** ou no **pódio**, escolhidos pelos pontos abaixo dela, com dados de exemplo; muda na hora a cada campo alterado e vai para o lobby ao abrir a cor de contraste. O celular não mostra o logotipo (RN-26). | referência visual do Kahoot (2026-10-27) |
| RN-15 | **Salvar** cria o tema, que entra no topo de "Seus temas" e **passa a ser o tema do quiz aberto**. **Cancelar** (ou Esc, ou o X) fecha sem criar nada; se algo foi alterado, pergunta antes "Descartar este tema?". | decisão do produto (2026-10-28) |
| RN-16 | "Seus temas" mostra os temas do criador do mais recente para o mais antigo, como miniaturas iguais às do catálogo (spec 042, RN-25), com o nome na faixa da cor de contraste. Escolher um aplica ao quiz como um tema pronto (spec 042, RN-26). | spec 042, RN-25 e RN-26 |
| RN-17 | Cada miniatura de "Seus temas" tem o menu **⋮** com **Editar** e **Excluir**. Editar abre o mesmo "Crie seu tema", com o título "Editar tema" e os valores do tema. | referência visual do Kahoot (2026-10-27) · decisão do produto |
| RN-18 | **Editar** um tema muda **todos os quizzes do criador que o usam**, no editor e nas próximas partidas. **Não muda** partidas nem atribuições já criadas, como na troca de tema (spec 042, RN-11). | decisão do usuário (2026-10-28) · spec 042, RN-11 |
| RN-19 | **Excluir** pede confirmação: "Excluir o tema {nome}?", com "{N} quizzes usam este tema e voltarão para o tema Padrão." quando algum o usa. Excluir volta esses quizzes para **Padrão**. As partidas e atribuições já criadas continuam com o tema. | decisão do usuário (2026-10-28) · spec 042, RN-04 |
| RN-20 | Um quiz que estava com o tema excluído, aberto no editor de outra aba, aparece com **Padrão** ao recarregar; escolher de novo o tema excluído é recusado (`THEME.NOT_FOUND`). | decisão do produto (2026-10-28) · spec 042, RN-05 |
| RN-21 | O criador só aplica aos seus quizzes **os próprios temas**. O tema de outra pessoa é tratado como inexistente (`THEME.NOT_FOUND`), como os outros recursos alheios. | decisão do produto (2026-10-28) · arquitetura (`requireOwnedQuiz`) |

### No quiz, na partida e na atribuição

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | Um tema personalizado vale onde vale um tema pronto: no centro do editor, em todas as telas de jogo do anfitrião, no celular do jogador a partir do momento em que a partida é conhecida e em todas as telas da atribuição (spec 042, RN-13 a RN-17 e RN-29). Fora do jogo e do editor, nada muda (spec 042, RN-18). | spec 042, RN-13 a RN-18 e RN-29 |
| RN-23 | Como o tema pronto, **fica fora da versão jogável**: aplicar, editar ou excluir não gera "Alterações não salvas". | spec 042, RN-07 |
| RN-24 | A partida ao vivo e a atribuição **copiam o tema como ele está** quando são criadas, com o fundo, as cores e o logotipo. Editar ou excluir o tema depois não as alcança. | spec 042, RN-10 e RN-11 · decisão do usuário (2026-10-28) |
| RN-25 | Quando um membro de grupo organiza ou atribui um **quiz compartilhado ou público** que usa um tema personalizado, a partida aparece com o tema do dono do quiz. | spec 042, RN-10 · spec 037 |
| RN-26 | O **logotipo** aparece só nas **telas do anfitrião**: no lobby, no placar e no pódio, no lugar do nome do Quizio. O celular do jogador e as telas da atribuição mostram o fundo e as cores, sem o logotipo. | decisão do usuário (2026-10-28) |
| RN-27 | **Duplicar o próprio quiz** mantém o tema personalizado. **Duplicar o quiz de outra pessoa** ("Duplicar" ou "Duplique para editar" de um quiz compartilhado ou público) faz a cópia nascer com **Padrão**: o tema é do dono. Um tema pronto continua sendo copiado nos dois casos (spec 042, RN-08). | decisão do usuário (2026-10-28) · spec 042, RN-08 |

### Arquivos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | A imagem de fundo e o logotipo são **arquivos do tema**: só são apagados quando **nada mais os usa**, nem o tema, nem uma partida ou atribuição que os copiou. Trocar a imagem ou o logotipo e excluir o tema apagam os arquivos antigos quando ficam sem uso. | decisão do usuário (2026-10-27) · spec 007 |
| RN-29 | Um arquivo enviado no "Crie seu tema" que não chegou a ser salvo num tema (Cancelar, aba fechada) é apagado depois. | decisão do produto (2026-10-28) · spec 027 (mesmo cuidado com o PDF) |
| RN-30 | Excluir a conta exclui os temas do criador e os seus arquivos (spec 039). | spec 039 |

## Critérios de aceite

### Criar

#### CA-01 — "Seus temas" deixa de ser "Em breve"

- **Dado** o painel "Temas" aberto num quiz de um criador sem temas próprios
- **Quando** o criador olha "Seus temas"
- **Então** vê o quadro tracejado com o "+" sem o selo "Em breve", e acioná-lo abre "Crie seu tema"

#### CA-02 — Criar com um padrão

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador digita o nome "Escola Azul", escolhe o segundo padrão, a cor do fundo azul-marinho e a cor de contraste amarela, e aciona Salvar
- **Então** o diálogo fecha, "Escola Azul" aparece primeiro em "Seus temas" com a borda azul, o centro do editor mostra o novo fundo e o cabeçalho mostra "Salvo"
- **E** ao recarregar a página o quiz continua com "Escola Azul"

#### CA-03 — Prévia ao vivo

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador troca a cor de contraste
- **Então** a prévia mostra, sem salvar, os cartões dos apelidos no lobby e os blocos do pódio na cor nova, e o fundo nas três telas

#### CA-04 — Imagem de fundo

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador envia um JPEG de 3 MB como fundo e salva
- **Então** a imagem cobre a prévia, o centro do editor e, depois, as telas de jogo, cortada pelas bordas sem deformar

#### CA-05 — Logotipo

- **Dado** um tema com um logotipo PNG
- **Quando** a partida de um quiz com esse tema chega ao lobby, ao placar e ao pódio
- **Então** a tela do anfitrião mostra o logotipo inteiro no lugar do nome do Quizio
- **E** o celular do jogador mostra o fundo e as cores do tema, sem o logotipo

#### CA-06 — Arquivo recusado

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador escolhe um PDF ou uma imagem de 12 MB como fundo ou como logotipo
- **Então** vê "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.", e nada é enviado

#### CA-07 — Nome obrigatório e limite

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador apaga o nome, ou tenta digitar o 31º caractere
- **Então** Salvar fica desativado com o nome vazio, e o campo não aceita mais de 30 caracteres, com o contador à mostra

#### CA-08 — Cor ilegível recusada

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador digita como cor de contraste uma cor com a qual nem o texto claro nem o escuro chega a 4,5:1
- **Então** vê "Essa cor deixa o texto difícil de ler. Escolha uma mais clara ou mais escura.", e Salvar fica desativado
- **E** o servidor também recusa essa cor

#### CA-09 — Código de cor inválido

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador digita "#12345" ou "azul" no código da cor
- **Então** a cor não muda e o campo indica o formato `#RRGGBB`

#### CA-10 — Cancelar

- **Dado** o "Crie seu tema" com o nome e a cor alterados e uma imagem enviada
- **Quando** o criador aciona Cancelar e confirma "Descartar este tema?"
- **Então** nenhum tema é criado, o quiz continua com o tema de antes, e a imagem enviada é apagada depois

#### CA-11 — Texto legível sobre uma imagem clara

- **Dado** um tema com uma imagem de fundo quase branca
- **Quando** a partida mostra o lobby com jogadores e o celular mostra a espera
- **Então** os textos que ficam sobre o fundo aparecem em faixas claras com texto escuro, legíveis

### Usar, editar e excluir

#### CA-12 — Reaproveitar em outro quiz

- **Dado** o tema "Escola Azul" criado num quiz
- **Quando** o criador abre o editor de outro quiz e escolhe "Escola Azul" em "Seus temas"
- **Então** o segundo quiz passa a usar o tema, sem abrir o "Crie seu tema"

#### CA-13 — Editar muda os quizzes

- **Dado** dois quizzes com o tema "Escola Azul"
- **Quando** o criador edita o tema, troca a cor de contraste para verde e salva
- **Então** os dois quizzes mostram a cor nova no editor e nas próximas partidas, e nenhum deles ganha "Alterações não salvas"

#### CA-14 — Editar não muda o que já foi criado

- **Dado** uma partida no lobby e uma atribuição aberta, criadas com o tema "Escola Azul" de logotipo A
- **Quando** o criador troca o logotipo para B e a cor de contraste para verde
- **Então** a partida e a atribuição continuam com o logotipo A e a cor antiga
- **E** "Jogar novamente" depois do pódio cria a partida com o logotipo B e a cor verde

#### CA-15 — Excluir um tema em uso

- **Dado** o tema "Escola Azul" usado por 2 quizzes e por uma atribuição aberta
- **Quando** o criador aciona Excluir no ⋮ do tema
- **Então** vê "Excluir o tema Escola Azul?" e "2 quizzes usam este tema e voltarão para o tema Padrão."
- **E** ao confirmar, o tema some de "Seus temas", os dois quizzes passam a Padrão e a atribuição continua com "Escola Azul"

#### CA-16 — Tema de outro criador

- **Dado** um pedido para aplicar a um quiz o tema personalizado de outro criador, ou um tema excluído
- **Quando** o servidor recebe o pedido
- **Então** recusa com `THEME.NOT_FOUND`, e o tema do quiz não muda

#### CA-17 — "Seus temas" é só do criador

- **Dado** dois criadores, cada um com os seus temas
- **Quando** cada um abre o painel "Temas"
- **Então** vê só os próprios temas em "Seus temas", e o editar e o excluir de um tema alheio são recusados com `THEME.NOT_FOUND`

#### CA-18 — Falha ao salvar o tema

- **Dado** o "Crie seu tema" aberto e o servidor fora do ar
- **Quando** o criador aciona Salvar
- **Então** o diálogo continua aberto com o que foi preenchido e mostra "Não foi possível salvar o tema. Tente de novo."

### Compartilhar e duplicar

#### CA-19 — Quiz compartilhado com tema personalizado

- **Dado** um quiz com o tema "Escola Azul", compartilhado num grupo
- **Quando** um membro do grupo aciona "Organizar ao vivo" e outro aciona "Atribuir"
- **Então** a partida e a atribuição aparecem com o tema "Escola Azul", e o logotipo aparece na tela do membro que organiza

#### CA-20 — Duplicar

- **Dado** um quiz com o tema "Escola Azul", do criador e compartilhado num grupo
- **Quando** o criador duplica o quiz, e um membro do grupo usa "Duplicar" no quiz compartilhado
- **Então** a cópia do criador nasce com "Escola Azul", e a cópia do membro nasce com Padrão, sem que o tema apareça em "Seus temas" do membro

### Arquivos e conta

#### CA-21 — Arquivo trocado é apagado quando ninguém usa

- **Dado** um tema com a imagem de fundo A, sem partidas nem atribuições criadas com ele
- **Quando** o criador troca a imagem para B e salva
- **Então** a imagem A é apagada e a B fica

#### CA-22 — Arquivo copiado por uma partida fica

- **Dado** um tema com a imagem de fundo A e uma atribuição aberta criada com ele
- **Quando** o criador exclui o tema
- **Então** a atribuição continua mostrando a imagem A

#### CA-23 — Excluir a conta

- **Dado** um criador com temas que têm imagem e logotipo
- **Quando** ele exclui a conta
- **Então** os temas e os seus arquivos são apagados

### Celular

#### CA-24 — "Crie seu tema" no celular

- **Dado** o editor aberto num celular
- **Quando** o criador abre "Temas" e aciona o "+"
- **Então** o "Crie seu tema" ocupa a tela, com os campos em cima e a prévia embaixo, uma tela por vez, sem rolagem horizontal

#### CA-25 — Pelo teclado

- **Dado** o "Crie seu tema" aberto
- **Quando** o criador preenche o nome, escolhe o padrão e as cores e salva sem usar o mouse
- **Então** o tema é criado, e o leitor de tela anuncia o padrão e as cores escolhidas pelos nomes

## Experiência (telas e estados)

As telas seguem as capturas do Kahoot enviadas pelo usuário (2026-10-27 e 2026-10-28), com a arte própria do Quizio.

- **"Seus temas"** (painel "Temas"): a seta que recolhe; o quadro tracejado com o "+" e as miniaturas dos temas do criador em duas colunas, como as do catálogo. Cada miniatura tem o ⋮ no canto (Editar, Excluir).
- **"Crie seu tema"** / **"Editar tema"**: um diálogo com o título e o X.
  - **Prévia**: a tela do anfitrião emoldurada como um notebook, com o celular ao lado; três telas (lobby com o PIN e apelidos, uma pergunta com as alternativas, o pódio) e os pontos para trocar.
  - **Cartão** de linhas, cada uma com o nome, uma frase de ajuda e o controle à direita:
    - **Nome**: o campo com o contador.
    - **Logotipo**: "Adicionar logo" (ou "Trocar logo" com a miniatura) abre "Selecionar logotipo", com o quadro tracejado e o "+", e "Remover logotipo".
    - **Plano de fundo**: a miniatura do fundo abre um painel com as abas **Imagem** (os 4 padrões e "Sua imagem", com o "+" para enviar) e **Cor** (as cores).
    - **Cor de contraste** (com o ⓘ explicando onde aparece): a amostra abre "Cores personalizadas" (o "+" abre o seletor) e "Biblioteca de cores".
  - Rodapé: "Cancelar" e "Salvar".
- **"Recortar imagem"**: "Paisagem" e "Quadrado" (só para o logotipo), a imagem sob o recorte, escurecida fora dele, o zoom, "Fechar" e "Salvar".
- **Diálogo de exclusão**: "Excluir o tema {nome}?", a linha dos quizzes que voltam para Padrão, "Cancelar" e "Excluir" em vermelho.
- **Telas do anfitrião**: o logotipo no lugar do nome do Quizio no lobby, no cabeçalho durante a partida e no pódio.
- **Estados**: diálogo vazio (valores iniciais), recortando, enviando um arquivo, arquivo recusado, cor ilegível no seletor, salvando, falha ao salvar, tema com imagem clara ou escura, tema sem logotipo, "Seus temas" vazio e com temas, excluindo.

## Divergências intencionais do Kahoot

- **Gratuito e sem limite de temas** (RN-01): no Kahoot é recurso pago (constituição, artigo VI).
- **Sem biblioteca de imagens** (RN-04): o Quizio não tem uma; o fundo é um padrão próprio ou uma imagem enviada.
- **Padrões próprios** (RN-05): os do Kahoot são arte deles.
- **Cor ilegível é recusada** (RN-11): o Kahoot aceita qualquer cor; aqui o texto precisa passar de 4,5:1 (constituição, artigo VIII).
- **Logotipo só na tela grande** (RN-26): decisão do usuário (2026-10-28). A prévia do Kahoot mostra o logotipo também no celular; a do Quizio mostra o que o jogo mostra.
- **A cópia do quiz de outra pessoa fica com Padrão** (RN-27).

## Fora de escopo

- Biblioteca de imagens e imagens geradas por IA para o fundo.
- Mais de uma cor de contraste, a cor do texto escolhida pelo criador e fontes próprias.
- Compartilhar temas com outros criadores ou com um grupo.
- Trocar o tema na hora de jogar (spec 042, RN-12).
- Logotipo no celular do jogador e nas telas da atribuição.
- Tema nos relatórios, na biblioteca, na página do quiz e nos grupos (spec 042, RN-18).

## Perguntas em aberto

- [x] As cores e os 4 padrões de fundo — a biblioteca tem 48 cores, todas acima de 4,5:1 (as do meio foram escurecidas até passar), mais as personalizadas do seletor; os padrões são Ondas, Montanhas, Círculos e Mosaico, formas translúcidas sobre a cor escolhida.

## Changelog

- 2026-10-28 — spec criada.
- 2026-10-28 — aprovada.
- 2026-10-28 — no plano, os temas personalizados viraram um contexto próprio, `themes`, e os arquivos ficam em `themes/{dono}/`, não em `media/`.
- 2026-10-28 — na implementação, o logotipo toma o lugar do nome do Quizio onde ele aparece nas telas do anfitrião (lobby, cabeçalho durante a partida, pódio); o celular nunca recebe o logotipo (RN-26).
- 2026-10-28 — entregue.
- 2026-10-28 — revisão do layout a pedido do usuário, a partir das capturas do Kahoot: o "Crie seu tema" passou a ter a prévia em cima (notebook e celular, com pontos) e o cartão de linhas com painéis flutuantes; a paleta de 12 cores virou a biblioteca de 48 com "Cores personalizadas" e um seletor de cor livre (RN-06); o logotipo e a imagem de fundo passaram a ser recortados no navegador antes do envio (RN-07), o que saiu de Fora de escopo; a prévia vai para o lobby ao abrir a cor de contraste (RN-14).
