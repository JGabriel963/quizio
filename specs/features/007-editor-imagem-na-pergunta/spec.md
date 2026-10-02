---
id: "007"
title: Editor 5/5 — Imagem na pergunta
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, media]
created: 2026-10-01
---

# 007 — Editor 5/5: Imagem na pergunta

## Contexto e problema

As specs 003 a 006 entregaram o editor inteiro em texto: perguntas Quiz e Verdadeiro ou falso, tempo, pontos e a versão jogável. A área de mídia no centro da pergunta existe desde a spec 003, mas está marcada "Em breve". Um quiz do Quizio ainda não consegue mostrar um mapa, uma foto ou um gráfico, que é metade da graça de um Kahoot.

No Kahoot, o enunciado é obrigatório e a imagem é opcional. Ela fica **ao centro**, na área de mídia, ou **como fundo** da pergunta inteira. O criador pode recortá-la e descrevê-la para leitores de tela (referência visual do Kahoot, 2026-10-01).

Esta é a última etapa do editor:

| Spec | Etapa |
| --- | --- |
| 003 | Fundação e lista de perguntas ✅ |
| 004 | Pergunta Quiz completa ✅ |
| 005 | Verdadeiro ou falso e troca de tipo ✅ |
| 006 | Salvar a versão jogável ✅ |
| **007** | **Imagem na pergunta (esta spec)** |

## Objetivo

O criador coloca uma imagem em qualquer pergunta, enviando um arquivo do computador ou do celular. Ele escolhe se ela aparece ao centro ou como fundo, recorta o enquadramento, descreve a imagem e a remove quando quiser. A imagem é salva sozinha, como o resto da pergunta, e passa a fazer parte da versão jogável.

## Personas

- **Criador (`Creator`)** — dono do quiz, único que o edita (kahoot-reference §1).

## Histórias de usuário

- **HU-01** — Como criador, quero colocar uma imagem na pergunta, para perguntar sobre algo que se vê.
- **HU-02** — Como criador, quero arrastar ou colar a imagem, para não precisar procurar o arquivo.
- **HU-03** — Como criador, quero recortar a imagem, para mostrar só a parte que importa.
- **HU-04** — Como criador, quero usar a imagem como fundo da pergunta, para dar clima sem ocupar o centro.
- **HU-05** — Como criador, quero descrever a imagem, para que quem usa leitor de tela entenda a pergunta.
- **HU-06** — Como criador, quero remover a imagem, para voltar atrás ou trocá-la.
- **HU-07** — Como criador, quero ver a imagem na lista de perguntas, para reconhecer cada pergunta de relance.

## Regras de negócio

### A imagem da pergunta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Toda pergunta, de qualquer tipo, pode ter **uma imagem (`QuestionImage`)**. Ela é **opcional**: uma pergunta sem imagem não está incompleta, e a imagem não substitui o enunciado, que continua obrigatório (spec 004, RN-14; spec 005, RN-11). | kahoot-reference §4, §4.1.1, §4.1.2 · informado pelo usuário (2026-10-01) |
| RN-02 | A imagem segue a **política de mídia** do Quizio, a mesma da capa: **JPEG, PNG, GIF ou WebP de até 10 MB**, sem limite de dimensões. Um GIF animado continua animado. | spec 001, RN-15 · ADR 0003 |
| RN-03 | Só o dono do quiz coloca, altera ou remove a imagem, e só pode usar um arquivo que ele mesmo enviou. Um quiz na lixeira não pode ser alterado (spec 001, RN-22). | spec 001, RN-10, RN-22 · constituição, artigo II |
| RN-04 | A imagem tem três ajustes, todos opcionais: a **posição (`placement`)** — ao centro (`media`, padrão) ou como fundo (`background`) —, o **recorte (`ImageCrop`)** e o **texto alternativo (`altText`)**. | referência visual do Kahoot (2026-10-01) |
| RN-05 | Colocar, remover, reposicionar, recortar e descrever a imagem são salvos automaticamente, como as demais edições da pergunta (spec 003, RN-20 a RN-23), e aparecem no estado de salvamento do cabeçalho. | spec 003, RN-20 |

