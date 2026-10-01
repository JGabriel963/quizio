---
id: "005"
title: Editor 3/5 — Verdadeiro ou falso e troca de tipo
status: done # draft | approved | planned | in-progress | done
contexts: [quiz]
created: 2026-10-01
---

# 005 — Editor 3/5: Verdadeiro ou falso e troca de tipo

## Contexto e problema

A spec 004 completou a pergunta Quiz. O editor ainda só conhece esse tipo: "Adicionar" sempre cria uma pergunta Quiz, e "Tipo de pergunta" no painel de propriedades é só leitura.

No Kahoot, Quiz e Verdadeiro ou falso são os dois tipos gratuitos e cobrem a maior parte do uso (kahoot-reference §13). Adicionar uma pergunta começa pela escolha do tipo, e o criador pode mudar o tipo de uma pergunta que já existe. Sem isso, uma afirmação simples ("A capital do Brasil é Brasília") precisa ser montada à mão como um Quiz de duas alternativas.

| Spec | Etapa |
| --- | --- |
| 003 | Fundação e lista de perguntas ✅ |
| 004 | Pergunta Quiz completa ✅ |
| **005** | **Verdadeiro ou falso e troca de tipo (esta spec)** |
| 006 | Salvar a versão jogável |
| 007 | Mídia nas perguntas |

## Objetivo

O criador escolhe o tipo ao adicionar uma pergunta, monta uma pergunta Verdadeiro ou falso marcando a resposta certa, e troca o tipo de uma pergunta existente sem perder, enquanto estiver no editor, o que já tinha escrito.

## Personas

- **Criador (`Creator`)** — dono do quiz, único que o edita (kahoot-reference §1).

## Histórias de usuário

- **HU-01** — Como criador, quero escolher o tipo da pergunta ao adicioná-la, para começar já no formato certo.
- **HU-02** — Como criador, quero criar uma afirmação de Verdadeiro ou falso só marcando a resposta certa, sem escrever alternativas.
- **HU-03** — Como criador, quero trocar o tipo de uma pergunta que já escrevi, para não ter que apagá-la e refazê-la.
- **HU-04** — Como criador, quero poder voltar atrás numa troca de tipo sem perder as respostas que já tinha escrito.
- **HU-05** — Como criador, quero ver o que falta numa pergunta Verdadeiro ou falso, como já vejo na pergunta Quiz.

## Regras de negócio

### Escolher o tipo ao adicionar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Os **tipos de pergunta (`QuestionType`)** disponíveis passam a ser **Quiz (`quiz`)** e **Verdadeiro ou falso (`trueFalse`)**. | kahoot-reference §4.1.1, §4.1.2, §13 |
| RN-02 | A ação **Adicionar** abre o **seletor de tipo**, com a aparência do seletor do Kahoot: um painel ao lado do botão, com o grupo **"Testar conhecimento"** e um cartão por tipo (ícone e nome). Ele mostra apenas os tipos disponíveis (RN-01); tipos e grupos futuros entram no seletor quando forem entregues. | kahoot-reference §3.2 · referência visual do Kahoot (2026-10-01) · decisão do produto (2026-10-01) |
| RN-03 | Escolher um tipo cria uma pergunta **em branco daquele tipo**, logo depois da pergunta selecionada, e a seleciona (mesma posição da spec 003, RN-11). Fechar o seletor sem escolher não cria nada. | spec 003, RN-11 · kahoot-reference §3.2 |
| RN-04 | O limite de 200 perguntas (spec 003, RN-16) vale para qualquer tipo: no limite, Adicionar fica indisponível com o motivo, e o seletor não abre. | spec 003, RN-16 |
| RN-05 | A ação **Criar** continua criando o quiz com **uma pergunta Quiz em branco** (spec 003, RN-04), sem passar pelo seletor. | spec 003, RN-04 |

