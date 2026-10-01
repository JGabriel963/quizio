---
id: "006"
title: Editor 4/5 — Salvar a versão jogável
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, library]
created: 2026-10-01
---

# 006 — Editor 4/5: Salvar a versão jogável

## Contexto e problema

As specs 003 a 005 deixaram o criador montar um quiz inteiro, com perguntas Quiz e Verdadeiro ou falso, e tudo é salvo sozinho. Só que todo quiz continua **rascunho** para sempre: nada diz que ele está pronto, e uma pergunta incompleta nunca impede nada. O editor avisa o que falta (specs 004 e 005), mas não cobra.

No Kahoot, o salvamento automático guarda o trabalho, e o botão **Salvar** do cabeçalho faz outra coisa: confere o kahoot inteiro e o libera para ser jogado (kahoot-reference §3.6). Sem título ou com pergunta incompleta, ele não salva. Depois de salvo, o criador pode voltar a editar sem estragar o que já está jogável: o que ele muda fica guardado como alteração pendente até o próximo Salvar.

A partida ao vivo (spec 008) precisa exatamente disso: um conteúdo conferido e congelado, que não muda no meio do jogo porque alguém editou uma pergunta.

| Spec | Etapa |
| --- | --- |
| 003 | Fundação e lista de perguntas ✅ |
| 004 | Pergunta Quiz completa ✅ |
| 005 | Verdadeiro ou falso e troca de tipo ✅ |
| **006** | **Salvar a versão jogável (esta spec)** |
| 007 | Imagem na pergunta |

## Objetivo

O criador aciona **Salvar** e, se o quiz estiver completo, ele passa a ter uma **versão jogável** congelada e deixa de ser rascunho. Se faltar algo, o editor mostra o que falta e leva até lá. Depois de publicado, o criador continua editando com segurança: a versão jogável só muda no próximo Salvar, e ele pode descartar o que mudou.

## Personas

- **Criador (`Creator`)** — dono do quiz, único que o edita e o salva (kahoot-reference §1).

## Histórias de usuário

- **HU-01** — Como criador, quero salvar meu quiz como pronto para jogar, para saber que ele está completo.
- **HU-02** — Como criador, quero que o Salvar me mostre o que falta e me leve até cada pergunta incompleta, para corrigir sem procurar.
- **HU-03** — Como criador, quero continuar editando um quiz já publicado sem alterar o que está jogável, para não quebrar uma aula por causa de uma edição pela metade.
- **HU-04** — Como criador, quero ver quando um quiz publicado tem alterações que ainda não valem para o jogo, para lembrar de salvá-las.
- **HU-05** — Como criador, quero descartar as alterações que fiz depois de publicar, para voltar ao que estava jogável.
- **HU-06** — Como criador, quero distinguir na biblioteca os rascunhos dos quizzes prontos.

## Regras de negócio

### Versão jogável e status

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | A **versão jogável (`QuizVersion`)** é uma **cópia congelada da lista de perguntas** do quiz no momento do Salvar: ordem, tipo, enunciado, limite de tempo, pontos e respostas de cada pergunta. Depois de criada, ela nunca é alterada. | kahoot-reference §3.6 (versionamento, snapshot) |
| RN-02 | Um quiz está em um de dois **status**: **rascunho (`draft`)**, quando nunca foi salvo como jogável, ou **publicado (`published`)**, quando tem uma versão jogável. Todo quiz nasce rascunho. | kahoot-reference §3.6 · roadmap (006) |
| RN-03 | Um quiz publicado **não volta a ser rascunho**. | decisão do produto (2026-10-01) |
| RN-04 | Um quiz publicado tem **uma** versão jogável vigente: a do último Salvar. Cada Salvar que cria versão aumenta o **número da versão** em 1, começando em 1. O Quizio não mostra nem restaura versões anteriores. | kahoot-reference §3.6 (`version`) · decisão do produto (2026-10-01) |
| RN-05 | Uma partida usa a versão jogável vigente quando ela começa, e Salvar de novo não muda uma partida já iniciada. Esta spec garante a versão; o uso é da spec 008. | kahoot-reference §3.6 · constituição, artigo V |
| RN-06 | Os **dados do quiz** — título, descrição, capa e visibilidade — **não fazem parte da versão**: uma mudança neles vale na hora, em todo lugar, e não conta como alteração não salva. | decisão do produto (2026-10-01) |

