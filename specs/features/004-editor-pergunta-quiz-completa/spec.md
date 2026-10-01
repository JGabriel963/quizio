---
id: "004"
title: Editor 2/5 — Pergunta Quiz completa
status: done # draft | approved | planned | in-progress | done
contexts: [quiz]
created: 2026-09-30
---

# 004 — Editor 2/5: pergunta Quiz completa

## Contexto e problema

A spec 003 entregou a casca do editor: lista de perguntas, enunciado e salvamento automático. As alternativas ainda aparecem marcadas "Em breve", e o painel de propriedades só mostra o tipo. Uma pergunta Quiz ainda não tem o que responder, e nada impede um quiz incompleto.

No Kahoot, a pergunta Quiz se completa no centro do editor (alternativas coloridas com forma, marcadas como corretas) e no painel à direita (limite de tempo, pontos e opções de resposta). Uma pergunta incompleta ganha um alerta na lista e dicas junto aos campos ("A resposta 1 não foi adicionada").

| Spec | Etapa |
| --- | --- |
| 003 | Fundação e lista de perguntas ✅ |
| **004** | **Pergunta Quiz completa (esta spec)** |
| 005 | Verdadeiro ou falso e troca de tipo |
| 006 | Salvar a versão jogável |
| 007 | Mídia nas perguntas |

## Objetivo

O criador monta uma pergunta Quiz inteira: escreve de 2 a 6 alternativas, marca a(s) correta(s), escolhe seleção simples ou múltipla, o tempo e os pontos. O editor aponta, sem bloquear, o que ainda falta.

## Personas

- **Criador (`Creator`)** — dono do quiz, único que o edita (kahoot-reference §1).

## Histórias de usuário

- **HU-01** — Como criador, quero escrever as alternativas direto nos blocos coloridos, para montar a pergunta como ela vai aparecer no jogo.
- **HU-02** — Como criador, quero marcar quais alternativas estão corretas, inclusive mais de uma, para aceitar respostas múltiplas.
- **HU-03** — Como criador, quero ir até 6 alternativas quando precisar, sem pagar nada por isso.
- **HU-04** — Como criador, quero definir o tempo e os pontos de cada pergunta, e aplicar o mesmo tempo a todas de uma vez.
- **HU-05** — Como criador, quero ver o que falta em cada pergunta, para completar o quiz antes de jogá-lo.

## Regras de negócio

### Alternativas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Uma pergunta Quiz tem **alternativas (`Choice`)** em posições fixas, cada uma com cor e forma próprias: 1 vermelho/triângulo, 2 azul/losango, 3 amarelo/círculo, 4 verde/quadrado, 5 turquesa/pentágono, 6 roxo/triângulo invertido. | kahoot-reference §4, §6.5 · decisão do produto (2026-09-30) para 5 e 6 |
| RN-02 | Toda pergunta nova mostra **4 espaços** de alternativa: "Adicionar resposta 1", "Adicionar resposta 2", "Adicionar resposta 3 (opcional)" e "Adicionar resposta 4 (opcional)". | referência visual do Kahoot (2026-09-25) |
| RN-03 | **"Adicionar mais respostas"** acrescenta os espaços 5 e 6, chegando ao máximo de **6**. Com 6 espaços, a ação vira **"Remover respostas extras"**, que tira os espaços 5 e 6 e descarta o que estiver neles. | kahoot-reference §4.1.1 · constituição, artigo VI · decisão do produto (2026-09-30) |
| RN-04 | O texto de uma alternativa tem no máximo **75 caracteres** (caracteres percebidos). Espaços nas pontas são ignorados; texto só com espaços conta como vazio. O campo não aceita digitar além do limite, e o que é colado é cortado. | kahoot-reference §4.1.1 |
| RN-05 | O texto das alternativas é salvo automaticamente, como o enunciado (spec 003, RN-20). | spec 003, RN-20 |

### Respostas corretas e opções de resposta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | Cada alternativa **com texto** pode ser marcada como **correta**. Uma alternativa vazia não pode ser correta: apagar o texto de uma alternativa correta também a desmarca. | kahoot-reference §2 · decisão do produto (2026-09-30) |
| RN-07 | As **opções de resposta (`SelectionMode`)** são **Seleção simples** (`single`, padrão) ou **Múltipla escolha** (`multiple`). | kahoot-reference §4.1.1 · referência visual do Kahoot |
| RN-08 | Em seleção simples, marcar uma segunda alternativa como correta **muda a pergunta para múltipla escolha**, e o editor avisa: "Múltipla escolha ativada". | kahoot-reference §4.1.1 |
| RN-09 | Trocar de múltipla escolha para seleção simples com mais de uma correta mantém só a **primeira** correta (na ordem das posições) e avisa quantas foram desmarcadas. | decisão do produto (2026-09-30) |