### Pergunta Verdadeiro ou falso

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | Uma pergunta Verdadeiro ou falso tem **duas alternativas fixas**, nesta ordem: **"Verdadeiro"** (azul, losango) e **"Falso"** (vermelho, triângulo). O texto, a ordem, a cor e a forma **não são editáveis**, e não é possível adicionar nem remover alternativas. | kahoot-reference §4.1.2 · decisão do produto (2026-10-01) para cor e forma |
| RN-07 | **Exatamente uma** das duas é a correta. A pergunta nasce **sem nenhuma marcada**. Marcar uma desmarca a outra. Depois de marcada, sempre há uma correta: **desmarcar a que está marcada passa a marcação para a outra** (não dá para voltar a "nenhuma"). | kahoot-reference §4.1.2 · comportamento do Kahoot informado pelo usuário (2026-10-01) |
| RN-08 | A seleção é sempre simples: o painel de propriedades **não mostra "Opções de resposta"** nesse tipo. | kahoot-reference §4.1.2 |
| RN-09 | Enunciado (≤ 160 caracteres, spec 003, RN-10), **limite de tempo** (mesma lista de 5 s a 4 min, padrão 20 s) e **pontos** (Padrão, Pontos em dobro, Sem pontos) funcionam como na pergunta Quiz. "Aplicar a todas as perguntas" atinge perguntas de qualquer tipo. | kahoot-reference §4.1.2, §5.1, §5.2 · spec 004, RN-10 a RN-12 |
| RN-10 | A resposta correta é salva assim que marcada, como as demais edições. | spec 003, RN-20 |

### Pergunta incompleta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | Uma pergunta Verdadeiro ou falso está **incompleta** quando: (a) não tem enunciado, ou (b) não tem a resposta correta marcada. | kahoot-reference §3.6 · spec 004, RN-14 · decisão do produto (2026-10-01) |
| RN-12 | Como na pergunta Quiz (spec 004, RN-15), a pergunta incompleta **continua sendo salva**, ganha o **alerta na lista** com os motivos e vai impedir salvar a versão jogável (spec 006). Sem correta marcada, o editor mostra junto às alternativas a dica **"Marque a resposta correta"**. | spec 004, RN-15, RN-16 |
| RN-13 | O item da lista mostra o tipo pelo nome (**"N Verdadeiro ou falso"**), o tempo e uma miniatura com as duas alternativas. | spec 003, RN-17 · spec 004, RN-17 |

### Troca de tipo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | **"Tipo de pergunta"**, no painel de propriedades, deixa de ser só leitura: é uma lista com os tipos disponíveis, e escolher outro **troca o tipo da pergunta selecionada**. Escolher o tipo atual não muda nada. | kahoot-reference §3.2 · decisão do produto (2026-10-01) |
| RN-15 | A troca **mantém** o enunciado, o limite de tempo, os pontos e a posição da pergunta. | decisão do produto (2026-10-01) |
| RN-16 | A troca **substitui as respostas** pelas do novo tipo. Indo para Verdadeiro ou falso, saem as alternativas escritas, as corretas e a opção de resposta do Quiz, e entram "Verdadeiro" e "Falso" sem correta marcada. Indo para Quiz, sai a marcação de Verdadeiro/Falso e entram 4 espaços vazios em seleção simples. | decisão do produto (2026-10-01) |
| RN-17 | **Enquanto o criador não sai do editor**, o editor **lembra as respostas que a pergunta tinha em cada tipo**. Voltar a um tipo já usado nessa sessão traz de volta o que havia nele: no Quiz, as alternativas, as corretas, as respostas extras e a opção de resposta; no Verdadeiro ou falso, a correta marcada. Vale no lugar dos valores em branco da RN-16. | roadmap (005) · decisão do produto (2026-10-01) |
| RN-18 | Essa lembrança **não é salva**: recarregar a página ou sair do editor a descarta. O quiz salvo guarda só as respostas do tipo atual de cada pergunta. | decisão do produto (2026-10-01) |
| RN-19 | Trocar de Quiz para Verdadeiro ou falso quando há **alguma alternativa escrita** acontece **na hora, sem confirmação**, e mostra o aviso passageiro: **"As respostas do Quiz voltam se você retornar para Quiz antes de sair do editor"**. Sem alternativas escritas, e no sentido contrário, não há aviso. | decisão do produto (2026-10-01) |
| RN-20 | A troca de tipo é salva automaticamente, como as demais edições. O servidor recusa um tipo que não esteja entre os disponíveis. | spec 003, RN-20 |

### Cópias e textos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | Duplicar uma pergunta ou um quiz copia o tipo e as respostas do tipo atual, incluindo a correta de Verdadeiro ou falso. O que o editor lembrava de outro tipo (RN-17) **não** vai para a cópia. | spec 003, RN-12, RN-27 · spec 004, RN-18 |
| RN-22 | Todos os textos das telas desta feature são em português do Brasil. Nas alternativas, a cor nunca é o único indicador: sempre há forma e texto. | constituição, artigos VIII e IX |

## Critérios de aceite

### Escolher o tipo