### Salvar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | O cabeçalho do editor ganha a ação **Salvar**, no espaço reservado pela spec 003, ao lado de Sair. Ela está sempre disponível, exceto enquanto um Salvar está em andamento. | kahoot-reference §3.6 · spec 003 (Experiência) |
| RN-08 | Antes de conferir o quiz, Salvar **espera o salvamento automático terminar**. Se ele falhar, Salvar para e o cabeçalho mostra a falha de sempre ("Não foi possível salvar · Tentar de novo"); nenhuma versão é criada. | spec 003, RN-21 a RN-23 |
| RN-09 | Salvar só cria a versão se **todas as perguntas estiverem completas**, pelas regras da spec 004 (RN-14) e da spec 005 (RN-11). A pergunta recém-começada, que o editor ainda não avisa (spec 004, RN-16a), **conta como incompleta** aqui. | kahoot-reference §3.6 · spec 004, RN-15 · spec 005, RN-12 |
| RN-10 | Com perguntas incompletas, Salvar abre o diálogo **"Não é possível jogar este quiz"**, com o texto "Todas as perguntas precisam ser concluídas antes de começar a jogar." e a lista de **cada pergunta incompleta**, na ordem do quiz: a miniatura, o número e o tipo ("2 - Quiz"), a ação **Corrigir** e, abaixo, **um motivo por linha**. No rodapé, **Voltar para edição** e **Deixar sem salvar**. Nada é publicado. | referência visual do Kahoot (2026-10-01) |
| RN-10a | Os motivos usam os textos do Kahoot: **"Pergunta ausente"** (sem enunciado); **"2 respostas faltando"** ou **"1 resposta faltando"** (pergunta Quiz com menos de 2 alternativas escritas; o número é quantas faltam para chegar a 2); **"Resposta correta não selecionada"** (sem correta, nos dois tipos). O alerta da lista de perguntas (spec 004, RN-15; spec 005, RN-12) passa a usar **os mesmos textos**. | referência visual do Kahoot (2026-10-01) — altera os textos das specs 004 e 005 |
| RN-11 | **Corrigir** fecha o diálogo e seleciona aquela pergunta, já com os balões do que falta à mostra. Depois de uma tentativa de Salvar, **todas** as perguntas incompletas passam a ter o alerta na lista, inclusive as recém-começadas. **Voltar para edição** (e Esc ou clicar fora) fecha o diálogo sem mudar a seleção. | referência visual do Kahoot (2026-10-01) · spec 004, RN-16, RN-16a |
| RN-11a | **Deixar sem salvar** sai do editor para a **Biblioteca**, sem publicar. O conteúdo fica como está, guardado pelo salvamento automático: um rascunho continua rascunho, e um quiz publicado mantém as alterações não salvas (como na RN-25), sem abrir o diálogo de saída. | referência visual do Kahoot (2026-10-01) · decisão do produto (2026-10-01) |
| RN-12 | Salvar só cria a versão se o quiz tiver **título**. Sem título e com todas as perguntas completas, Salvar abre o diálogo **"Toques finais"**, com o **título** (até 95 caracteres) e a **descrição** (opcional, até 500), cada campo mostrando quantos caracteres ainda cabem, e as ações **Cancelar** e **Continuar**. Continuar grava título e descrição e segue com o Salvar; Cancelar volta ao editor sem gravar nem publicar. Continuar fica indisponível enquanto o título estiver vazio ou só com espaços. | referência visual do Kahoot (2026-10-01) · kahoot-reference §3.1, §3.6 · spec 001, RN-12, RN-13 |
| RN-13 | Quando faltam as duas coisas, o editor mostra **primeiro as perguntas incompletas**; o título é pedido no Salvar seguinte. | decisão do produto (2026-10-01) |
| RN-14 | **O servidor é quem decide**: ele confere de novo título e perguntas no momento de congelar, e congela exatamente o que conferiu. Se recusar, nada muda e o editor mostra o motivo. Um quiz na lixeira, de outro dono ou inexistente não pode ser salvo (spec 001, RN-10, RN-22). | constituição, artigo II · spec 001, RN-10, RN-22 |
| RN-15 | Salvar com sucesso torna o quiz **publicado**, cria a versão, zera as alterações não salvas e abre o diálogo **"O quiz está pronto"**, com as ações **Voltar para edição** e **Pronto**. **Pronto** leva à **Biblioteca** (Recentes). **Voltar para edição** (e Esc ou clicar fora) fecha o diálogo e deixa o criador no editor, com o quiz já publicado. | referência visual do Kahoot e comportamento informado pelo usuário (2026-10-01) |
| RN-15a | O diálogo "O quiz está pronto" mostra as quatro opções do Kahoot — **Iniciar demonstração**, **Organizar ao vivo**, **Palestra** e **Compartilhar** —, todas marcadas **"Em breve"**: visíveis, indisponíveis e anunciadas como tal, como os demais pontos de entrada futuros (spec 002). Cada uma passa a funcionar com a feature correspondente, em outra entrega (specs 008, 016 e 020). | referência visual do Kahoot · decisão do usuário (2026-10-01) |
| RN-16 | Salvar um quiz publicado **sem alterações não salvas** não cria versão nova nem muda o número da versão: só abre o diálogo "O quiz está pronto". | decisão do produto (2026-10-01) |
| RN-17 | Criar uma versão atualiza a **última modificação** do quiz. | spec 001, RN-18 · spec 003, RN-24 |

