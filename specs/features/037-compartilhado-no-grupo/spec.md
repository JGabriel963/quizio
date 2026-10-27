---
id: "037"
title: Grupos 4/5 — Compartilhado
status: done # draft | approved | planned | in-progress | done
contexts: [groups, quiz, library, game]
created: 2026-10-26
---

# 037 — Grupos 4/5 — Compartilhado

## Contexto e problema

As specs 034 a 036 e 038 deram ao grupo membros, configurações, um mural com texto, imagem e PDF, e atribuições. Falta o motivo principal de um grupo no Kahoot, que é ter uma **coleção curada de kahoots** (kahoot-reference §11.3). Hoje três entradas estão "Em breve":

- a aba **Compartilhado**;
- o **Compart.** da caixa "Publicar algo";
- o **"Compartilhar kahoot"** de "Criar publicação".

Cada membro só usa os próprios quizzes. Um professor não tem como passar o quiz da aula para a colega do grupo usar com a turma dela. A chave **"Os membros podem compartilhar conteúdo"** está guardada desde a spec 035, sem efeito.

O usuário mandou as capturas do fluxo no Kahoot em 2026-10-26:

1. **O mural do administrador**: a caixa com Criar publicação, **Compart.** e Atribuir, e uma publicação **"{nome} compartilhou múltiplos kahoots"**, com "múltiplos kahoots" como link. Essa publicação não tem texto nem cartão, só curtidas e Curtir.
2. **"Selecionar kahoot"** aberto pelo Compart.:
   - cada linha tem **Selecionar**, que vira **"✓ Selecionado"**, e dá para marcar vários;
   - embaixo ficam **Fechar** e **"Compartilhar 2 kahoots"**.
3. **O mural logo depois**, com a publicação "compartilhou múltiplos kahoots".
4. **"{nome} compartilhou um kahoot"**, quando só um quiz é compartilhado:
   - o cartão tem a capa com "24 perguntas", o título, o dono e "há 1 segundo";
   - à direita ficam **Iniciar** e um **⋮**.
5. **A aba Compartilhado em cartões**:
   - o título **"Kahoots"** e **"Ordenar por: Mais recentes"**;
   - o botão **Compart.** e a troca entre cartões e lista;
   - cada cartão tem a capa com "N perguntas", o título, o dono e o ⋮.
6. **A mesma aba em lista**, com as colunas Título (com "N partidas"), Criado por, Visibilidade e Compartilhados ("há 21 segundos"), e o ⋮.
7. **"Ordenar por"**: Mais recentes, Mais antigos, Nome (a-z) e Nome (z-a).
8. **O mural de um membro**: a caixa só com Criar publicação e Compart., e as publicações do administrador sem o ⋮ do cabeçalho. O cartão do kahoot continua com Iniciar e ⋮.
9. **A aba vista pelo membro**, que também tem Compart.
10. **"Selecionar kahoot" do membro**, com os quizzes dele e "Compartilhar 1 kahoot".
11. **O mural com as duas publicações de um kahoot**, uma do membro e uma do administrador.
12. **A página do kahoot de outra pessoa**, aberta pelo grupo:
    - no topo, o dono com "Seguir", e **Editar**, Favorito, Compart. e Opções;
    - a capa, o título, a descrição, "34 jogos" e "34 participantes";
    - **"Perguntas (5)"** com **"Mostrar respostas"**;
    - na lateral, **"Organizar ao vivo"**, Palestra e **Atribuir**, e o estudo independente: Aprender, Flashcards e Jogar solo.
13. **Editar o kahoot de outra pessoa** abre **"Duplique para editar"**: "Não é possível editar esse kahoot, mas é possível duplicá-lo para realizar edições.", com **Cancelar** e **Duplicar**.
14. **Depois de Duplicar**, o editor abre com a cópia, "Salvo em: Meus rascunhos".

Observação do usuário: o módulo é simples e quase tudo segue o que a spec já previa.

Esta é a etapa 4 das 5 de Grupos, e a última que falta.

## Objetivo

Quem pode compartilhar põe um ou vários quizzes seus no grupo. Eles aparecem no mural e na aba Compartilhado, sempre na última versão salva pelo dono. Os membros abrem o quiz, veem as perguntas, jogam ao vivo, atribuem e duplicam para a própria biblioteca, sem poder mudar o original.