#### CA-01 — Seletor de tipo

- **Dado** um quiz aberto no editor
- **Quando** o criador aciona "Adicionar"
- **Então** aparece o seletor com o grupo "Testar conhecimento" e os cartões "Quiz" e "Verdadeiro ou falso", e nenhum outro tipo

#### CA-02 — Adicionar Verdadeiro ou falso

- **Dado** um quiz com as perguntas A, B e C, com A selecionada
- **Quando** o criador aciona "Adicionar" e escolhe "Verdadeiro ou falso"
- **Então** a nova pergunta entra na posição 2, fica selecionada e aparece na lista como "2 Verdadeiro ou falso"
- **E** ao recarregar, ela continua lá, nesse tipo e nessa posição

#### CA-03 — Adicionar Quiz

- **Dado** o seletor aberto
- **Quando** o criador escolhe "Quiz"
- **Então** é criada uma pergunta Quiz em branco, com 4 espaços de alternativa, como antes desta feature

#### CA-04 — Fechar sem escolher

- **Dado** o seletor aberto num quiz com 3 perguntas
- **Quando** o criador fecha o seletor (Esc ou clicando fora)
- **Então** o quiz continua com 3 perguntas e a seleção não muda

#### CA-05 — Limite de perguntas

- **Dado** um quiz com 200 perguntas
- **Quando** o criador olha a ação "Adicionar"
- **Então** ela está indisponível com o motivo "Limite de 200 perguntas atingido", e o seletor não abre

#### CA-06 — Criar não passa pelo seletor

- **Dado** o criador no painel
- **Quando** ele aciona "Criar"
- **Então** o editor abre com uma pergunta Quiz em branco, sem mostrar o seletor

### Pergunta Verdadeiro ou falso

#### CA-07 — Alternativas fixas

- **Dado** uma pergunta Verdadeiro ou falso nova
- **Quando** o criador olha o centro do editor
- **Então** vê "Verdadeiro" (azul, losango) e depois "Falso" (vermelho, triângulo), nenhuma marcada como correta
- **E** os textos não podem ser editados, e não existe "Adicionar mais respostas"

#### CA-08 — Marcar a correta

- **Dado** uma pergunta Verdadeiro ou falso sem correta
- **Quando** o criador marca "Verdadeiro"
- **Então** "Verdadeiro" fica marcada, o estado passa a "Salvo", e ao recarregar continua marcada
- **Quando** ele marca "Falso"
- **Então** só "Falso" fica marcada
- **Quando** ele aciona de novo a marcação de "Falso" (tenta desmarcá-la)
- **Então** "Verdadeiro" passa a ser a marcada, e "Falso" fica desmarcada
- **E** o mesmo vale no sentido contrário: desmarcar "Verdadeiro" marca "Falso"

#### CA-09 — Painel de propriedades

- **Dado** uma pergunta Verdadeiro ou falso selecionada
- **Quando** o criador olha o painel de propriedades
- **Então** vê "Tipo de pergunta" com "Verdadeiro ou falso", "Limite de tempo" com 20 segundos e "Pontos" com "Padrão"
- **E** não vê "Opções de resposta"

#### CA-10 — Tempo e pontos

- **Dado** uma pergunta Verdadeiro ou falso
- **Quando** o criador escolhe "10 segundos" e "Pontos em dobro"
- **Então** a miniatura na lista mostra "10", e as duas escolhas continuam ao recarregar

#### CA-11 — Aplicar o tempo a todas

- **Dado** um quiz com uma pergunta Quiz em 45 s e duas Verdadeiro ou falso em 20 s
- **Quando** o criador aciona "Aplicar a todas as perguntas" na pergunta Quiz
- **Então** as 3 perguntas ficam com 45 s

### Pergunta incompleta

#### CA-12 — Alerta na lista

- **Dado** uma pergunta Verdadeiro ou falso sem enunciado e sem correta
- **Quando** o criador olha a lista
- **Então** o item tem um alerta que lista "Falta o texto da pergunta" e "Marque a resposta correta"
- **Quando** ele escreve o enunciado e marca "Falso"
- **Então** o alerta some

#### CA-13 — Dica junto às alternativas

- **Dado** uma pergunta Verdadeiro ou falso sem correta
- **Quando** o criador olha as alternativas
- **Então** vê a dica "Marque a resposta correta"
- **E** a dica some quando ele marca uma das duas

#### CA-14 — Incompleta continua salva