### Inserir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | Numa pergunta sem imagem, a **área de mídia** mostra o botão **"+"**, o texto **"Encontre e insira mídia"** e, embaixo, **"Carregar arquivo** ou arraste aqui para fazer upload". O selo "Em breve" da spec 003 sai. | referência visual do Kahoot (2026-10-01) · spec 003 (Experiência) |
| RN-07 | Há quatro formas de enviar: (a) **"Carregar arquivo"** abre direto o seletor de arquivos do dispositivo; (b) **arrastar** um arquivo e soltá-lo sobre a área de mídia; (c) o botão **"+"** abre o diálogo **"Carregar imagem"**, que aceita arrastar, escolher pelo botão **"Carregar mídia"** ou **colar** (Ctrl+V) uma imagem copiada; (d) no celular, o seletor oferece a galeria e a câmera do aparelho. | referência visual do Kahoot (2026-10-01) |
| RN-08 | O diálogo "Carregar imagem" informa os limites: **"Tamanho máx. do arquivo: 10 MB"** e **"Formato: JPEG, PNG, GIF ou WebP"**. **Fechar** (e Esc ou clicar fora) fecha sem enviar. Quando o envio termina, o diálogo fecha sozinho. | referência visual do Kahoot (2026-10-01) · RN-02 |
| RN-09 | Um arquivo de outro formato ou acima de 10 MB é **recusado antes do envio**, com a mensagem "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.", e a pergunta fica como estava. O servidor confere de novo formato e tamanho. | spec 001, RN-15, CA-17 · constituição, artigo II |
| RN-10 | Só **um** arquivo por vez: ao soltar ou colar vários, o editor usa o primeiro que for imagem aceita. | decisão do produto (2026-10-01) |
| RN-11 | Durante o envio, a área de mídia mostra o **progresso**, e não aceita outro envio. Se o envio falhar, a área volta ao estado vazio com a mensagem "Não foi possível enviar a imagem. Tente de novo." | spec 001 (Experiência, envio de capa) |
| RN-12 | A imagem enviada vai para a **pergunta em que o envio começou**, mesmo que o criador selecione outra pergunta antes de ele terminar. **Sair** e **Salvar** esperam o envio em andamento, como esperam o salvamento automático (spec 003, RN-24; spec 006, RN-08). | decisão do produto (2026-10-01) |
| RN-13 | A imagem nova entra **ao centro**, **sem recorte** e **sem texto alternativo**. | referência visual do Kahoot (2026-10-01) |

### Ao centro, e as ações da imagem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | Ao centro, a imagem ocupa a área de mídia, que tem proporção 3:2. **Sem recorte, ela aparece inteira**, sem cortes nem distorção. Com recorte, aparece só a parte recortada, na forma escolhida, centralizada: Paisagem preenche a área; Retrato, Quadrado e Círculo deixam as laterais da área à mostra. | referência visual do Kahoot (2026-10-01) |
| RN-15 | Sobre a imagem, no canto inferior direito, ficam as ações: **"Usar como fundo"**, **"Editar recorte de imagem"**, **"Detalhes da mídia"** (ícone de informação) e **"Remover"** (lixeira). As três últimas são ícones com o nome como dica e como rótulo acessível. | referência visual do Kahoot (2026-10-01) |
| RN-16 | **Remover** tira a imagem na hora, sem confirmação, junto com a posição, o recorte e o texto alternativo. A área volta ao estado vazio (RN-06). | referência visual do Kahoot (2026-10-01) |
| RN-17 | **Trocar** de imagem é remover e inserir outra: com imagem na pergunta, a área não aceita arrastar um novo arquivo. | referência visual do Kahoot (2026-10-01) |

### Recorte

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | "Editar recorte de imagem" abre o diálogo **"Recortar imagem"**, com quatro formas: **Paisagem** (`landscape`, proporção 3:2), **Retrato** (`portrait`, 2:3), **Quadrado** (`square`, 1:1) e **Círculo** (`circle`, 1:1 em círculo). | referência visual do Kahoot (2026-10-01) · proporções: decisão do produto (2026-10-01) |
| RN-19 | O diálogo mostra a imagem com a **moldura** da forma escolhida; o que fica fora da moldura aparece escurecido. O criador **arrasta a imagem** para escolher a parte e usa o **controle de zoom** para aproximar. A moldura nunca mostra uma área fora da imagem. | referência visual do Kahoot (2026-10-01) |
| RN-20 | O zoom vai do **mínimo**, em que a moldura pega a maior parte possível da imagem, até **3 vezes** o mínimo. Trocar de forma volta o zoom ao mínimo e centraliza a moldura. | referência visual do Kahoot (2026-10-01) · limite de 3×: decisão do produto (2026-10-01) |
| RN-21 | **Salvar** aplica o recorte e fecha; **Fechar** (e Esc ou clicar fora) fecha sem mudar nada, mantendo o recorte que a imagem já tinha. O diálogo **sempre abre a partir da imagem original**: Paisagem, zoom mínimo e moldura centralizada, mesmo quando a imagem já está recortada. | comportamento do Kahoot informado pelo usuário (2026-10-01) |
| RN-22 | O recorte **não altera o arquivo enviado**: ele pode ser refeito quantas vezes o criador quiser, sempre a partir da imagem inteira. É assim que se desfaz um recorte: abrir o diálogo e salvar em Paisagem no zoom mínimo. | comportamento do Kahoot informado pelo usuário (2026-10-01) |