## Personas

- **Administrador (`GroupRole` `admin`)**: compartilha sempre. Remove do grupo qualquer quiz compartilhado e exclui qualquer publicação.
- **Membro (`GroupRole` `member`)**: compartilha só com "Os membros podem compartilhar conteúdo" ligada (spec 035). Usa os quizzes compartilhados e remove os que ele mesmo compartilhou.
- **Dono do quiz**: continua o único que edita o quiz. O que ele salva chega ao grupo.

## Histórias de usuário

- **HU-01**: Como membro que pode compartilhar, quero pôr de uma vez vários quizzes meus no grupo, para que os outros os usem.
- **HU-02**: Como membro, quero ver os quizzes do grupo num só lugar, ordenados como eu preferir, para achar o que usar na minha aula.
- **HU-03**: Como membro, quero abrir um quiz compartilhado e ver as perguntas, para decidir se ele me serve.
- **HU-04**: Como membro, quero jogar ao vivo ou atribuir um quiz compartilhado, para usá-lo sem precisar copiá-lo.
- **HU-05**: Como membro, quero duplicar um quiz compartilhado, para adaptá-lo do meu jeito.
- **HU-06**: Como quem compartilhou ou administrador, quero tirar um quiz do grupo, para manter a coleção em ordem.

## Regras de negócio

### Quem compartilha e o quê

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | **Compartilhar com o grupo (`shareQuizzesInGroup`)** é do **administrador** sempre, e dos **membros** só com **"Os membros podem compartilhar conteúdo"** ligada (spec 035, RN-07). Sem a chave, os membros não veem nenhuma das entradas de compartilhar (RN-03). O servidor recusa o pedido de quem não pode. | capturas 8 a 10 · spec 035 |
| RN-02 | Só se compartilham **quizzes da própria pessoa que podem ser jogados**: publicados e fora da lixeira (spec 029, RN-03). Rascunhos nunca salvos não aparecem. **Pastas não entram nesta spec**: o Quizio ainda não tem pastas (roadmap 021). | capturas 2 e 10 · spec 038, RN-04 · decisão do usuário (2026-10-26) |
| RN-03 | Compartilhar começa em três lugares: o **Compart.** da caixa "Publicar algo" e o **Compart.** da aba Compartilhado (RN-05), e o **Compartilhar kahoot** da faixa de "Criar publicação" (RN-08). Todos deixam de ser "Em breve". | capturas 1, 5 e 9 · spec 036, RN-04 |
| RN-04 | Um quiz é compartilhado **no máximo uma vez por grupo**. Em "Selecionar kahoot", um quiz que já está no grupo aparece com **"Já compartilhado"** e não pode ser escolhido. A privacidade do quiz (Privado ou Não listado, spec 001, RN-14) **não impede** compartilhar, porque o grupo é um lugar fechado. | captura 6 (um quiz Privado na aba) · decisão do produto (2026-10-26) |

### Compart.: vários de uma vez

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-05 | O **Compart.** abre **"Selecionar kahoot"** com a pesquisa e a lista da spec 038 (RN-04 e RN-05). Cada linha tem **Selecionar**, que vira **"✓ Selecionado"** e volta ao ser acionado de novo. Embaixo ficam **Fechar** e **"Compartilhar N kahoots"** ("Compartilhar 1 kahoot" com um só), indisponível sem nenhum selecionado. A seleção continua ao pesquisar. | capturas 2 e 10 |
| RN-06 | **"Compartilhar N kahoots"** põe os quizzes no grupo e fecha o diálogo, **sem texto**. Cria **uma publicação** (RN-09): com um quiz, "compartilhou um kahoot" com o cartão dele; com vários, **"compartilhou múltiplos kahoots"**. Os quizzes aparecem no início da aba. Se algum quiz deixou de poder ser compartilhado enquanto o diálogo estava aberto (foi para a lixeira, outra pessoa o compartilhou, a permissão mudou), **nada é compartilhado** e o diálogo continua aberto com o motivo. | capturas 1 a 4 · decisão do produto (2026-10-26) |
| RN-07 | **Fechar** fecha o diálogo sem compartilhar nada. | captura 2 |