### Editar depois de publicar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | Um quiz publicado continua abrindo no editor, com salvamento automático como antes. O que o criador muda nas perguntas **não altera a versão jogável** até o próximo Salvar. | kahoot-reference §3.6 · roadmap (006) |
| RN-19 | Um quiz publicado tem **alterações não salvas** quando a lista de perguntas atual é **diferente** da versão jogável, em ordem ou em conteúdo. Desfazer à mão o que foi mudado faz as alterações não salvas sumirem. Um rascunho nunca tem alterações não salvas. | roadmap (006) · decisão do produto (2026-10-01) |
| RN-20 | Um quiz publicado **pode ficar com perguntas incompletas** enquanto é editado: a versão jogável continua a anterior, e o próximo Salvar é que cobra (RN-09). | decisão do produto (2026-10-01) |
| RN-21 | Um quiz publicado **não pode ficar sem título**. Apagar o título no cabeçalho do editor ou nos dados do quiz é recusado com **"Um quiz publicado precisa de título"**, e o título anterior continua valendo. | kahoot-reference §3.1 · consequência da RN-06 e da RN-12 |
| RN-22 | O cabeçalho do editor mostra o **estado do quiz** num selo: **"Rascunho"**, **"Publicado"** ou **"Alterações não salvas"**. O estado do salvamento automático (spec 003, RN-21) continua ao lado, sem mudar. | decisão do produto (2026-10-01) |

### Sair e descartar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-23 | A ação **Sair** do cabeçalho passa a levar à **Biblioteca**, como no Kahoot, e não mais à página do quiz. Num **rascunho**, ou num quiz publicado **sem** alterações não salvas, ela sai direto, depois de esperar o salvamento automático (spec 003, RN-23). A marca do Quizio continua levando à página inicial. | referência do Kahoot · decisão do produto (2026-10-01) — substitui o destino da spec 003, RN-06 |
| RN-24 | Sair do editor de um quiz publicado **com** alterações não salvas abre o diálogo **"Algumas alterações não foram salvas"**, com o texto "Se você descartar as alterações, elas serão perdidas." e três ações: **Descartar**, **Deixar sem salvar** e **Voltar para edição**. Vale para **Sair** e para a marca do Quizio no cabeçalho. Fechar o diálogo (Esc, clicar fora) equivale a Voltar para edição. | referência visual do Kahoot (2026-10-01) |
| RN-25 | **Deixar sem salvar** sai do editor para o destino pedido (Biblioteca ou página inicial). As alterações continuam guardadas, a versão jogável continua a anterior, e o quiz fica marcado como "Alterações não salvas". É a mesma ação do diálogo de perguntas incompletas (RN-11a). | referência visual do Kahoot (2026-10-01) |
| RN-26 | **Descartar** faz a lista de perguntas voltar a ser **igual à da versão jogável** (ordem e conteúdo) e sai do editor para o destino pedido. Não pode ser desfeito. Os dados do quiz não são afetados (RN-06). | referência visual do Kahoot (2026-10-01) · decisão do produto (2026-10-01) |
| RN-27 | O diálogo espera o salvamento automático terminar antes de sair ou descartar. Se descartar falhar, o editor continua aberto, com as alterações, e mostra o erro. | spec 003, RN-22, RN-23 |
| RN-28 | Fechar a aba ou o navegador não abre o diálogo: as alterações ficam mantidas, como na RN-25. | decisão do produto (2026-10-01) |

### Biblioteca e página do quiz

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-29 | **Rascunhos** lista só quizzes que **nunca foram publicados**. Ao ser salvo pela primeira vez, o quiz sai de Rascunhos. **Recentes** continua listando todos. | kahoot-reference §11.1 · decisão do produto (2026-10-01, confirmada com o usuário) |
| RN-30 | Em Recentes, em "Seus quizzes" (página inicial) e na página do quiz, um rascunho mostra o selo **"Rascunho"**, e um quiz publicado com alterações não salvas mostra o selo **"Alterações não salvas"**. Um quiz publicado sem alterações não mostra selo de status. | decisão do produto (2026-10-01, confirmada com o usuário) |
| RN-31 | A página do quiz informa se ele é rascunho ("Ainda não foi salvo como jogável") ou quando a versão jogável foi salva ("Versão jogável salva há …"). | decisão do produto (2026-10-01) |
| RN-32 | **Duplicar** um quiz cria sempre um **rascunho**, sem versão jogável, com a lista de perguntas **atual** do original, incluindo as alterações não salvas. | spec 001, RN-20 · spec 003, RN-27 |
| RN-33 | Mover para a lixeira e restaurar **preservam** o status, a versão jogável e as alterações não salvas. Excluir definitivamente remove também a versão jogável. | spec 001, RN-21 a RN-23 |
| RN-34 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Salvar