### Como fundo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-23 | **"Usar como fundo"** faz a imagem cobrir **toda a área da pergunta**, atrás do enunciado e das respostas. A área de mídia fica vazia, só com as ações da imagem, e a primeira ação vira **"Usar como mídia"**, que devolve a imagem ao centro. | referência visual do Kahoot (2026-10-01) |
| RN-24 | Como fundo, a imagem **preenche a tela**, centralizada, cortando as sobras. **Não dá para recortar o fundo**: o recorte não se aplica a ele, fica guardado e volta a valer em "Usar como mídia". Enquanto a imagem é fundo, a ação de recorte não aparece. | comportamento do Kahoot informado pelo usuário (2026-10-01) · ocultar a ação: decisão do produto |
| RN-25 | Ao escolher "Usar como fundo", o editor mostra o aviso **"Partes do fundo não ficarão visíveis durante o jogo"**, com os motivos — "Elementos do jogo (como caixas de perguntas e respostas) irão obstruir partes do fundo" e "Alguns dispositivos irão esconder partes do fundo." —, a ilustração de celular e computador, a opção **"Não mostrar essa mensagem novamente"** e o botão **Ok**. A imagem já vira fundo ao acionar a ação; o aviso só informa. | referência visual do Kahoot (2026-10-01) |
| RN-26 | Marcando "Não mostrar essa mensagem novamente", o aviso não volta a aparecer **naquele navegador**. | referência visual do Kahoot (2026-10-01) · alcance: decisão do produto (2026-10-01) |
| RN-27 | Imagem de fundo está disponível para todos, sem aviso de recurso pago. | constituição, artigo VI |

### Texto alternativo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | "Detalhes da mídia" abre o diálogo **"Adicionar detalhes da mídia"**, com o campo **"Adicionar um texto alternativo"**, o apoio "Descreva a mídia em 1 ou 2 frases. Isso ajuda pessoas com deficiências visuais e auditivas a entenderem a mídia." e as ações **Fechar** e **Adicionar**. | referência visual do Kahoot (2026-10-01) |
| RN-29 | O texto alternativo tem no máximo **1000 caracteres** (caracteres percebidos), e o campo mostra quantos ainda cabem. Espaços nas pontas são ignorados. Não aceita digitar além do limite, e o que é colado é cortado. | referência visual do Kahoot (2026-10-01) · spec 004, RN-04 |
| RN-30 | **Adicionar** grava o texto e fecha; com o campo vazio, a imagem fica sem texto alternativo. **Fechar** (e Esc ou clicar fora) fecha sem gravar. O diálogo abre com o texto atual. | referência visual do Kahoot (2026-10-01) |
| RN-31 | No editor, a imagem é anunciada a leitores de tela pelo texto alternativo; sem ele, como "Imagem da pergunta". | decisão do produto (2026-10-01) |