### Compartilhar kahoot na publicação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-08 | **Compartilhar kahoot**, na faixa de "Criar publicação", abre o mesmo "Selecionar kahoot" para **um quiz só**: escolher um quiz volta a "Criar publicação" com o **cartão do kahoot** e o X, **sem passar pelas configurações**. Fechar volta à publicação sem anexo, mantendo o texto, e o X tira o quiz. O kahoot é **o anexo** (spec 036, RN-07); o texto vai de 0 a 500 caracteres, e o quiz basta. **Publicar** compartilha o quiz e cria a publicação "compartilhou um kahoot" com o texto; a recusa deixa o diálogo aberto com o motivo. | spec 036, capturas 5 e 7, observação do usuário, RN-06 e RN-13 |

### No mural

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | **"{nome} compartilhou um kahoot"** mostra a data, o ⋮ do cabeçalho, o texto quando há, e o **cartão do kahoot**: capa com "N perguntas", título, nome do dono, "há {tempo}" desde que foi compartilhado, **Iniciar** e o ⋮ do cartão (RN-11). **"{nome} compartilhou múltiplos kahoots"** não tem cartão; **"múltiplos kahoots"** é um link que abre a aba Compartilhado. Embaixo, "N curtidas" e Curtir (spec 038, RN-17 a RN-19). | capturas 1, 4, 8 e 11 |
| RN-10 | **Iniciar** abre a **página do quiz compartilhado** (RN-16); para o dono, a página de sempre do quiz (spec 001). | captura 12 · decisão do produto (2026-10-26) |
| RN-11 | O **⋮ do cartão** do kahoot (no mural e na aba) mostra a todos os membros **Duplicar** (RN-21). Quem compartilhou e o administrador também veem **"Remover do grupo"** (RN-13), em vermelho. | capturas 4, 5 e 8 · decisão do produto (2026-10-26) |
| RN-12 | O **⋮ do cabeçalho** da publicação é de **quem publicou e do administrador**, com **"Excluir publicação"** (spec 036, RN-19 e RN-20). Excluir a publicação **não tira os quizzes** do grupo: eles continuam na aba. | captura 8 · spec 036 |
| RN-13 | **"Remover do grupo" (`unshareQuiz`)** pede confirmação: **"Remover do grupo?"**, "Os membros deixam de ver e de usar {título}.", **Cancelar** / **Remover**. O quiz sai da aba. Uma publicação "compartilhou um kahoot" desse quiz **perde o anexo**, como uma atribuição que acabou: "{nome} compartilhou um arquivo", o texto, e o quadro tracejado "{nome} excluiu o anexo da publicação" (spec 038, RN-16). "Compartilhou múltiplos kahoots" não muda. | spec 038, RN-16 · decisão do usuário (2026-10-26) |

### A aba Compartilhado

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | A aba **Compartilhado** mostra o título **"Kahoots"** com os **quizzes compartilhados (`SharedQuiz`)** do grupo. No topo ficam o **Compart.** (RN-05, para quem pode), a troca entre **cartões** e **lista** e **"Ordenar por"**: **Mais recentes** (padrão), **Mais antigos**, **Nome (a-z)** e **Nome (z-a)**. Os dois primeiros seguem o momento em que o quiz foi compartilhado; os nomes ignoram maiúsculas, minúsculas e acentos. A forma escolhida fica guardada no aparelho, e a ordem fica no endereço, como na aba Atribuições (spec 038). | capturas 5 a 7 |
| RN-15 | **Cartão**: o rótulo "Quiz", a capa com "N perguntas", o título, o nome do dono e o ⋮ (RN-11). **Lista**: a capa com "N perguntas", o título com **"N partidas"**, **Criado por** (ícone e nome do dono), **Visibilidade**, **Compartilhados** ("há {tempo}") e o ⋮. "N partidas" conta as partidas e atribuições já começadas com o quiz, de qualquer anfitrião. Acionar o cartão ou a linha abre a página do quiz (RN-10). Mostra **20** e, quando há mais, **"Mostrar mais"**. Vazia, diz "Ainda não há kahoots compartilhados neste grupo." e oferece Compart. a quem pode. | capturas 5 e 6 · spec 038, RN-24 · decisão do produto (2026-10-26) |