#### CA-01 — Salvar um quiz completo

- **Dado** um rascunho "Geografia" com 2 perguntas completas, aberto no editor
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo "O quiz está pronto", com "Voltar para edição" e "Pronto"
- **Quando** ele aciona **Pronto**
- **Então** chega à Biblioteca, em Recentes, onde "Geografia" aparece sem o selo "Rascunho"
- **E** o quiz não aparece mais em Rascunhos, e a página dele informa que a versão jogável foi salva

#### CA-02 — A versão guarda as perguntas

- **Dado** um quiz com uma pergunta Quiz (múltipla escolha, 6 espaços, 45 s, pontos em dobro) e uma Verdadeiro ou falso ("Falso" correta, 10 s, sem pontos)
- **Quando** o criador salva
- **Então** a versão 1 tem as duas perguntas, nessa ordem, com tipo, enunciado, tempo, pontos e respostas iguais aos do editor

#### CA-03 — Perguntas incompletas

- **Dado** um quiz com título e 3 perguntas, em que a 2 não tem resposta correta e a 3 não tem enunciado nem respostas
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo "Não é possível jogar este quiz", listando "2 - Quiz" com "Resposta correta não selecionada" e "3 - Quiz" com "Pergunta ausente", "2 respostas faltando" e "Resposta correta não selecionada"
- **E** a pergunta 1 não aparece na lista
- **E** o quiz continua rascunho

#### CA-04 — Corrigir leva à pergunta

- **Dado** o diálogo do CA-03
- **Quando** o criador aciona **Corrigir** na pergunta 3
- **Então** o diálogo fecha, a pergunta 3 fica selecionada e os balões do que falta aparecem nela
- **E** as perguntas 2 e 3 têm o alerta na lista

#### CA-05 — Pergunta recém-começada também bloqueia

- **Dado** um quiz com título, uma pergunta completa e uma pergunta recém-adicionada, ainda em branco e sem alerta
- **Quando** o criador aciona **Salvar**
- **Então** o diálogo lista a pergunta em branco, e ela passa a ter o alerta na lista

#### CA-06 — Voltar para edição

- **Dado** o diálogo de perguntas incompletas aberto, com a pergunta 1 selecionada
- **Quando** o criador aciona "Voltar para edição"
- **Então** o diálogo fecha, a pergunta 1 continua selecionada e nada foi publicado

#### CA-07 — Verdadeiro ou falso sem correta

- **Dado** um quiz com título e uma pergunta Verdadeiro ou falso na posição 2, com enunciado e sem correta marcada
- **Quando** o criador aciona **Salvar**
- **Então** o diálogo lista "2 - Verdadeiro ou falso" com "Resposta correta não selecionada", e só esse motivo

#### CA-08 — Sem título

- **Dado** um rascunho sem título, com todas as perguntas completas
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo "Toques finais", com o título e a descrição vazios e **Continuar** indisponível
- **Quando** ele digita "Capitais do mundo" no título, "Para a aula de geografia" na descrição e aciona **Continuar**
- **Então** o quiz é salvo como jogável com esse título e essa descrição, e abre o diálogo "O quiz está pronto"

#### CA-09 — Cancelar os toques finais

- **Dado** o diálogo "Toques finais" aberto, com um título digitado
- **Quando** o criador aciona **Cancelar**
- **Então** volta ao editor, e o quiz continua rascunho e sem título

#### CA-10 — Limites nos toques finais

- **Dado** o diálogo "Toques finais" aberto
- **Quando** o criador digita "TESTE" no título
- **Então** a contagem do título mostra 90, e a da descrição, 500
- **Quando** ele cola um texto de 120 caracteres no título
- **Então** o campo fica com os primeiros 95, e a contagem mostra 0
- **E** um título só com espaços mantém **Continuar** indisponível
- **E** com a descrição vazia e um título válido, **Continuar** fica disponível

#### CA-11 — Sem título e com pergunta incompleta

- **Dado** um rascunho sem título, com uma pergunta incompleta
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo de perguntas incompletas, e não o do título
- **Quando** ele completa a pergunta e aciona **Salvar** de novo
- **Então** abre o diálogo "Toques finais"

#### CA-38 — Quantas respostas faltam

- **Dado** uma pergunta Quiz com enunciado, só a resposta 1 escrita e marcada como correta
- **Quando** o criador aciona **Salvar**
- **Então** o diálogo lista a pergunta com "1 resposta faltando", e só esse motivo
- **E** o alerta dela na lista de perguntas mostra o mesmo texto