- **Dado** uma pergunta Verdadeiro ou falso com enunciado e sem correta
- **Quando** o criador sai do editor e volta
- **Então** o enunciado está lá, e o alerta continua

### Troca de tipo

#### CA-15 — Trocar de Quiz para Verdadeiro ou falso

- **Dado** uma pergunta Quiz com o enunciado "A capital do Brasil é Brasília", "Sim" e "Não" nas respostas 1 e 2, "Sim" correta, 30 s e pontos em dobro
- **Quando** o criador escolhe "Verdadeiro ou falso" em "Tipo de pergunta"
- **Então** a pergunta mostra "Verdadeiro" e "Falso" sem correta, com o mesmo enunciado, 30 s e pontos em dobro, na mesma posição
- **E** aparece o aviso "As respostas do Quiz voltam se você retornar para Quiz antes de sair do editor"
- **E** ao recarregar, a pergunta continua Verdadeiro ou falso

#### CA-16 — Voltar para Quiz na mesma sessão

- **Dado** a pergunta do CA-15, logo após a troca e sem recarregar
- **Quando** o criador escolhe "Quiz" em "Tipo de pergunta"
- **Então** voltam "Sim" e "Não" nas respostas 1 e 2, com "Sim" correta, e ao recarregar elas continuam lá

#### CA-17 — Respostas extras e múltipla escolha voltam

- **Dado** uma pergunta Quiz com 6 espaços, respostas 1 e 5 corretas, em múltipla escolha
- **Quando** o criador troca para Verdadeiro ou falso e de volta para Quiz, sem recarregar
- **Então** a pergunta volta com os 6 espaços, as mesmas respostas, as respostas 1 e 5 corretas e "Múltipla escolha"

#### CA-18 — Depois de recarregar, não volta

- **Dado** a pergunta do CA-15, depois de recarregar a página
- **Quando** o criador escolhe "Quiz" em "Tipo de pergunta"
- **Então** a pergunta tem 4 espaços vazios em seleção simples, e o enunciado, os 30 s e os pontos em dobro continuam

#### CA-19 — A correta de Verdadeiro ou falso também volta

- **Dado** uma pergunta Verdadeiro ou falso com "Falso" correta
- **Quando** o criador troca para Quiz e de volta para Verdadeiro ou falso, sem recarregar
- **Então** "Falso" volta marcada

#### CA-20 — Sem respostas, sem aviso

- **Dado** uma pergunta Quiz sem nenhuma alternativa escrita
- **Quando** o criador troca para Verdadeiro ou falso
- **Então** a troca acontece e nenhum aviso aparece
- **E** trocar de Verdadeiro ou falso para Quiz também não mostra aviso

#### CA-21 — Escolher o mesmo tipo

- **Dado** uma pergunta Quiz com respostas escritas
- **Quando** o criador escolhe "Quiz" em "Tipo de pergunta"
- **Então** nada muda e nada é salvo de novo

#### CA-22 — Tipo desconhecido é recusado

- **Dado** uma pergunta do criador
- **Quando** chega ao servidor um pedido para trocá-la para um tipo que não existe
- **Então** o servidor recusa e a pergunta não muda

### Cópias

#### CA-23 — Duplicar copia o tipo

- **Dado** uma pergunta Verdadeiro ou falso com "Verdadeiro" correta, 10 s e sem pontos
- **Quando** o criador a duplica
- **Então** a cópia é Verdadeiro ou falso com "Verdadeiro" correta, 10 s e sem pontos, e alterar a cópia não muda a original
- **E** duplicar o quiz inteiro na biblioteca também preserva o tipo e a correta

#### CA-24 — A cópia não herda o que o editor lembrava

- **Dado** uma pergunta que era Quiz com "Sim" e "Não" e foi trocada para Verdadeiro ou falso nesta sessão
- **Quando** o criador a duplica e troca a cópia para Quiz
- **Então** a cópia tem 4 espaços vazios

## Experiência (telas e estados)