### Lista, cópias, tipo e versão jogável

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-32 | O item da **lista de perguntas** mostra a miniatura da imagem no lugar do espaço da mídia, ao centro ou como fundo. O mesmo vale para a miniatura do diálogo "Não é possível jogar este quiz" (spec 006, RN-10). | referência visual do Kahoot (2026-10-01) · spec 004 (Experiência) |
| RN-33 | **Duplicar** uma pergunta ou um quiz copia a imagem com posição, recorte e texto alternativo. As cópias são **independentes**: remover ou trocar a imagem de uma não afeta a outra. | spec 001, RN-20 · spec 004, RN-18 |
| RN-34 | A imagem é da pergunta, não do tipo: **trocar o tipo** (spec 005) mantém a imagem e seus ajustes. | spec 005, RN-14 |
| RN-35 | A imagem e seus três ajustes fazem parte da **versão jogável**: num quiz publicado, colocar, remover, reposicionar, recortar ou descrever uma imagem é uma **alteração não salva** (spec 006, RN-18, RN-19), e desfazer a mudança limpa o selo. | spec 006, RN-01, RN-19 (Fora de escopo: "a versão passa a incluir as imagens") |
| RN-36 | A versão jogável **nunca perde uma imagem**: remover ou trocar a imagem no editor não afeta a versão vigente, e **Descartar** (spec 006, RN-26) traz de volta a imagem e os ajustes que ela tinha. | spec 006, RN-01, RN-26 |
| RN-37 | Excluir o quiz **definitivamente** apaga todas as imagens das perguntas dele, as atuais e as da versão jogável. Excluir uma pergunta ou mover o quiz para a lixeira não quebra a versão jogável nem o que a lixeira restaura. | spec 001, RN-24 · spec 006, CA-36 |
| RN-38 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Inserir

#### CA-01 — Área de mídia vazia

- **Dado** uma pergunta sem imagem
- **Quando** o criador a seleciona
- **Então** a área de mídia mostra o botão "+", "Encontre e insira mídia" e "Carregar arquivo ou arraste aqui para fazer upload"
- **E** não há selo "Em breve"

#### CA-02 — Enviar pelo seletor de arquivos

- **Dado** uma pergunta sem imagem
- **Quando** o criador aciona "Carregar arquivo" e escolhe um PNG de 2 MB
- **Então** a área mostra o progresso do envio e, ao terminar, a imagem inteira, com as ações "Usar como fundo", "Editar recorte de imagem", "Detalhes da mídia" e "Remover"
- **E** o cabeçalho passa por "Salvando" e chega a "Salvo"
- **E** ao recarregar a página a imagem continua na pergunta

#### CA-03 — Arrastar para a área de mídia

- **Dado** uma pergunta sem imagem
- **Quando** o criador solta um arquivo JPEG sobre a área de mídia
- **Então** a imagem é enviada e aparece ao centro

#### CA-04 — Diálogo "Carregar imagem"

- **Dado** uma pergunta sem imagem
- **Quando** o criador aciona o botão "+"
- **Então** abre o diálogo "Carregar imagem", com "Arraste, carregue ou cole seu arquivo aqui", "Tamanho máx. do arquivo: 10 MB", "Formato: JPEG, PNG, GIF ou WebP", o botão "Carregar mídia" e "Fechar"
- **E** escolher um arquivo por "Carregar mídia" envia a imagem e fecha o diálogo

#### CA-05 — Colar no diálogo

- **Dado** o diálogo "Carregar imagem" aberto e uma imagem copiada
- **Quando** o criador cola (Ctrl+V)
- **Então** a imagem é enviada, o diálogo fecha e ela aparece ao centro

#### CA-06 — Fechar o diálogo sem enviar

- **Dado** o diálogo "Carregar imagem" aberto
- **Quando** o criador aciona Fechar, ou pressiona Esc
- **Então** o diálogo fecha e a pergunta continua sem imagem

#### CA-07 — Formato recusado

- **Dado** uma pergunta sem imagem
- **Quando** o criador tenta enviar um SVG ou um PDF
- **Então** vê "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB."
- **E** nada é enviado e a pergunta continua sem imagem

#### CA-08 — Limite de tamanho

- **Dado** uma pergunta sem imagem
- **Quando** o criador envia uma imagem de exatamente 10 MB
- **Então** ela é aceita
- **E** uma imagem de 10,1 MB é recusada com a mesma mensagem do CA-07

#### CA-09 — Vários arquivos de uma vez

- **Dado** uma pergunta sem imagem
- **Quando** o criador solta sobre a área um PDF e dois PNG
- **Então** só o primeiro PNG é enviado

#### CA-10 — Falha no envio

- **Dado** uma pergunta sem imagem e a conexão fora do ar
- **Quando** o criador envia uma imagem
- **Então** vê "Não foi possível enviar a imagem. Tente de novo."
- **E** a área volta ao estado vazio, pronta para outra tentativa

#### CA-11 — Trocar de pergunta durante o envio