#### CA-39 — Deixar sem salvar

- **Dado** o diálogo de perguntas incompletas aberto num rascunho
- **Quando** o criador aciona "Deixar sem salvar"
- **Então** chega à Biblioteca, e o quiz continua rascunho, com as perguntas como estavam
- **E** num quiz publicado com alterações não salvas, a mesma ação chega à Biblioteca sem abrir o diálogo de saída, a versão jogável continua a mesma e o quiz mostra o selo "Alterações não salvas"

#### CA-40 — Voltar para edição depois de pronto

- **Dado** o diálogo "O quiz está pronto" aberto depois de um Salvar
- **Quando** o criador aciona "Voltar para edição" ou aperta Esc
- **Então** continua no editor, com o selo "Publicado"

#### CA-41 — Opções "Em breve"

- **Dado** o diálogo "O quiz está pronto" aberto
- **Quando** o criador olha as opções
- **Então** vê "Iniciar demonstração", "Organizar ao vivo", "Palestra" e "Compartilhar", cada uma marcada "Em breve"
- **E** nenhuma delas pode ser acionada, nem pelo teclado

#### CA-12 — Salvar espera o salvamento automático

- **Dado** o criador acabou de digitar a última resposta que faltava, e o cabeçalho ainda mostra "Salvando…"
- **Quando** ele aciona **Salvar** imediatamente
- **Então** o quiz é salvo como jogável, e a versão inclui a resposta recém-digitada

#### CA-13 — Falha do salvamento automático impede o Salvar

- **Dado** uma alteração pendente e a conexão fora do ar
- **Quando** o criador aciona **Salvar**
- **Então** o cabeçalho mostra "Não foi possível salvar" com a opção de tentar de novo, o editor continua aberto e o quiz não é publicado

#### CA-14 — O servidor recusa quiz incompleto

- **Dado** um quiz do criador com uma pergunta incompleta, ou sem título
- **Quando** chega ao servidor um pedido para salvá-lo como jogável
- **Então** o servidor recusa, o quiz continua como estava e nenhuma versão é criada

#### CA-15 — Só o dono, e fora da lixeira

- **Dado** um quiz de outro criador, um id inexistente e um quiz do criador que está na lixeira
- **Quando** chega ao servidor um pedido para salvar cada um deles como jogável
- **Então** os dois primeiros respondem "não encontrado", sem distinção, e o terceiro é recusado por estar na lixeira

#### CA-16 — Um Salvar por vez

- **Dado** um quiz completo
- **Quando** o criador aciona **Salvar** duas vezes seguidas
- **Então** a ação fica indisponível durante o primeiro pedido, e só uma versão é criada

### Editar depois de publicar

#### CA-17 — Editar não muda a versão jogável

- **Dado** um quiz publicado (versão 1) cuja pergunta 1 é "Capital do Brasil?"
- **Quando** o criador muda o enunciado para "Capital da Argentina?" e sai com "Deixar sem salvar"
- **Então** a versão jogável continua com "Capital do Brasil?" e número 1
- **E** o editor, ao reabrir, mostra "Capital da Argentina?"

#### CA-18 — Selo no editor

- **Dado** um rascunho aberto no editor
- **Então** o cabeçalho mostra o selo "Rascunho"
- **Dado** um quiz publicado, sem alterações, aberto no editor
- **Então** o cabeçalho mostra "Publicado"
- **Quando** o criador muda o tempo de uma pergunta
- **Então** o selo passa a "Alterações não salvas"

#### CA-19 — Desfazer à mão zera as alterações

- **Dado** um quiz publicado com uma pergunta de 20 s
- **Quando** o criador muda o tempo para 30 s e depois de volta para 20 s
- **Então** o selo volta a "Publicado", e Sair não pergunta nada

#### CA-20 — Reordenar, adicionar e excluir contam como alteração

- **Dado** um quiz publicado com as perguntas A e B
- **Quando** o criador move B para antes de A
- **Então** o selo passa a "Alterações não salvas"
- **E** o mesmo acontece ao adicionar, duplicar ou excluir uma pergunta, e ao trocar o tipo de uma

#### CA-21 — Dados do quiz não contam como alteração

- **Dado** um quiz publicado, sem alterações
- **Quando** o criador muda o título no cabeçalho e a descrição em Configurações
- **Então** o selo continua "Publicado", e a biblioteca já mostra o novo título

#### CA-22 — Salvar de novo cria a versão 2

- **Dado** um quiz publicado (versão 1) com alterações não salvas e todas as perguntas completas
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo "O quiz está pronto", e a versão jogável passa a ser a 2, com as perguntas atuais
- **E** o selo "Alterações não salvas" some da página do quiz e da biblioteca