### A página do quiz compartilhado

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | Um membro abre a **página do quiz compartilhado** dentro do grupo. O topo mostra o dono, **Editar** e, ao lado, Duplicar. Depois vêm a capa, o título, a descrição, **"N jogos"** e **"N participantes"** (de todas as partidas e atribuições começadas com o quiz, de qualquer anfitrião) e **"Perguntas (N)"**. Cada pergunta mostra o número, o tipo, o tempo, o texto e a imagem. As respostas ficam escondidas até **"Mostrar respostas"**, que as mostra com as certas marcadas. Na lateral (embaixo, no celular) ficam **"Organizar ao vivo"** e **Atribuir**. | captura 12 · decisão do usuário (2026-10-26) |
| RN-17 | O quiz compartilhado **acompanha o original**: a página, o jogo e a cópia usam sempre a **última versão salva** (publicada, spec 006) pelo dono. Alterações não salvas do dono nunca aparecem para o grupo. | decisão do usuário (2026-10-26) · spec 006 |
| RN-18 | **Editar** abre **"Duplique para editar"**: "Não é possível editar esse quiz, mas é possível duplicá-lo para realizar edições.", **Cancelar** / **Duplicar**. Duplicar faz o mesmo que RN-21. Nenhuma ação muda o original. | capturas 13 e 14 · kahoot-reference §11.2 |
| RN-19 | **Organizar ao vivo** abre uma **partida ao vivo do membro**, com ele como anfitrião, exatamente como as do próprio quiz (specs 008 a 014), com as opções guardadas dele. A partida e o relatório são **do membro**, nos Relatórios dele. A partida de um membro **não encerra** a do dono nem a de outro membro com o mesmo quiz: só a partida aberta do **mesmo anfitrião** com esse quiz é trocada (spec 008). | captura 12 · decisão do usuário (2026-10-26) |
| RN-20 | **Atribuir** abre o atribuir de sempre (spec 029), com "Atribuir a grupos" (spec 038). A atribuição e o relatório são **do membro**. | captura 12 · spec 029 · spec 038 |
| RN-21 | **Duplicar** cria na biblioteca do membro um **rascunho dele**, independente, a partir da última versão salva, e o abre no editor. A cópia leva título "‹título› (cópia)" (spec 001, RN-20), descrição, capa, visibilidade e perguntas, com cópias próprias da capa e das imagens. Ela **não fica ligada** ao grupo nem ao original. | captura 14 · spec 001, RN-20 |

### Quando o quiz some do grupo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | O quiz **sai do grupo** quando: é removido (RN-13); o dono o **exclui para sempre**; o dono **sai ou é removido** do grupo. A publicação "compartilhou um kahoot" perde o anexo (RN-13). | decisão do produto (2026-10-26) · spec 038, RN-31 |
| RN-23 | Enquanto o dono deixa o quiz **na lixeira**, ele **some** da aba, e a publicação mostra o quadro tracejado. **Restaurado**, volta aos dois, no mesmo lugar. | decisão do usuário (2026-10-26, "acompanha o original") |
| RN-24 | O que o membro já fez com o quiz **continua dele** quando o quiz sai do grupo: a cópia, os relatórios e as atribuições abertas. Uma partida aberta continua até acabar, se o quiz só saiu do grupo, e acaba se o dono o excluiu para sempre (spec 015). "Jogar novamente" nos relatórios do membro só funciona enquanto o quiz está no grupo. | spec 015 · decisão do produto (2026-10-26) |
| RN-25 | A página de um quiz que não está mais no grupo diz "Este quiz não está mais disponível no grupo." e leva de volta à aba Compartilhado. Quem não é do grupo não vê nada, como se o grupo não existisse (spec 034, RN-02). | spec 034, RN-02 |

## Critérios de aceite

### Compartilhar

#### CA-01 — Quem vê as entradas de compartilhar

- **Dado** Ana (administradora) e Bruno (membro), com "Os membros podem compartilhar conteúdo" ligada
- **Então** os dois veem Compart. na caixa e na aba Compartilhado, e "Compartilhar kahoot" na faixa de "Criar publicação", sem "Em breve"
- **E** com a chave desligada, Bruno não vê nenhum dos três, e o servidor recusa um compartilhamento pedido por ele