- **Dado** um envio em andamento na pergunta 1
- **Quando** o criador seleciona a pergunta 2 antes de ele terminar
- **Então** a imagem aparece na pergunta 1, e a pergunta 2 continua sem imagem

#### CA-12 — Sair durante o envio

- **Dado** um envio em andamento
- **Quando** o criador aciona Sair
- **Então** o editor espera o envio e o salvamento terminarem antes de sair
- **E** ao reabrir o quiz a imagem está na pergunta

#### CA-13 — GIF animado

- **Dado** uma pergunta sem imagem
- **Quando** o criador envia um GIF animado
- **Então** ele aparece ao centro, animado

#### CA-14 — Imagem em Verdadeiro ou falso

- **Dado** uma pergunta Verdadeiro ou falso
- **Quando** o criador envia uma imagem
- **Então** ela aparece ao centro, acima de "Verdadeiro" e "Falso", com as mesmas ações

#### CA-15 — Imagem não completa nem bloqueia a pergunta

- **Dado** uma pergunta completa sem imagem e outra com imagem mas sem enunciado
- **Quando** o criador olha a lista de perguntas
- **Então** a primeira não tem alerta
- **E** a segunda continua com o alerta "Pergunta ausente"

#### CA-16 — Imagem de outro dono

- **Dado** um arquivo enviado por outro criador
- **Quando** alguém tenta colocá-lo numa pergunta de um quiz seu
- **Então** o servidor recusa e a pergunta fica como estava

### Ações da imagem

#### CA-17 — Remover

- **Dado** uma pergunta com imagem recortada e com texto alternativo
- **Quando** o criador aciona "Remover"
- **Então** a área volta ao estado vazio, sem pedir confirmação
- **E** ao enviar outra imagem, ela entra ao centro, sem recorte e sem texto alternativo

#### CA-18 — Não aceita arrastar sobre uma imagem

- **Dado** uma pergunta com imagem
- **Quando** o criador solta outro arquivo sobre a área de mídia
- **Então** nada muda: a imagem continua a mesma

### Recorte

#### CA-19 — Abrir o recorte

- **Dado** uma pergunta com imagem sem recorte
- **Quando** o criador aciona "Editar recorte de imagem"
- **Então** abre o diálogo "Recortar imagem", com Paisagem, Retrato, Quadrado e Círculo, Paisagem selecionada, o zoom no mínimo e a moldura centralizada
- **E** o que fica fora da moldura aparece escurecido

#### CA-20 — Recortar em quadrado

- **Dado** o diálogo de recorte aberto numa imagem larga
- **Quando** o criador escolhe Quadrado e aciona Salvar
- **Então** o diálogo fecha e a área de mídia mostra a parte central da imagem, quadrada, no meio da área, com as laterais vazias
- **E** a miniatura da lista mostra o mesmo recorte
- **E** ao recarregar a página o recorte continua

#### CA-21 — Recorte em círculo

- **Dado** o diálogo de recorte aberto
- **Quando** o criador escolhe Círculo e aciona Salvar
- **Então** a área de mídia mostra a imagem dentro de um círculo

#### CA-22 — Zoom e arrastar

- **Dado** o diálogo de recorte aberto em Paisagem
- **Quando** o criador leva o zoom ao máximo e arrasta a imagem para a esquerda até o fim
- **Então** a moldura mostra a borda direita da imagem, ampliada 3 vezes em relação ao mínimo
- **E** a moldura não mostra nenhuma área fora da imagem

#### CA-23 — Trocar de forma zera o enquadramento

- **Dado** o diálogo de recorte com zoom aplicado em Paisagem
- **Quando** o criador escolhe Retrato
- **Então** o zoom volta ao mínimo e a moldura fica centralizada

#### CA-24 — Fechar sem salvar

- **Dado** uma imagem recortada em Quadrado e o diálogo de recorte aberto
- **Quando** o criador escolhe Círculo e aciona Fechar
- **Então** a imagem continua recortada em Quadrado

#### CA-25 — Refazer e desfazer o recorte

- **Dado** uma imagem de proporção 3:2 recortada em Quadrado, com zoom
- **Quando** o criador abre o recorte de novo
- **Então** o diálogo mostra a imagem original inteira, em Paisagem, no zoom mínimo e centralizada
- **E** ao acionar Salvar sem mexer, a área de mídia volta a mostrar a imagem inteira

### Como fundo

#### CA-26 — Usar como fundo