#### CA-23 — Salvar sem alterações

- **Dado** um quiz publicado (versão 1), sem alterações
- **Quando** o criador aciona **Salvar**
- **Então** abre o diálogo "O quiz está pronto", e a versão jogável continua sendo a 1

#### CA-24 — Publicado com pergunta incompleta

- **Dado** um quiz publicado (versão 1)
- **Quando** o criador adiciona uma pergunta em branco e sai com "Deixar sem salvar"
- **Então** a versão jogável continua a 1, sem a pergunta nova
- **Quando** ele volta ao editor e aciona **Salvar**
- **Então** abre o diálogo de perguntas incompletas, e a versão continua a 1

#### CA-25 — Publicado não fica sem título

- **Dado** um quiz publicado "Geografia"
- **Quando** o criador apaga o título no cabeçalho do editor e sai do campo
- **Então** vê "Um quiz publicado precisa de título", e o título volta a "Geografia"
- **E** o mesmo pedido, feito pelos dados do quiz ou direto ao servidor, é recusado
- **E** num rascunho, apagar o título continua permitido

### Sair e descartar

#### CA-26 — Sair sem alterações não pergunta

- **Dado** um rascunho com perguntas incompletas, e um quiz publicado sem alterações
- **Quando** o criador aciona **Sair** em cada um
- **Então** chega à Biblioteca, sem diálogo

#### CA-27 — Sair com alterações pergunta

- **Dado** um quiz publicado com alterações não salvas
- **Quando** o criador aciona **Sair**
- **Então** abre o diálogo "Algumas alterações não foram salvas", com o texto "Se você descartar as alterações, elas serão perdidas." e as ações "Descartar", "Deixar sem salvar" e "Voltar para edição"
- **E** o mesmo diálogo abre ao acionar a marca do Quizio

#### CA-28 — Deixar sem salvar ao sair

- **Dado** o diálogo do CA-27, aberto pelo **Sair**
- **Quando** o criador aciona "Deixar sem salvar"
- **Então** chega à Biblioteca, onde o quiz mostra o selo "Alterações não salvas"
- **E** ao reabrir o editor, as alterações estão lá
- **E** quando o diálogo foi aberto pela marca do Quizio, a mesma ação chega à página inicial

#### CA-29 — Descartar

- **Dado** um quiz publicado com as perguntas A e B, em que o criador mudou o enunciado de A, excluiu B e adicionou C
- **Quando** ele aciona **Sair** e "Descartar"
- **Então** chega à Biblioteca, e o quiz não tem o selo "Alterações não salvas"
- **E** ao reabrir o editor, as perguntas são A (com o enunciado original) e B, nessa ordem, e o selo é "Publicado"

#### CA-30 — Descartar não mexe nos dados do quiz

- **Dado** um quiz publicado em que o criador mudou o título para "Geografia 2" e o tempo de uma pergunta
- **Quando** ele descarta as alterações
- **Então** o tempo volta ao da versão jogável, e o título continua "Geografia 2"

#### CA-31 — Voltar para edição ao sair

- **Dado** o diálogo do CA-27
- **Quando** o criador aciona "Voltar para edição" ou aperta Esc
- **Então** o diálogo fecha, ele continua no editor e nada muda

#### CA-32 — Falha ao descartar

- **Dado** o diálogo do CA-27 e a conexão fora do ar
- **Quando** o criador aciona "Descartar"
- **Então** vê uma mensagem de erro, continua no editor e as alterações continuam lá

### Biblioteca e página do quiz

#### CA-33 — Rascunhos só com os nunca publicados

- **Dado** um rascunho "A", um quiz publicado "B" e um quiz publicado "C" com alterações não salvas
- **Quando** o criador abre Rascunhos
- **Então** vê só "A"
- **Quando** abre Recentes
- **Então** vê os três: "A" com o selo "Rascunho", "B" sem selo de status e "C" com o selo "Alterações não salvas"

#### CA-34 — Selos na página inicial e na página do quiz

- **Dado** os quizzes do CA-33
- **Quando** o criador olha "Seus quizzes" na página inicial e abre a página de cada um
- **Então** vê os mesmos selos
- **E** a página de "A" diz que ele ainda não foi salvo como jogável, e as de "B" e "C" dizem há quanto tempo a versão jogável foi salva

#### CA-35 — Duplicar um quiz publicado

- **Dado** um quiz publicado "Geografia" com alterações não salvas
- **Quando** o criador o duplica
- **Então** "Geografia (cópia)" é um rascunho, aparece em Rascunhos e tem as perguntas atuais do original, com as alterações
- **E** o original continua publicado, com a mesma versão

#### CA-36 — Lixeira preserva a versão