### Tempo e pontos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | O **limite de tempo (`TimeLimit`)** é escolhido entre **5 s, 10 s, 15 s, 20 s, 30 s, 45 s, 1 min, 1 min 30 s, 2 min, 3 min e 4 min**. O padrão é **20 s**. | referência visual do Kahoot (2026-09-25) · kahoot-reference §5.1 |
| RN-11 | **"Aplicar a todas as perguntas"** copia o limite de tempo da pergunta selecionada para todas as perguntas do quiz e avisa quantas mudaram. | kahoot-reference §3.2 (tempo em massa) |
| RN-12 | Os **pontos (`QuestionPoints`)** são **Padrão** (`standard`, padrão), **Pontos em dobro** (`double`) ou **Sem pontos** (`noPoints`). | kahoot-reference §5.2 |
| RN-13 | Tempo, pontos, opções de resposta e respostas corretas são salvos assim que escolhidos. | spec 003, RN-20 |

### Pergunta incompleta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | Uma pergunta Quiz está **incompleta** quando: (a) não tem enunciado, (b) tem **menos de 2** alternativas com texto, ou (c) não tem **nenhuma** alternativa correta. | kahoot-reference §3.6 (a: inferido, adotado como decisão do produto de 2026-09-30) |
| RN-15 | Uma pergunta incompleta **continua sendo salva** normalmente. Ela ganha um **alerta na lista** de perguntas, que explica os motivos, e isso vai impedir salvar a versão jogável (spec 006). | kahoot-reference §3.6 |
| RN-16 | Enquanto houver menos de 2 alternativas com texto, cada um dos espaços 1 e 2 que estiver vazio mostra a dica **"A resposta N não foi adicionada"**. Sem nenhuma correta, o editor mostra **"Marque pelo menos 1 resposta correta"**. | referência visual do Kahoot (2026-09-25) |
| RN-17 | O item da lista mostra o limite de tempo da pergunta, em segundos, na miniatura. | referência visual do Kahoot |
| RN-18 | Duplicar uma pergunta (spec 003, RN-12) copia também alternativas, corretas, opções de resposta, tempo e pontos. O mesmo vale para duplicar um quiz. | spec 003, RN-12, RN-27 |
| RN-19 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Alternativas

#### CA-01 — Quatro espaços por padrão

- **Dado** uma pergunta nova
- **Quando** o criador olha o centro do editor
- **Então** vê 4 alternativas editáveis com cor e forma, com os textos de apoio "Adicionar resposta 1", "Adicionar resposta 2", "Adicionar resposta 3 (opcional)" e "Adicionar resposta 4 (opcional)", e a ação "Adicionar mais respostas"

#### CA-02 — Escrever alternativas

- **Dado** uma pergunta selecionada
- **Quando** o criador escreve "Brasília" na resposta 1 e "Rio" na resposta 2
- **Então** depois que ele para de digitar, o estado passa a "Salvo", e ao recarregar os textos continuam lá

#### CA-03 — Limite de 75 caracteres

- **Dado** uma alternativa selecionada
- **Quando** o criador cola 80 caracteres
- **Então** o campo fica com os 75 primeiros
- **E** o servidor recusa uma alternativa com mais de 75 caracteres

#### CA-04 — Até 6 alternativas

- **Dado** uma pergunta com 4 espaços
- **Quando** o criador aciona "Adicionar mais respostas"
- **Então** aparecem os espaços 5 (turquesa, pentágono) e 6 (roxo, triângulo invertido), e a ação vira "Remover respostas extras"
- **Quando** ele escreve "Salvador" na resposta 5 e aciona "Remover respostas extras"
- **Então** voltam os 4 espaços, e ao recarregar a resposta 5 não existe mais

### Corretas e opções

#### CA-05 — Marcar a correta

- **Dado** uma pergunta com "Brasília" e "Rio"
- **Quando** o criador marca "Brasília" como correta
- **Então** ela aparece marcada e continua marcada ao recarregar

#### CA-06 — Alternativa vazia não é correta

- **Dado** uma pergunta com a resposta 3 vazia
- **Quando** o criador olha a marcação da resposta 3
- **Então** ela está indisponível
- **E** se ele apaga o texto de uma alternativa correta, ela deixa de ser correta

#### CA-07 — Segunda correta ativa a múltipla escolha

- **Dado** uma pergunta em seleção simples com "Brasília" correta
- **Quando** o criador marca "Rio" também
- **Então** as duas ficam corretas, "Opções de resposta" passa a "Múltipla escolha" e aparece o aviso "Múltipla escolha ativada"

#### CA-08 — Voltar para seleção simples

- **Dado** uma pergunta em múltipla escolha com as respostas 1 e 2 corretas
- **Quando** o criador escolhe "Seleção simples"
- **Então** só a resposta 1 continua correta, e o editor avisa que 1 resposta foi desmarcada

### Tempo e pontos

#### CA-09 — Limite de tempo