- **Dado** uma pergunta com imagem ao centro
- **Quando** o criador aciona "Usar como fundo"
- **Então** a imagem passa a cobrir toda a área da pergunta, atrás do enunciado e das respostas
- **E** a área de mídia fica vazia, com as ações "Usar como mídia", "Detalhes da mídia" e "Remover"
- **E** abre o aviso "Partes do fundo não ficarão visíveis durante o jogo", com os dois motivos, a ilustração, "Não mostrar essa mensagem novamente" e Ok

#### CA-27 — Não mostrar o aviso de novo

- **Dado** o aviso do fundo aberto
- **Quando** o criador marca "Não mostrar essa mensagem novamente", aciona Ok e usa outra imagem como fundo
- **Então** o aviso não aparece na segunda vez
- **E** sem marcar a opção, o aviso aparece de novo

#### CA-28 — Voltar ao centro

- **Dado** uma imagem recortada em Quadrado e usada como fundo
- **Quando** o criador aciona "Usar como mídia"
- **Então** a imagem volta à área de mídia, recortada em Quadrado

#### CA-29 — Fundo sem aviso de recurso pago

- **Dado** uma imagem usada como fundo
- **Quando** o criador olha o editor
- **Então** não há aviso de recurso pago nem de assinatura

### Texto alternativo

#### CA-30 — Adicionar o texto alternativo

- **Dado** uma pergunta com imagem
- **Quando** o criador aciona "Detalhes da mídia", escreve "Ponte ao pôr do sol" e aciona Adicionar
- **Então** o diálogo fecha e leitores de tela anunciam a imagem como "Ponte ao pôr do sol"
- **E** ao reabrir o diálogo o campo traz "Ponte ao pôr do sol"

#### CA-31 — Limite do texto alternativo

- **Dado** o diálogo "Adicionar detalhes da mídia" aberto
- **Quando** o criador cola um texto de 1200 caracteres
- **Então** o campo fica com os primeiros 1000 e mostra 0 restantes

#### CA-32 — Sem texto alternativo

- **Dado** uma imagem com texto alternativo
- **Quando** o criador apaga o texto e aciona Adicionar
- **Então** a imagem fica sem texto alternativo e é anunciada como "Imagem da pergunta"
- **E** acionar Fechar, em vez de Adicionar, mantém o texto anterior

### Lista, cópias, tipo e versão jogável

#### CA-33 — Miniatura na lista

- **Dado** uma pergunta com imagem
- **Quando** o criador olha a lista de perguntas
- **Então** o item mostra a miniatura da imagem no lugar do espaço da mídia
- **E** ao remover a imagem, volta o espaço vazio

#### CA-34 — Duplicar a pergunta

- **Dado** uma pergunta com imagem como fundo e texto alternativo
- **Quando** o criador a duplica e remove a imagem da cópia
- **Então** a cópia nasce com a mesma imagem, como fundo e com o mesmo texto alternativo
- **E** depois da remoção, a original continua com a imagem

#### CA-35 — Duplicar o quiz

- **Dado** um quiz com imagens nas perguntas
- **Quando** o criador o duplica e exclui o original definitivamente
- **Então** as perguntas da cópia continuam mostrando as imagens

#### CA-36 — Trocar o tipo

- **Dado** uma pergunta Quiz com imagem recortada
- **Quando** o criador troca o tipo para Verdadeiro ou falso
- **Então** a imagem continua na pergunta, com o mesmo recorte

#### CA-37 — Imagem é alteração não salva

- **Dado** um quiz publicado sem alterações
- **Quando** o criador coloca uma imagem numa pergunta
- **Então** o selo passa a "Alterações não salvas"
- **E** ao remover a imagem, volta a "Publicado"
- **E** o mesmo acontece ao mudar a posição, o recorte ou o texto alternativo de uma imagem já publicada e desfazer a mudança

#### CA-38 — Descartar traz a imagem de volta

- **Dado** um quiz publicado em que a pergunta 1 tem uma imagem recortada em Quadrado
- **Quando** o criador remove a imagem, sai e escolhe Descartar
- **Então** ao reabrir o editor, a pergunta 1 tem a imagem de volta, recortada em Quadrado

#### CA-39 — Salvar inclui a imagem na versão

- **Dado** um quiz publicado em que o criador trocou a imagem da pergunta 1
- **Quando** ele aciona Salvar e depois Pronto
- **Então** o quiz fica "Publicado", e a versão jogável passa a ter a imagem nova