- **Dado** um quiz publicado com alterações não salvas
- **Quando** o criador o move para a lixeira e depois o restaura
- **Então** ele volta publicado, com a mesma versão jogável e o selo "Alterações não salvas"
- **E** se for excluído definitivamente, a versão jogável deixa de existir

#### CA-37 — Última modificação

- **Dado** um quiz que não é o mais recente da biblioteca
- **Quando** o criador o salva como jogável criando uma versão
- **Então** ele sobe para o topo de Recentes

## Experiência (telas e estados)

- **Cabeçalho do editor**: depois do título e de Configurações, o **selo de status** ("Rascunho", "Publicado" ou "Alterações não salvas") e o estado do salvamento automático, como hoje. À direita, **Sair** (secundário) e **Salvar** (botão em destaque). Durante o Salvar, o botão mostra que está trabalhando e não aceita outro clique. No celular, os dois botões continuam visíveis; o selo pode encolher para um ícone com o texto acessível.
- **Diálogo "Não é possível jogar este quiz"**, como o do Kahoot: o texto "Todas as perguntas precisam ser concluídas antes de começar a jogar." e, abaixo, uma área cinza rolável com um cartão branco por pergunta incompleta. Cada cartão tem, em cima, a miniatura da pergunta à esquerda, "2 - Quiz" ao lado e o botão azul **Corrigir** à direita; embaixo, uma linha por motivo, com o ícone roxo de alerta ("!") e o texto. No rodapé, centralizados, **Voltar para edição** (neutro) e **Deixar sem salvar** (verde). Com muitas perguntas, só a área dos cartões rola.
- **Diálogo "Toques finais"**, como o do Kahoot: o texto "Um título e uma descrição ajudam você a encontrar seu quiz depois."; o campo **Título**, com o apoio "Defina um título para o seu quiz." e a contagem de caracteres restantes dentro do campo, à direita; o campo **Descrição (Opcional)**, com o apoio "Descreva brevemente o conteúdo.", maior, com a contagem no canto superior direito. No rodapé, **Cancelar** (neutro) e **Continuar** (verde). O título já vem em foco, e Enter nele equivale a Continuar.
- **Diálogo "O quiz está pronto"**, como o do Kahoot: quatro linhas cinza-claras, cada uma com ícone, nome em negrito e uma frase — "Iniciar demonstração" ("Execute uma sessão de teste antes de apresentar ao vivo"), "Organizar ao vivo" ("Apresente em uma tela grande"), "Palestra" ("Apresentação de slides interativa") e "Compartilhar" ("Permita que outros organizadores usem este quiz") —, todas esmaecidas e com o selo "Em breve" (RN-15a). No rodapé, **Voltar para edição** (neutro) e **Pronto** (azul).
- **Diálogo "Algumas alterações não foram salvas"**, como o do Kahoot: o texto "Se você descartar as alterações, elas serão perdidas."; lado a lado, **Descartar** (vermelho) e **Deixar sem salvar** (verde); abaixo, centralizado, **Voltar para edição** como ação de texto.
- **Avisos passageiros**: mensagem de erro quando o servidor recusa ou a rede falha.
- **Página do quiz**: selo de status ao lado da visibilidade; linha "Ainda não foi salvo como jogável" ou "Versão jogável salva há 2 dias". A ação **Editar** continua em destaque.
- **Biblioteca e "Seus quizzes"**: o selo de status ao lado do selo de visibilidade de cada quiz.
- **Estados**: salvando (botão ocupado), recusado pelo servidor (diálogo correspondente ou erro), falha de rede (erro, editor continua aberto com tudo no lugar).

## Divergências intencionais do Kahoot

- **Opções de "O quiz está pronto" como "Em breve"** (RN-15a). No Kahoot, Iniciar demonstração, Organizar ao vivo, Palestra e Compartilhar funcionam; aqui aparecem indisponíveis até as features correspondentes chegarem.
- **O diálogo de saída só aparece em quiz publicado com alterações** (RN-23, RN-24). Num rascunho, Sair vai direto: não há versão jogável para a qual "Descartar" voltaria.
- **"Toques finais" sem a promessa de visibilidade**. O texto do Kahoot fala em aumentar a visibilidade do kahoot na busca pública, que o Quizio ainda não tem (spec 020).
- **Quiz publicado com alterações não aparece em Rascunhos** (RN-29). Fica só em Recentes, com o selo "Alterações não salvas".
- **Dados do quiz valem na hora** (RN-06): título, descrição, capa e visibilidade não esperam o Salvar. O comportamento do Kahoot nesse ponto não está documentado na referência.
- **Pergunta sem enunciado bloqueia o Salvar** (RN-09), como já decidido na spec 004 (RN-14); na referência esse motivo é inferido.
- **Sem histórico de versões** (RN-04): o Kahoot também não oferece, mas expõe o número da versão em relatórios; aqui ele fica guardado para a partida e os relatórios.