- **Dado** uma pergunta nova
- **Quando** o criador abre "Limite de tempo"
- **Então** vê as opções de 5 s a 4 min da RN-10, com 20 segundos escolhido
- **Quando** ele escolhe "1 minuto 30 segundos"
- **Então** a miniatura da pergunta na lista mostra "90", e o valor continua ao recarregar

#### CA-10 — Aplicar a todas

- **Dado** um quiz com 3 perguntas de 20 s, com a primeira em 45 s
- **Quando** o criador aciona "Aplicar a todas as perguntas" na primeira
- **Então** as 3 perguntas ficam com 45 s e aparece o aviso "Tempo aplicado a 3 perguntas"

#### CA-11 — Pontos

- **Dado** uma pergunta nova com "Padrão"
- **Quando** o criador escolhe "Pontos em dobro"
- **Então** a escolha continua ao recarregar
- **E** as opções são "Padrão", "Pontos em dobro" e "Sem pontos"

### Pergunta incompleta

#### CA-12 — Alerta na lista

- **Dado** uma pergunta sem enunciado, sem alternativas e sem correta
- **Quando** o criador olha a lista de perguntas
- **Então** o item dela tem um alerta que lista "Falta o texto da pergunta", "Adicione pelo menos 2 respostas" e "Marque pelo menos 1 resposta correta"
- **Quando** ele preenche o enunciado, duas alternativas e marca uma correta
- **Então** o alerta some

#### CA-13 — Dicas junto às alternativas

- **Dado** uma pergunta sem nenhuma alternativa escrita
- **Quando** o criador olha as alternativas
- **Então** vê "A resposta 1 não foi adicionada" e "A resposta 2 não foi adicionada"
- **E** com "Brasília" na resposta 1 e "Rio" na resposta 3, as dicas somem

#### CA-14 — Incompleta continua salva

- **Dado** uma pergunta incompleta
- **Quando** o criador sai do editor e volta
- **Então** tudo o que ele escreveu está lá, e o alerta continua

### Cópias

#### CA-15 — Duplicar copia tudo

- **Dado** uma pergunta com 5 alternativas, 2 corretas, múltipla escolha, 45 s e pontos em dobro
- **Quando** o criador a duplica
- **Então** a cópia tem as mesmas alternativas, corretas, opção de resposta, tempo e pontos, e alterar a cópia não muda a original

## Experiência (telas e estados)

- **Centro**: abaixo da área de mídia (ainda "Em breve", spec 007), uma grade de 2 colunas (1 coluna no celular) com as alternativas. Cada uma tem o bloco colorido com a forma à esquerda, o campo de texto e, à direita, a marcação redonda de correta (visível quando há texto). Abaixo de cada espaço obrigatório vazio aparece a dica da RN-16. Embaixo da grade fica a ação "Adicionar mais respostas" ou "Remover respostas extras".
- **Painel de propriedades**: "Tipo de pergunta" (Quiz, só leitura até a spec 005); "Limite de tempo" (lista) com o link "Aplicar a todas as perguntas"; "Pontos" (lista); "Opções de resposta" (lista); Excluir e Duplicar no rodapé.
- **Lista**: a miniatura mostra o tempo em um círculo, o começo do enunciado, as barras das alternativas preenchidas e, quando incompleta, um ícone de alerta com os motivos.
- **Avisos**: "Múltipla escolha ativada", "N resposta(s) desmarcada(s)" e "Tempo aplicado a N perguntas" aparecem como avisos passageiros.

## Divergências intencionais do Kahoot

- **6 alternativas e múltipla escolha são grátis** (constituição, artigo VI). No Kahoot, as duas são premium.
- **Cores e formas da 5ª e da 6ª alternativa** seguem a referência não confirmada (turquesa/pentágono e roxo/triângulo invertido, RN-01), até alguém confirmar o original.
- **"Remover respostas extras"** (RN-03) é uma decisão nossa. O comportamento exato do Kahoot para voltar de 6 para 4 espaços não está documentado.

## Fora de escopo

- Imagem nas alternativas e na pergunta (spec 007).
- Verdadeiro ou falso e troca de tipo (spec 005).
- Salvar a versão jogável, que é quem de fato bloqueia uma pergunta incompleta (spec 006).
- Reordenar alternativas dentro da pergunta (o Kahoot também não reordena).
- Tempo de leitura (`ReadTime`), que é regra da partida (spec 008).

## Perguntas em aberto

- [ ] **Cores e formas da 5ª e 6ª alternativa** — adotada a referência não confirmada (RN-01). Revisar se alguém confirmar o original.

## Changelog

- 2026-09-30 — spec criada e aprovada pelo usuário no mesmo pedido ("criar a spec e já parta para seu desenvolvimento"). Decisões do produto tomadas sem consulta prévia, registradas nas RNs 01, 03, 06, 09 e 14.
- 2026-10-01 — implementada (tarefas T01 a T17).