#### CA-40 — Exclusão definitiva

- **Dado** um quiz com imagens nas perguntas, na lixeira
- **Quando** o criador o exclui definitivamente
- **Então** as imagens das perguntas deixam de estar acessíveis
- **E** se ele for restaurado em vez de excluído, as perguntas voltam com as imagens

#### CA-41 — No celular

- **Dado** o editor aberto num celular
- **Quando** o criador aciona "Carregar arquivo" e escolhe uma foto
- **Então** a imagem aparece na pergunta, com as ações ao alcance do toque
- **E** no diálogo de recorte, ele move a imagem arrastando com o dedo

## Experiência (telas e estados)

- **Área de mídia vazia**, como a do Kahoot: o painel claro no centro da pergunta, com o botão quadrado "+" e "Encontre e insira mídia" no meio e, no rodapé, "**Carregar arquivo** ou arraste aqui para fazer upload", com "Carregar arquivo" sublinhado. Ao arrastar um arquivo por cima, o painel se destaca para mostrar que aceita soltar. Sem a faixa "Sugestões do Getty Images".
- **Diálogo "Carregar imagem"**, como o do Kahoot: uma zona tracejada com o ícone de envio, "Arraste, carregue ou cole seu arquivo aqui", as duas linhas de limite e o botão azul "Carregar mídia"; no rodapé, "Fechar". Sem a seta de voltar e sem o texto da política de uso.
- **Enviando**: a área de mídia (ou a zona do diálogo) troca o conteúdo por uma barra de progresso com "Enviando imagem…".
- **Imagem ao centro**: ocupa a área de mídia, com cantos arredondados. No canto inferior direito, a fileira de ações em botões brancos: "Usar como fundo" com texto, e os ícones de recorte, informação e lixeira, cada um com a dica do nome ao passar o mouse ou focar.
- **Diálogo "Recortar imagem"**, como o do Kahoot: as quatro formas no topo, com ícone e nome, a selecionada em azul; a imagem sobre fundo cinza com a moldura clara e o resto escurecido; abaixo, o controle de zoom entre um ícone de imagem pequeno e um grande; no rodapé, "Fechar" (neutro) e "Salvar" (azul). O zoom também responde ao teclado.
- **Imagem como fundo**: a imagem cobre o centro do editor inteiro, atrás do enunciado, da área de mídia e das respostas. A área de mídia fica transparente e mantém a fileira de ações no mesmo lugar, agora com "Usar como mídia" e sem o recorte.
- **Aviso do fundo**, como o do Kahoot: o título, os dois motivos em lista, a ilustração lado a lado de "Dispositivo móvel" e "Computador (desktop)", a caixa "Não mostrar essa mensagem novamente" e o botão "Ok". Sem "Visualizar".
- **Diálogo "Adicionar detalhes da mídia"**, como o do Kahoot: o rótulo "Adicionar um texto alternativo", o apoio, o campo com a contagem de caracteres restantes à direita, e "Fechar" (neutro) e "Adicionar" (azul). Sem "Fonte dos créditos".
- **Lista de perguntas**: a miniatura da imagem no meio do card, onde hoje fica o ícone de mídia.
- **Estados**: vazio, arrastando por cima, enviando, com imagem (centro ou fundo), arquivo recusado (mensagem junto à área), falha no envio (mensagem e área vazia), falha ao salvar (o "Não foi possível salvar · Tentar de novo" de sempre).

## Divergências intencionais do Kahoot

- **Só envio de arquivo.** O Kahoot abre, no "+", uma biblioteca com Getty Images, Unsplash, criador de imagens por IA, GIFs, figurinhas, YouTube, Vimeo e áudio. O Quizio só tem o envio, então o "+" vai direto ao diálogo "Carregar imagem", e a faixa de sugestões não existe.
- **Limites da política de mídia do Quizio** (RN-02): 10 MB e JPEG, PNG, GIF ou WebP, em vez dos 50 MB do diálogo do Kahoot. São os mesmos limites da capa.
- **Imagem de fundo para todos** (RN-27): no Kahoot é recurso pago.
- **Ação de recorte some com a imagem como fundo** (RN-24): o Kahoot mantém o ícone visível, mas ele não recorta o fundo. Aqui a ação simplesmente não aparece.
- **Sem "Visualizar" no aviso do fundo**: o Quizio ainda não tem pré-visualização do quiz (spec 022).
- **Sem "Fonte dos créditos"** nos detalhes da mídia: só existe para imagens da biblioteca do Kahoot.
- **Sem "Revelação de imagem"** (a imagem aparecendo aos poucos em blocos 3×3, 5×5, 8×8): é um efeito da partida, pago no Kahoot. Fica para depois da partida ao vivo.