## Fora de escopo

- Jogar, testar e compartilhar o quiz (spec 008 em diante); o botão Jogar na página do quiz.
- Histórico de versões, comparar ou restaurar uma versão anterior.
- Descartar alterações fora do editor (pela página do quiz ou pela biblioteca).
- Voltar um quiz publicado para rascunho.
- Imagem nas perguntas e sua validação (spec 007); a versão passa a incluir as imagens quando elas existirem.
- Outros tipos de pergunta e seus motivos de incompleta (specs 014 a 016).
- Edição do mesmo quiz em duas abas ao mesmo tempo (spec 003, fora de escopo).
- Visibilidade pública e descoberta (spec 020).

## Perguntas em aberto

- [x] **Diálogos do Kahoot ao salvar** — resolvido em 2026-10-01 com as capturas de tela do usuário: "Não é possível jogar este kahoot", "Toques finais" e "O kahoot está pronto".
- [x] **Diálogo do Kahoot ao sair com alterações** — resolvido em 2026-10-01 com a captura "Algumas alterações não foram salvas" (RN-24).
- [x] **Destino do Sair** — resolvido em 2026-10-01: Sair leva à Biblioteca, como "Pronto" e "Deixar sem salvar" (RN-23).
- [ ] **Sair de um rascunho no Kahoot** — não confirmado se o Kahoot mostra o diálogo de saída também num kahoot nunca salvo, nem o que "Descartar" faz nesse caso. Adotado sair direto (RN-23).
- [ ] **Ordem das conferências** — adotado perguntas antes do título (RN-13). Não confirmado como o Kahoot ordena.
- [ ] **Título fora da versão** — a RN-06 deixa o título valer na hora. A spec 008 decide o que a partida copia no início (título e capa do momento).

## Changelog

- 2026-10-01 — spec criada. Decisões confirmadas com o usuário: depois de salvar vai para a página do quiz (RN-15); perguntas incompletas em diálogo com lista e Corrigir (RN-10); sair com alterações pergunta entre manter, descartar e continuar (RN-24); quiz publicado com alterações fica só em Recentes, com selo (RN-29, RN-30). Decisões tomadas sem consulta prévia: dados do quiz fora da versão (RN-06), publicado não fica sem título (RN-21), publicado não volta a rascunho (RN-03), alterações medidas por conteúdo (RN-19), Salvar sem alterações não cria versão (RN-16), ordem das conferências (RN-13), duplicar gera rascunho com as perguntas atuais (RN-32).
- 2026-10-01 — revisão com as capturas de tela do Kahoot enviadas pelo usuário. O Salvar com sucesso abre "O quiz está pronto", e **Pronto leva à Biblioteca** (RN-15, RN-15a, RN-16), no lugar de ir à página do quiz com o aviso "Quiz salvo". O diálogo de perguntas incompletas segue o do Kahoot: título, cartões, motivos "Pergunta ausente" / "N respostas faltando" / "Resposta correta não selecionada" e a ação "Deixar sem salvar" (RN-10, RN-10a, RN-11, RN-11a). O pedido de título virou "Toques finais", com título e descrição (RN-12). Acrescentados CA-38 a CA-40.
- 2026-10-01 — segunda revisão do usuário: as opções de "O quiz está pronto" aparecem como "Em breve" (RN-15a, CA-41); o diálogo de saída segue a captura do Kahoot, "Algumas alterações não foram salvas", com Descartar / Deixar sem salvar / Voltar para edição (RN-24 a RN-26, CA-27 a CA-32); Sair passa a levar à Biblioteca (RN-23, CA-26), o que altera a spec 003, RN-06. Jogar fica para outra entrega (outra PR). Spec aprovada pelo usuário, com pedido para planejar e implementar em seguida.
- 2026-10-01 — plano e tarefas escritos e aprovados junto com a spec (status `planned`).
- 2026-10-01 — implementada (tarefas T01 a T19). Os 41 CAs têm teste automatizado verde: domínio, casos de uso, PGlite, API, componentes e E2E em desktop e celular. Desvios do plano registrados em `tasks.md`.
- 2026-10-01 — renumeração do roadmap: a partida ao vivo virou quatro specs (008 a 011) e as features seguintes subiram três números (robustez 012, relatórios 013, mais tipos 014, opiniões 015, slides 016, atribuir 017, equipe 018, produtividade 019, extras 020). Só as referências mudaram.
- 2026-10-01 — a spec 008 ativou "Organizar ao vivo" no diálogo "O quiz está pronto" (altera a RN-15a e o CA-41): a opção deixa de estar marcada "Em breve" e abre o lobby de uma partida. As outras três continuam "Em breve".