#### CA-02 — Vários de uma vez

- **Dado** Ana em "Selecionar kahoot", aberto pelo Compart.
- **Quando** seleciona "Rios" e "Capitais"
- **Então** as duas linhas mostram "✓ Selecionado" e o botão diz "Compartilhar 2 kahoots"
- **E** ao acionar o botão, o diálogo fecha, o topo do mural mostra "Ana compartilhou múltiplos kahoots" sem cartão, e a aba mostra "Capitais" e "Rios" no início
- **E** "múltiplos kahoots" abre a aba Compartilhado

#### CA-03 — Um só pelo Compart.

- **Dado** Bruno com "Compartilhar 1 kahoot" depois de selecionar "Mapas"
- **Quando** aciona o botão
- **Então** o mural mostra "Bruno compartilhou um kahoot" com o cartão de "Mapas": capa com "N perguntas", título, dono, "há instantes", Iniciar e ⋮
- **E** sem nenhum selecionado, o botão fica indisponível; Fechar fecha sem compartilhar

#### CA-04 — Pela publicação

- **Dado** Bruno com "Criar publicação" aberto e "Para a revisão" escrito
- **Quando** aciona "Compartilhar kahoot" e escolhe "Capitais"
- **Então** volta a "Criar publicação" com o texto e o cartão de "Capitais", sem passar por "Configurações da atividade atribuída"
- **E** ao publicar, o mural mostra "Bruno compartilhou um kahoot", o texto e o cartão

#### CA-05 — O que pode ser compartilhado

- **Dado** que Ana tem "Capitais" (salvo e Privado), "Rascunho X" (nunca salvo), "Velho" (na lixeira) e "Rios" (já no grupo)
- **Quando** abre "Selecionar kahoot" para compartilhar
- **Então** vê "Capitais" e "Rios", com "Rios" marcado "Já compartilhado" e indisponível, e não vê os outros dois
- **E** o servidor recusa compartilhar o mesmo quiz duas vezes no grupo ou um quiz de outra pessoa, e numa recusa não compartilha nenhum dos selecionados

### Aba Compartilhado

#### CA-06 — Cartões, lista e ordem

- **Dado** um grupo com "Bíblia" (compartilhado há 3 dias), "Álgebra" (há 2 dias) e "Capitais" (agora)
- **Quando** Carla (membro) abre Compartilhado
- **Então** vê "Kahoots" em cartões, na ordem Capitais, Álgebra, Bíblia, cada um com capa, "N perguntas", título e dono
- **E** em "Nome (a-z)" vê Álgebra, Bíblia, Capitais, e a ordem continua ao recarregar a página
- **E** na lista vê as colunas Título com "N partidas", Criado por, Visibilidade e Compartilhados, e a lista continua escolhida ao voltar à aba

#### CA-07 — Muitos e nenhum

- **Dado** um grupo com 23 quizzes compartilhados
- **Então** a aba mostra 20 e "Mostrar mais", que traz os 3 restantes
- **E** num grupo sem quizzes, Ana vê "Ainda não há kahoots compartilhados neste grupo." com Compart., e Bruno, sem a chave, vê o texto sem o botão

### Página do quiz

#### CA-08 — Ver as perguntas

- **Dado** "Capitais", de Ana, compartilhado no grupo, com 3 perguntas e jogado 2 vezes por 10 participantes
- **Quando** Carla aciona Iniciar no mural, ou o cartão na aba
- **Então** vê o dono, Editar, Duplicar, a capa, o título, a descrição, "2 jogos", "10 participantes", "Perguntas (3)" e as perguntas com tipo, tempo, texto e imagem, sem as respostas
- **E** "Mostrar respostas" mostra as respostas com as certas marcadas
- **E** vê Organizar ao vivo e Atribuir
- **E** Ana, pelo mesmo Iniciar, vai para a página de sempre de "Capitais"

#### CA-09 — Acompanha o original

- **Dado** "Capitais" compartilhado
- **Quando** Ana muda uma pergunta no editor sem salvar
- **Então** Carla ainda vê a pergunta antiga
- **E** depois que Ana salva, Carla vê a nova, e uma partida ou cópia feita depois a usa

#### CA-10 — Editar pede para duplicar