- **Seletor de tipo**: como no Kahoot, um painel branco que abre ao lado do botão "Adicionar" (abaixo dele no celular, ocupando a largura da tela). Tem o título de grupo "Testar conhecimento" e, abaixo, uma grade de cartões cinza-claros, cada um com um ícone colorido do tipo em cima e o nome em negrito embaixo: "Quiz" e "Verdadeiro ou falso". Fecha ao escolher, com Esc ou ao clicar fora. Pode ser usado só com o teclado.
- **Centro (Verdadeiro ou falso)**: abaixo do enunciado e da área de mídia (ainda "Em breve", spec 007), duas alternativas lado a lado (empilhadas no celular): "Verdadeiro" em azul com losango e "Falso" em vermelho com triângulo, com o texto fixo e a marcação redonda de correta à direita. Sem ação de adicionar respostas. Sem correta marcada, o balão "Marque a resposta correta" aparece abaixo delas, seguindo a regra de quando avisar da spec 004 (RN-16a): não numa pergunta recém-começada.
- **Painel de propriedades**: "Tipo de pergunta" vira uma lista como a do Kahoot: o campo mostra o ícone e o nome do tipo atual e, ao abrir, o grupo "Testar conhecimento" com um cartão por tipo ("Quiz" e "Verdadeiro ou falso"), o atual destacado. Em Verdadeiro ou falso, o painel mostra "Limite de tempo" (com "Aplicar a todas as perguntas") e "Pontos", sem "Opções de resposta". Excluir e Duplicar continuam no rodapé.
- **Lista**: o item mostra "N Verdadeiro ou falso", o tempo no círculo, o começo do enunciado e duas barras (azul e vermelha) no lugar das quatro do Quiz. O alerta de incompleta lista os motivos da RN-11.
- **Aviso**: a mensagem da RN-19 aparece como aviso passageiro, no mesmo estilo dos avisos da spec 004.
- **Estados**: a troca de tipo e a marcação da correta seguem o salvamento automático ("Salvando…", "Salvo", falha com "Tentar de novo"), como as demais edições.

## Divergências intencionais do Kahoot

- **Seletor só com os tipos entregues** (RN-02). A aparência segue o Kahoot (painel ao lado do botão, grupo e cartões), mas o Kahoot mostra todos os tipos nos grupos *Testar conhecimento*, *Coletar opiniões* e *Slides*, e as abas Adicionar / Procurar / Gerar / Importar. Os demais grupos e as abas entram com as features correspondentes.
- **Cor e forma de Verdadeiro e Falso** (RN-06) seguem o padrão citado como comum na referência (azul/losango e vermelho/triângulo), que não é confirmado oficialmente.
- **Lembrar as respostas de cada tipo durante a sessão** (RN-17 a RN-19) é uma decisão nossa. O comportamento do Kahoot ao trocar o tipo de uma pergunta não está documentado na referência.

## Fora de escopo

- Outros tipos de pergunta e slides (specs 011 a 013 e 017), e os grupos do seletor.
- Abas Procurar, Gerar e Importar ao adicionar (specs 016 e 017).
- Guardar as respostas do tipo anterior depois de sair do editor ou recarregar (RN-18).
- Converter respostas entre tipos (por exemplo, aproveitar "Sim"/"Não" do Quiz como Verdadeiro/Falso).
- Trocar o tipo de várias perguntas de uma vez.
- Salvar a versão jogável, que é quem de fato bloqueia uma pergunta incompleta (spec 006).
- Imagem na pergunta (spec 007).
- Como Verdadeiro ou falso aparece e pontua na partida (spec 008).

## Perguntas em aberto

- [ ] **Cor e forma de Verdadeiro e Falso** — adotado azul/losango e vermelho/triângulo (RN-06). Revisar se alguém confirmar o original.
- [ ] **Troca de tipo no Kahoot** — a referência não documenta o que o Kahoot faz com as respostas ao trocar o tipo. Adotada a decisão do produto (RN-16 a RN-19). Revisar se o comportamento original for levantado.

## Changelog

- 2026-10-01 — spec criada. Decisões do produto confirmadas com o usuário: cor e forma de Verdadeiro/Falso (RN-06), seletor só com os tipos entregues (RN-02) e troca direta com aviso (RN-19). Decisões tomadas sem consulta prévia: RN-07 (sempre uma correta depois de marcada), RN-11, RN-15 a RN-18 e RN-21.
- 2026-10-01 — revisão do usuário: o seletor segue a aparência do Kahoot (RN-02, com a captura de tela como referência visual) e, em Verdadeiro ou falso, desmarcar a correta marca a outra, como no Kahoot (RN-07, CA-08). Spec aprovada pelo usuário, com pedido para implementar em seguida.
- 2026-10-01 — implementada (tarefas T01 a T18).
- 2026-10-01 — ajustes de layout pedidos pelo usuário: "Tipo de pergunta" com cartões e ícone, como no Kahoot; a dica da correta virou balão e segue a spec 004, RN-16a.