## Fora de escopo

- **Imagem nas alternativas do Quiz**: saiu desta spec por decisão do usuário (2026-10-01) e será especificada à parte.
- Vídeo (YouTube, Vimeo), áudio e leitura em voz alta.
- Biblioteca de imagens, GIFs, figurinhas e geração de imagem por IA.
- Revelação de imagem.
- Como a imagem, o fundo, o recorte e o texto alternativo aparecem **na partida**, na tela do anfitrião e no dispositivo do jogador (spec 009).
- Pré-visualização do quiz (spec 022).
- Editar a imagem além do recorte (girar, filtros) e escolher uma forma "sem recorte" depois de recortar.
- Desfazer a remoção de uma imagem.

## Perguntas em aberto

- [x] **Voltar à imagem inteira depois de recortar** — resolvido em 2026-10-01: o diálogo sempre abre a partir da imagem original (RN-21, RN-22). Uma imagem que não seja 3:2 volta ao maior enquadramento de Paisagem, não à imagem inteira; uma opção "sem recorte" fica fora de escopo.
- [x] **Recorte com a imagem como fundo** — resolvido em 2026-10-01: não dá para recortar o fundo (RN-24).
- [x] **Proporções de Paisagem e Retrato** — aceitas pelo usuário em 2026-10-01: 3:2 e 2:3, zoom até 3× (RN-18, RN-20).
- [ ] **Imagens de versões antigas** — a spec 008 decide se uma partida em andamento ou um relatório precisam das imagens de uma versão que já não é a vigente; até lá, só a versão vigente é garantida (RN-36).

## Changelog

- 2026-10-01 — spec criada, com as capturas de tela do Kahoot enviadas pelo usuário (área de mídia, biblioteca com "Carregar mídia", "Carregar imagem", imagem inserida com as ações, "Recortar imagem" nas quatro formas, "Adicionar detalhes da mídia", aviso e modo de fundo). Decisões confirmadas com o usuário: só imagem enviada, sem vídeo; imagem nas alternativas fica fora desta spec; o texto alternativo entra, pelo botão de detalhes. Decisões tomadas sem consulta prévia: "+" abre direto o diálogo de envio (sem biblioteca); limites da política de mídia (RN-02); um arquivo por vez (RN-10); o envio pertence à pergunta em que começou (RN-12); proporções e zoom do recorte (RN-18, RN-20); recorte não destrutivo (RN-22) e sem efeito no fundo (RN-24); "Não mostrar novamente" vale por navegador (RN-26); sem "Visualizar", sem créditos e sem revelação de imagem.
- 2026-10-01 — revisão com a segunda leva de capturas (imagem recortada nas quatro formas, diálogo reaberto, imagem como fundo). O diálogo de recorte passa a abrir sempre da imagem original, o que também desfaz o recorte (RN-21, RN-22, CA-25); a área de mídia é 3:2 e as formas mais estreitas ficam centralizadas (RN-14, CA-20); confirmado que o fundo não é recortado (RN-24). O usuário aceitou trocar por remover e inserir (RN-16, RN-17) e as proporções do recorte.
- 2026-10-01 — aprovada pelo usuário, com o pedido de manter o storage fácil de trocar (R2 hoje; S3, Firebase ou outro no futuro). Plano e tarefas escritos e aprovados em seguida.
- 2026-10-01 — implementada (tarefas T01 a T16). Os 41 CAs têm teste automatizado verde: domínio, casos de uso, PGlite, API, componentes e E2E em desktop e celular. Desvios do plano registrados em `tasks.md`. O ADR 0003 ganhou a seção "Trocar de provedor".
- 2026-10-01 — renumeração do roadmap: a partida ao vivo virou quatro specs (008 a 011) e as features seguintes subiram três números (robustez 012, relatórios 013, mais tipos 014, opiniões 015, slides 016, atribuir 017, equipe 018, produtividade 019, extras 020). Só as referências mudaram.