- **Dado** Carla na página de "Capitais"
- **Quando** aciona Editar
- **Então** vê "Duplique para editar" com Cancelar e Duplicar
- **E** Cancelar fecha sem nada mudar; Duplicar faz o que CA-13 descreve

#### CA-11 — Organizar ao vivo

- **Dado** Carla na página de "Capitais", e Ana com uma partida aberta de "Capitais"
- **Quando** Carla aciona Organizar ao vivo
- **Então** abre a partida de Carla, com o PIN e o lobby, e a partida de Ana continua aberta
- **E** quando acaba, o relatório aparece nos Relatórios de Carla, não nos de Ana, e "Capitais" passa a "3 jogos"

#### CA-12 — Atribuir

- **Dado** Carla na página de "Capitais"
- **Quando** aciona Atribuir e cria a atribuição
- **Então** a atribuição e o relatório aparecem nos Relatórios de Carla, e o compartilhar da atribuição oferece "Atribuir a grupos"

#### CA-13 — Duplicar

- **Dado** Carla na página de "Capitais", ou no ⋮ do cartão
- **Quando** aciona Duplicar
- **Então** a biblioteca de Carla ganha o rascunho "Capitais (cópia)" com as mesmas perguntas, capa e imagens, e o editor o abre
- **E** mudar ou excluir a cópia não muda "Capitais", e Ana editar "Capitais" não muda a cópia

### Remover e sumir

#### CA-14 — Remover do grupo

- **Dado** "Capitais", compartilhado por Bruno numa publicação "compartilhou um kahoot"
- **Então** Bruno e Ana veem "Remover do grupo" no ⋮ do cartão, no mural e na aba; Carla vê só Duplicar
- **Quando** Bruno confirma "Remover do grupo?"
- **Então** "Capitais" sai da aba, e a publicação mostra "Bruno compartilhou um arquivo" e "Bruno excluiu o anexo da publicação"
- **E** o servidor recusa a remoção pedida por Carla

#### CA-15 — Excluir a publicação não tira os quizzes

- **Dado** "Ana compartilhou múltiplos kahoots", com "Rios" e "Capitais"
- **Quando** Ana confirma "Excluir a publicação?"
- **Então** a publicação some do mural, e "Rios" e "Capitais" continuam na aba

#### CA-16 — O dono move para a lixeira, restaura e exclui

- **Dado** "Capitais", de Ana, compartilhado
- **Quando** Ana o move para a lixeira
- **Então** ele some da aba e a publicação mostra o quadro tracejado
- **E** restaurado, volta à aba e à publicação, no mesmo lugar
- **E** excluído para sempre, sai do grupo e não volta

#### CA-17 — O dono sai do grupo

- **Dado** que Bruno compartilhou "Mapas" e saiu do grupo
- **Então** "Mapas" sai da aba, a publicação de Bruno continua sem o anexo, e Ana pode excluí-la
- **E** a cópia que Carla fez de "Mapas" continua na biblioteca dela

#### CA-18 — Fora do grupo

- **Dado** o endereço da página de "Capitais" no grupo
- **Quando** Diego, que não é do grupo, o abre
- **Então** vê o grupo como inexistente (spec 034)
- **Quando** Carla o abre depois que "Capitais" foi removido
- **Então** vê "Este quiz não está mais disponível no grupo." com o caminho para a aba
- **E** o servidor recusa jogar, atribuir ou duplicar um quiz que não está no grupo da pessoa

## Experiência (telas e estados)

- **Caixa "Publicar algo"**: o Compart. aparece ao lado de Criar publicação para quem pode compartilhar.
- **"Selecionar kahoot" para compartilhar**: a lista da spec 038.
  - Cada linha tem Selecionar ou "✓ Selecionado" (cinza); "Já compartilhado" aparece indisponível.
  - Embaixo, Fechar e "Compartilhar N kahoots", ocupado enquanto compartilha.
  - Aberto pela faixa da publicação, escolhe um quiz só e volta à publicação.
- **Publicação**:
  - o cabeçalho diz "compartilhou um kahoot" ou "compartilhou múltiplos kahoots" (com o link);
  - o cartão do kahoot, no estilo do da atribuição: capa com "N perguntas", título, dono, "há {tempo}", Iniciar e ⋮.
- **Aba Compartilhado**:
  - "Kahoots" à esquerda e "Ordenar por" à direita;
  - acima, Compart. e a troca entre cartões e lista;
  - grade de cartões (uma coluna no celular) ou tabela (no celular, só a capa, o título e o ⋮);
  - "Mostrar mais" no fim; esqueletos enquanto carrega; Tentar novamente se der erro.
- **Página do quiz compartilhado**, dentro do grupo, com o caminho de volta para a aba:
  - topo com o dono, Editar e Duplicar;
  - capa e dados à esquerda, e "Organizar ao vivo" e "Atribuir" à direita (embaixo, no celular);
  - "Perguntas (N)" com "Mostrar respostas", em cartões que lembram a tela da pergunta (o texto, a imagem e as respostas nas cores das formas).
- **"Duplique para editar"**: diálogo pequeno com Cancelar e Duplicar.

## Divergências intencionais do Kahoot

- **Sem pastas** (RN-02): o Kahoot compartilha pastas com o grupo; aqui elas esperam a linha 021.
- **Sem Palestra, Aprender, Flashcards, Jogar solo, Favorito, Seguir, Compart. e Opções** na página (RN-16): o Quizio não tem esses modos nem favoritos ainda. Editar não abre o editor somente para leitura: vai direto ao "Duplique para editar".
- **"Já compartilhado"** (RN-04): não foi visto o que o Kahoot faz com um quiz que já está no grupo.
- **"Remover do grupo"** (RN-13): o Kahoot não deixa "descompartilhar" um kahoot compartilhado com usuários (kahoot-reference §11.1). O que o ⋮ do grupo oferece não foi visto. Aqui quem compartilhou e o administrador mantêm a coleção em ordem.
- **O quiz sai do grupo com o dono** (RN-22): não confirmado no Kahoot. Aqui o quiz é de quem o fez, e quem sai leva o que é seu.
- **"‹título› (cópia)"** (RN-21): o Kahoot usa "Cópia de ‹título›". O Quizio mantém o padrão que já tem desde a spec 001.
- **"Não salvo"** nos cartões da aba (capturas 5 e 6): o selo some no Kahoot depois; aqui a aba nunca o mostra, porque o grupo só vê a versão salva.

## Fora de escopo

- **Pastas** e o compartilhamento de pastas: linha 021.
- **"Compartilhados comigo"** na biblioteca e o compartilhamento com usuários por e-mail: linha 019.
- **Coedição**: editar o quiz de outra pessoa.
- **Compartilhar fora do grupo**, pela página do quiz, em vários grupos de uma vez, como o "Atribuir a grupos" da spec 038.
- **Pesquisa** na aba Compartilhado.
- **Ranking do grupo**.
- **Notificações** de quizzes compartilhados.

## Perguntas em aberto

Nenhuma.

## Changelog

- 2026-10-26: spec criada. Decisões do usuário:
  - só quizzes, e as pastas ficam para a linha 021;
  - o membro vê as perguntas, joga ao vivo, atribui e duplica;
  - o quiz compartilhado acompanha a última versão salva pelo dono e some com ele;
  - compartilhar sempre cria a publicação no mural.
- 2026-10-26: refeita com as capturas do Kahoot enviadas pelo usuário. Mudanças:
  - o Compart. escolhe vários quizzes e compartilha direto, com "compartilhou múltiplos kahoots";
  - o cartão do kahoot tem Iniciar e ⋮;
  - a aba ganhou cartões e lista, "Ordenar por" e "N partidas", e perdeu a pesquisa;
  - a página do quiz segue a do Kahoot ("Organizar ao vivo", "N jogos", "Duplique para editar");
  - excluir a publicação não tira mais os quizzes do grupo.
- 2026-10-26: spec aprovada pelo usuário.
- 2026-10-26: spec entregue (status `done`). Escolhas feitas na implementação, dentro das regras:
  - a página do quiz tem "Ocultar respostas" depois de "Mostrar respostas";
  - o Duplicar da página e do ⋮ abre a cópia no editor;
  - o texto de "Excluir a publicação?" de um compartilhamento diz que os kahoots continuam em Compartilhado;
  - na lista, o celular mostra só a capa, o título e o ⋮.
