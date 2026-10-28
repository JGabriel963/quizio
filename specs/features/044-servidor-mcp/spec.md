---
id: "044"
title: Servidor MCP para agentes de IA
status: in-progress # draft | approved | planned | in-progress | done
contexts: [identity, quiz, library, game, reports, groups, notifications, themes, media]
created: 2026-10-28
---

# 044 — Servidor MCP para agentes de IA

## Contexto e problema

O assistente "Crie" (spec 027) usa a IA **do Quizio**, com uma cota diária, e só dentro do editor: cria perguntas Quiz e Verdadeiro ou falso e para aí. Hoje muita gente já trabalha com **o próprio agente de IA** (ChatGPT, Claude, Codex, Cursor e outros) e quer pedir a ele, em linguagem natural, coisas como "monte um quiz de 15 perguntas sobre a Revolução Francesa a partir deste PDF, publique e atribua à turma do 8º ano até sexta", "quais alunos precisaram de ajuda no último relatório?" ou "compartilhe meus quizzes de biologia com o grupo de ciências". Para isso o agente precisa agir **na conta da pessoa**, com as mesmas regras das telas.

O **Model Context Protocol (MCP)** é o padrão aberto que esses agentes usam para se ligar a serviços externos: o serviço publica um **servidor MCP (`McpServer`)** com **ferramentas (`McpTool`)** e o agente as chama em nome da pessoa, depois de ela autorizar. Com um servidor MCP no Quizio, cada pessoa usa o agente que preferir, sem o Quizio depender de nenhum deles.

O Kahoot não oferece isso ao criador. É um recurso próprio do Quizio, alinhado à constituição (artigo VI): nada de plano pago para usar a IA, nem a do Quizio nem a da pessoa.

## Objetivo

A pessoa conecta o agente de IA de sua preferência à conta do Quizio em poucos passos e, conversando com ele, faz tudo o que faria nas telas (criar e publicar quizzes, organizar partidas e atribuições, ler relatórios, gerenciar grupos e notificações), menos excluir a conta e trocar a senha. Ela vê e desconecta os agentes a qualquer momento.

## Personas

- **Criador** — quem tem conta no Quizio e conecta um ou mais agentes à própria conta.
- **Agente de IA (`AiAgent`)** — o aplicativo de IA da pessoa, cliente do servidor MCP: ChatGPT, Claude (claude.ai, Claude Desktop e Claude Code), Codex, Cursor, VS Code com Copilot, Gemini CLI ou outro compatível.
- **Membro do grupo** e **jogador** — não usam o agente, mas veem o que o criador fez por meio dele (publicações, notificações, partidas).

## Histórias de usuário

- **HU-01** — Como criador, quero conectar o meu agente de IA à minha conta com um login e um clique em Permitir, para não precisar copiar senhas nem configurar nada técnico.
- **HU-02** — Como criador que usa um agente ou script que só aceita uma chave fixa, quero gerar uma chave de acesso, para conectá-lo do mesmo jeito.
- **HU-03** — Como criador, quero pedir ao agente que crie, edite e publique quizzes completos, com qualquer tipo de pergunta, imagens e tema, para montar conteúdo muito mais rápido.
- **HU-04** — Como criador, quero pedir ao agente que abra uma partida ao vivo ou crie uma atribuição, para começar uma aula sem navegar por várias telas.
- **HU-05** — Como criador, quero que o agente leia e resuma os meus relatórios, para saber quem precisa de ajuda e quais perguntas foram difíceis.
- **HU-06** — Como administrador de grupos, quero que o agente gerencie grupos, membros, publicações, quizzes compartilhados e atribuições, para cuidar das turmas conversando.
- **HU-07** — Como criador, quero ver quais agentes estão conectados, quando cada um foi usado pela última vez, e desconectar qualquer um, para manter o controle da minha conta.
- **HU-08** — Como criador, quero que o agente me peça confirmação antes de algo irreversível, para não perder conteúdo por engano.

## Regras de negócio

### Conectar um agente

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O Quizio tem um **servidor MCP** num endereço fixo da instância, **`{endereço do Quizio}/mcp`**, aberto a qualquer agente compatível com MCP por HTTP. Os **agentes de referência**, que o Quizio testa e para os quais mostra instruções, são: **ChatGPT**, **Claude** (claude.ai, Claude Desktop e Claude Code), **Codex**, **Cursor**, **VS Code** (Copilot) e **Gemini CLI**. | decisão do usuário (2026-10-28) |
| RN-02 | O agente se conecta de duas formas: por **autorização** (RN-03), o padrão do MCP, ou por **chave de acesso** (RN-05). As duas dão o mesmo acesso (RN-07). | decisão do usuário (2026-10-28) |
| RN-03 | **Autorização (`AgentConnection`)**: ao adicionar o Quizio, o agente abre no navegador a tela **"Conectar ao Quizio"**. Sem sessão, a pessoa passa antes pelo login de sempre (e-mail e senha ou Google, spec 001) e volta a essa tela. A tela mostra **"{agente} quer acessar sua conta do Quizio"**, a conta (foto, nome e e-mail) com **"Usar outra conta"**, o que o agente poderá e não poderá fazer (RN-07 e RN-08), o endereço para onde ele vai voltar (**"Depois, você volta para {domínio}"**) e os botões **Permitir** e **Cancelar**. | padrão de autorização do MCP · decisão do produto (2026-10-28) |
| RN-04 | **Permitir** cria a conexão e devolve a pessoa ao agente, já conectado. **Cancelar** devolve ao agente sem acesso. Um pedido de conexão inválido (agente desconhecido, endereço de volta diferente do registrado) mostra "Este pedido de conexão não é válido." com **Ir para o início**, e nada é criado. O nome do agente é o que ele informou ao se registrar; sem nome, o domínio do endereço de volta. | decisão do produto (2026-10-28) |
| RN-05 | **Chave de acesso (`AccessKey`)**: em Agentes de IA (RN-12), **Criar chave** pede um **nome** de 1 a 50 caracteres e mostra a chave **uma única vez**, com **Copiar** e o aviso "Copie agora: esta chave não será mostrada de novo.". A chave vale até ser revogada. Cada pessoa tem até **20 chaves ativas** (limite técnico, configurável); com 20, Criar chave fica indisponível e diz "Você chegou ao limite de 20 chaves. Revogue uma para criar outra.". | decisão do usuário (2026-10-28) · constituição, artigo VI |
| RN-06 | Só quem tem conta conecta um agente. O servidor MCP **não cria contas** e recusa todo pedido sem uma autorização ou uma chave válida, com a indicação de como se conectar. Um cadastro fechado na instância (`AUTH_SIGN_UP_ENABLED`, spec 001) continua fechado também na tela de autorização. | spec 001 (cadastro aberto) · decisão do produto (2026-10-28) |

### O que o agente pode fazer

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | O agente tem **acesso total** à conta, num **nível único**: tudo o que a pessoa faz nas telas descritas em RN-19 a RN-31, menos o que RN-08 deixa de fora. | decisão do usuário (2026-10-28) |
| RN-08 | **Ficam só nas telas**: excluir a conta, trocar a senha, a foto do perfil (o recorte é feito na tela, spec 039), criar ou desconectar conexões e chaves, entrar em partidas ou atribuições **como jogador** e **conduzir** a partida ao vivo (iniciar e avançar as fases, RN-26). O servidor não oferece essas ações. | decisão do usuário (2026-10-28) |
| RN-09 | O agente **age como a pessoa**: tudo o que ele faz obedece às mesmas regras das telas (dono, permissões do grupo, limites de tamanho e quantidade, prazos, cotas) e aparece para os outros como feito por ela (publicações, notificações, relatórios, partidas). Os outros membros e os jogadores **não sabem** se algo foi feito pela tela ou pelo agente. O agente nunca vê nem altera o que a pessoa não veria nem alteraria; o que é de outra pessoa é tão inexistente para ele quanto para ela. | decisão do produto (2026-10-28) · specs 001, 034 a 038 |
| RN-10 | O agente **descobre sozinho** o que pode fazer: cada ação tem nome e descrição com as regras e os limites que valem para ela (tipos de pergunta, tamanhos, tempos, prazos). Nomes, descrições e mensagens de erro técnicas ficam em **inglês**, como o código; o conteúdo (títulos, perguntas, publicações) fica no idioma que a pessoa pedir. | constituição, artigo IX · decisão do produto (2026-10-28) |
| RN-11 | Toda **recusa** diz o motivo e o que corrigir, com o código estável do erro de domínio (`QUIZ.IN_TRASH`, `GROUP.ASSIGN_NOT_ALLOWED`…), para o agente explicar à pessoa ou tentar de outro jeito. Toda resposta sobre algo que tem tela no Quizio traz o **endereço dessa tela** (o editor, a página do quiz, a tela do anfitrião, o relatório, o grupo), para a pessoa abrir. | decisão do produto (2026-10-28) |

### Agentes de IA nas Configurações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-12 | As Configurações (spec 039, RN-03) ganham a seção **"Agentes de IA"**, entre Acesso à IA e Senha: Seu perfil, Acesso à IA, **Agentes de IA**, Senha e Exclusão de conta. Como as outras, fica no endereço e é só da própria pessoa (spec 039, RN-04). | decisão do produto (2026-10-28) |
| RN-13 | A seção tem, de cima para baixo: (1) a explicação **"Conecte o ChatGPT, o Claude, o Codex ou outro agente de IA à sua conta para criar quizzes, organizar grupos e acompanhar relatórios conversando com ele."** e o **endereço do servidor** com **Copiar**; (2) **"Como conectar"**, com uma aba por agente de referência (RN-01) e **"Outro agente"**, cada uma com o passo a passo ou o comando daquele agente já com o endereço preenchido, e **Copiar** nos comandos; (3) **"Agentes conectados"** (RN-14); (4) **"Chaves de acesso"** (RN-15). | decisão do produto (2026-10-28) |
| RN-14 | **Agentes conectados** tem uma linha por autorização: o nome do agente, **"Conectado em {data}"**, **"Último uso {há quanto tempo}"** (ou "Ainda não usado") e **Desconectar**, que pede confirmação ("Desconectar {agente}? Ele perde o acesso à sua conta na hora."). Sem nenhuma: "Nenhum agente conectado.". | decisão do usuário (2026-10-28) |
| RN-15 | **Chaves de acesso** tem **Criar chave** (RN-05) e uma linha por chave: o nome, o **começo** da chave (o resto nunca volta a aparecer), "Criada em {data}", o último uso e **Revogar**, que pede confirmação. Sem nenhuma: "Nenhuma chave criada.". | decisão do usuário (2026-10-28) |
| RN-16 | **Desconectar** e **Revogar** valem **na hora**: o pedido seguinte do agente é recusado, e ele precisa ser conectado de novo. | decisão do produto (2026-10-28) |
| RN-17 | **Alterar a senha** (spec 039, RN-22), que já encerra as outras sessões, também **desconecta todos os agentes e revoga todas as chaves**; a seção Senha avisa "Alterar a senha também desconecta seus agentes de IA.". **Encerrar sessão** no navegador não desconecta agentes. **Excluir a conta** apaga as conexões e as chaves com ela (spec 039). | spec 039, RN-22 · decisão do produto (2026-10-28) |
| RN-18 | Uma autorização que fica **90 dias sem uso** deixa de valer e sai da lista; a pessoa conecta o agente de novo. O prazo é um limite técnico, configurável. As chaves não expiram. | constituição, artigo VI · decisão do produto (2026-10-28) |

### Quizzes, perguntas e temas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-19 | **Conta e biblioteca**: o agente lê a conta (nome, e-mail, cota do assistente da spec 027), muda o **nome** (regras de cadastro, 2 a 50 caracteres), lê o perfil de outro criador e um quiz público (spec 039), e lista a biblioteca por seção (**Recentes**, **Rascunhos**, **Lixeira**) com pesquisa (spec 001). | specs 001 e 039 |
| RN-20 | **Quiz**: o agente cria um quiz (título, descrição, visibilidade, capa, tema e, se quiser, as perguntas, tudo num único pedido); lê um quiz inteiro (dados, perguntas com as respostas e as corretas, estado de publicação e o que falta para publicar); muda os dados, a visibilidade e o tema; duplica um quiz próprio, compartilhado com ele num grupo ou público (specs 037 e 039); move para a lixeira, restaura e exclui definitivamente. Os limites são os das telas: título até 95 caracteres, descrição até 500, até 200 perguntas. | specs 001, 003, 006, 037, 039, 042 |
| RN-21 | **Perguntas**: o agente adiciona perguntas em qualquer posição, de qualquer **tipo entregue** (Quiz, Verdadeiro ou falso, Resposta curta, Controle deslizante e Puzzle, specs 004, 005, 031, 032 e 033), uma ou várias num pedido (até completar 200); muda qualquer campo (enunciado, respostas, corretas, seleção simples ou múltipla, tempo, pontos, tipo), duplica, move, exclui (nunca a última, spec 003) e aplica o tempo a todas. Cada tipo segue as próprias regras (respostas, tempos por tipo, escala do controle deslizante, ordem do Puzzle). Uma pergunta incompleta é aceita e guardada como no editor (spec 004), e a resposta diz o que falta. | specs 003 a 005, 031 a 033 |
| RN-22 | **Marca de IA**: toda pergunta que o agente **adiciona** (também as que vêm com a criação do quiz) leva a marca **feita com IA (`aiGenerated`)** da spec 027, com o ícone de brilho na lista do editor. Editar, mover ou trocar o tipo de uma pergunta que já existia não muda a marca; duplicar copia a marca da original (spec 027, RN-29). Os quizzes não levam marca. O agente **não gasta** a cota de criações do assistente (spec 027), porque usa o próprio modelo; o assistente "Crie" continua só no editor. | decisão do usuário (2026-10-28) · spec 027, RN-29 |
| RN-23 | **Publicar**: o agente salva a versão jogável (spec 006), com título e descrição quando faltam, e descarta as alterações não salvas. Com perguntas incompletas, a recusa lista **cada uma** pela posição, com os motivos (os mesmos do Salvar do editor). | spec 006 |
| RN-24 | **Imagens e arquivos** (capa do quiz, imagem da pergunta com posição, recorte e texto alternativo, logotipo e fundo de tema personalizado, anexo de publicação no grupo) entram de duas formas: um **link público** do arquivo, que o Quizio baixa, ou um **envio direto**, em que o agente recebe um endereço para mandar o arquivo (para agentes que rodam no computador da pessoa e têm o arquivo lá). Vale a política de mídia de cada lugar (imagens JPEG, PNG, GIF e WebP até 10 MB; PDF do grupo até 20 MB, spec 036). Um link que não seja um endereço público da internet, que não responda ou que traga outro tipo de arquivo é recusado com o motivo. | specs 001, 007, 036, 043 · decisão do produto (2026-10-28) |
| RN-25 | **Temas**: o agente lista os temas prontos (spec 042) e os personalizados da pessoa, escolhe o tema de um quiz, e cria, edita e exclui temas personalizados (spec 043: nome, padrão de fundo e cor ou imagem, cor de contraste com o contraste mínimo de 4,5:1, logotipo). | specs 042 e 043 |

### Partidas, atribuições e relatórios

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-26 | **Partida ao vivo**: o agente **organiza ao vivo** um quiz publicado (próprio, compartilhado ou público, specs 008, 037 e 039) e recebe o **PIN**, o **link de entrada** dos jogadores e o **link da tela do anfitrião**, que a pessoa abre para projetar; lê o lobby (jogadores, bloqueio, opções) e o estado da partida; muda as **opções de jogo** (spec 012, com a reprodução automática da 014 e os personagens da 028); trava e destrava a entrada; remove um jogador no lobby; e encerra a partida. Quem **conduz** as perguntas continua sendo a tela do anfitrião (spec 009): o agente não inicia nem avança as fases. A resposta lembra que os jogadores veem "O anfitrião se desconectou" enquanto a tela do anfitrião não estiver aberta (spec 013). | decisão do usuário (2026-10-28) · specs 008, 009, 012 a 014, 028 |
| RN-27 | **Atribuições**: o agente cria uma atribuição de um quiz publicado (próprio, compartilhado ou público) com o **prazo** (data, hora e fuso, depois de agora e até 28 dias à frente, spec 029) e as opções (personagens, timer da pergunta, ordem aleatória de respostas) e recebe o **link** e o **PIN** de 8 dígitos; muda o prazo de uma aberta; **encerra agora**; e atribui uma atribuição aberta a grupos (spec 038). | specs 029, 030, 038 |
| RN-28 | **Relatórios**: o agente lista os relatórios com pesquisa e a lixeira (spec 015; as atribuições abertas primeiro, spec 029), lê o resumo, os participantes, as perguntas e o detalhe de cada participante e de cada pergunta, renomeia, move para a lixeira (nunca uma atribuição aberta), restaura e exclui definitivamente. O administrador lê, só para leitura, o relatório de uma atribuição publicada no seu grupo por outra pessoa (spec 038). | specs 015, 029, 030, 038 |

### Grupos e notificações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-29 | **Grupos**: o agente faz o que as specs 034 a 038 dão à pessoa, conforme o papel dela e as permissões do grupo: listar os grupos que gerencia e em que participa; criar; ler um grupo; mudar o nome, a descrição e as quatro permissões; ler e redefinir o link de convite; **aceitar** um convite a partir do link; listar e remover membros; sair; excluir; ler o mural (de 20 em 20) e uma publicação; publicar texto com até um anexo (imagem, PDF, atribuição ou quiz compartilhado); curtir e descurtir; excluir uma publicação; compartilhar até 50 quizzes, remover um quiz do grupo e listar os compartilhados; atribuir no grupo e listar as atribuições abertas. | specs 034 a 038, 040 |
| RN-30 | **Notificações**: o agente lista as notificações (Novo e Anteriores, spec 040) e marca uma ou todas como lidas. | spec 040 |
| RN-31 | **Ler pelo agente não muda o que as telas mostram como visto**: abrir um grupo não entra em "Grupos recentes" (spec 034) e listar as notificações não tira o ponto vermelho do sino (spec 040, RN-10). Só marcar como lida, pedido de forma explícita, muda o painel. | decisão do produto (2026-10-28) |

### Segurança e convivência com as telas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-32 | As ações **irreversíveis** vão marcadas como **destrutivas**, para o agente pedir confirmação à pessoa antes: excluir definitivamente um quiz ou um relatório, excluir uma pergunta, um grupo, um tema personalizado ou uma publicação, remover um membro ou um jogador, sair de um grupo, redefinir o link de convite, encerrar uma partida ou uma atribuição, remover um quiz do grupo e descartar as alterações não salvas. As que só leem vão marcadas como **leitura**. Mover para a lixeira é reversível e não é destrutivo. | decisão do usuário (2026-10-28) |
| RN-33 | Cada pessoa tem um **limite de 120 pedidos por minuto**, somando todos os agentes e chaves (limite técnico, configurável). Passado o limite, o pedido é recusado com quantos segundos esperar, e nada é feito. Os limites que as telas já têm continuam valendo do mesmo jeito. | constituição, artigo VI · decisão do produto (2026-10-28) |
| RN-34 | O que o agente muda vale **na hora** no servidor. As telas que já se atualizam sozinhas (sino, lobby e tela do anfitrião, relatório de atribuição aberta, specs 008, 030 e 040) mostram a mudança em poucos segundos; as outras, ao serem abertas de novo. Com o **editor** aberto no mesmo quiz, cada alteração vale por cima da anterior **campo a campo**, e o editor mostra as do agente quando é reaberto. | specs 003, 008, 030, 040 · decisão do produto (2026-10-28) |
| RN-35 | Nenhuma resposta do servidor leva segredos: nem a chave de acesso depois de criada, nem o segredo de um jogador, nem o e-mail de um membro para quem não é administrador (spec 034). | specs 008, 034 · decisão do produto (2026-10-28) |

## Critérios de aceite

### CA-01 — Conectar por autorização, já com sessão

- **Dado** Ana com sessão no Quizio e o agente "Claude Code" pedindo para se conectar
- **Quando** a tela "Conectar ao Quizio" abre
- **Então** ela vê "Claude Code quer acessar sua conta do Quizio", a própria foto, nome e e-mail, a lista do que o agente poderá fazer, "O agente não poderá excluir sua conta nem trocar sua senha.", o domínio para onde vai voltar, Permitir e Cancelar
- **Quando** Ana aciona Permitir
- **Então** volta ao agente, que lista os quizzes de Ana com sucesso
- **E** "Claude Code" aparece em Agentes conectados com "Conectado em {hoje}"

### CA-02 — Conectar sem sessão

- **Dado** Bruno sem sessão e um agente pedindo para se conectar
- **Quando** a tela de autorização abre
- **Então** Bruno passa pelo login (e-mail e senha ou Google) e volta à tela "Conectar ao Quizio", sem perder o pedido

### CA-03 — Usar outra conta e cancelar

- **Dado** a tela de autorização com a conta de Ana
- **Quando** ela aciona "Usar outra conta"
- **Então** a sessão é encerrada, o login abre e, depois de entrar com outra conta, a tela volta com essa conta
- **Quando** a pessoa aciona Cancelar
- **Então** volta ao agente sem acesso e nada aparece em Agentes conectados

### CA-04 — Pedido de conexão inválido

- **Dado** um pedido de conexão com um endereço de volta diferente do que o agente registrou
- **Quando** a tela de autorização abre
- **Então** mostra "Este pedido de conexão não é válido." com Ir para o início, sem Permitir, e nenhuma conexão é criada

### CA-05 — Chave de acesso

- **Dado** Ana em Configurações › Agentes de IA, sem chaves
- **Quando** ela cria a chave "Script da escola"
- **Então** vê a chave inteira uma vez, com Copiar e "Copie agora: esta chave não será mostrada de novo."
- **E** ao fechar, a linha mostra "Script da escola", só o começo da chave, "Criada em {hoje}" e "Ainda não usado"
- **Quando** um agente usa a chave para listar a biblioteca
- **Então** recebe os quizzes de Ana, e a linha passa a mostrar "Último uso agora"

### CA-06 — Nome e limite das chaves

- **Quando** Ana tenta criar uma chave com o nome vazio ou com 51 caracteres
- **Então** a chave não é criada e o campo explica o limite de 1 a 50 caracteres
- **Dado** Ana com 20 chaves ativas
- **Então** Criar chave fica indisponível com "Você chegou ao limite de 20 chaves. Revogue uma para criar outra."
- **Quando** ela revoga uma
- **Então** Criar chave volta a ficar disponível

### CA-07 — Desconectar e revogar valem na hora

- **Dado** um agente conectado por autorização e outro por chave
- **Quando** Ana desconecta o primeiro e revoga a chave do segundo, confirmando
- **Então** o pedido seguinte de cada um é recusado como sem conexão
- **E** as duas linhas somem da seção

### CA-08 — Alterar a senha desconecta tudo

- **Dado** Ana com dois agentes conectados e uma chave
- **Então** a seção Senha avisa "Alterar a senha também desconecta seus agentes de IA."
- **Quando** ela altera a senha
- **Então** os três passam a ser recusados, e Agentes conectados e Chaves de acesso ficam vazios
- **E** encerrar a sessão no navegador, em outro momento, não desconecta um agente conectado depois

### CA-09 — Sem conexão

- **Quando** um agente chama o servidor sem autorização, com uma chave inexistente ou com uma conexão expirada
- **Então** o pedido é recusado com a indicação de como se conectar, e nada é lido nem alterado

### CA-10 — Autorização sem uso por 90 dias

- **Dado** uma autorização usada pela última vez há 91 dias e uma chave sem uso há 91 dias
- **Então** a autorização é recusada e sai de Agentes conectados, e a chave continua funcionando

### CA-11 — Criar, completar e publicar um quiz

- **Dado** um agente conectado à conta de Ana
- **Quando** ele cria o quiz "Revolução Francesa" com 10 perguntas, entre elas uma Quiz de múltipla escolha, uma Verdadeiro ou falso, uma Resposta curta, um Controle deslizante e um Puzzle, e depois o publica
- **Então** o quiz aparece na biblioteca de Ana como Publicado, com as 10 perguntas na ordem pedida e cada tipo com as respostas e corretas enviadas
- **E** o editor mostra o ícone de brilho nas 10 perguntas
- **E** a cota de criações em Acesso à IA não muda
- **E** a resposta do agente traz o endereço do editor e da página do quiz

### CA-12 — Publicar com perguntas incompletas

- **Dado** um quiz em que a pergunta 2 não tem enunciado e a 5 não tem resposta correta
- **Quando** o agente pede para publicar
- **Então** a recusa lista a pergunta 2 (sem enunciado) e a 5 (sem resposta correta), e o quiz continua sem versão jogável nova

### CA-13 — Mesmos limites das telas

- **Quando** o agente envia uma pergunta com 161 caracteres, uma alternativa com 76, um título com 96 ou a 201ª pergunta
- **Então** cada pedido é recusado com o motivo e o limite, e nada é alterado
- **Quando** o agente adiciona uma Quiz com só uma alternativa preenchida
- **Então** ela é guardada, aparece como incompleta no editor, e a resposta diz o que falta

### CA-14 — Editar sem mexer na marca

- **Dado** uma pergunta que Ana digitou no editor, sem a marca de IA
- **Quando** o agente muda o enunciado e o tempo dela
- **Então** as mudanças aparecem no editor e a pergunta continua sem o ícone de brilho
- **Quando** o agente duplica uma pergunta que tem a marca
- **Então** a cópia também tem

### CA-15 — O que é de outra pessoa não existe

- **Dado** um quiz privado de Bruno e um grupo de que Ana não participa
- **Quando** o agente de Ana tenta ler, alterar ou excluir o quiz, ou abrir o grupo
- **Então** recebe a mesma resposta de algo que não existe

### CA-16 — Imagem por link e por envio direto

- **Quando** o agente põe como capa um link público de um PNG de 2 MB
- **Então** a capa aparece na biblioteca e na página do quiz
- **Quando** ele põe na pergunta 3 uma imagem por envio direto, como fundo e com o texto alternativo "Mapa da França"
- **Então** o editor mostra a imagem como fundo com o texto alternativo
- **Quando** ele usa um link para um endereço da rede interna, um link que não responde, um PDF como imagem ou uma imagem de 11 MB
- **Então** cada pedido é recusado com o motivo, e nada muda

### CA-17 — Temas

- **Quando** o agente cria o tema personalizado "Escola" com o padrão Ondas em azul-escuro, uma cor de contraste legível e um logotipo, e o escolhe para o quiz
- **Então** o tema aparece em "Seus temas" no editor, e o quiz o usa
- **Quando** ele tenta uma cor de contraste que deixa o texto abaixo de 4,5:1
- **Então** a recusa explica o contraste mínimo

### CA-18 — Partida ao vivo

- **Dado** um quiz publicado de Ana
- **Quando** o agente organiza ao vivo
- **Então** recebe o PIN de 6 dígitos, o link de entrada e o link da tela do anfitrião, e a resposta lembra de abrir a tela do anfitrião
- **Quando** dois jogadores entram e o agente liga a reprodução automática, trava a entrada e remove um deles
- **Então** a tela do anfitrião aberta mostra a chave ligada, a entrada travada e só um jogador, em poucos segundos
- **E** o servidor não oferece ao agente iniciar nem avançar a partida
- **Quando** o agente encerra a partida
- **Então** os jogadores voltam à entrada do PIN, como no "Encerrar" da tela

### CA-19 — Quiz não publicado não vai ao vivo

- **Dado** um quiz que nunca foi publicado
- **Quando** o agente pede para organizar ao vivo ou atribuir
- **Então** a recusa diz que o quiz precisa ser publicado primeiro

### CA-20 — Atribuição

- **Quando** o agente atribui um quiz publicado com prazo daqui a 28 dias, sem o timer da pergunta
- **Então** recebe o link e o PIN de 8 dígitos, e a atribuição aparece aberta em Relatórios, no topo
- **Quando** ele tenta um prazo daqui a 29 dias ou no passado
- **Então** a recusa explica a regra do prazo
- **Quando** ele muda o prazo para amanhã e depois encerra agora
- **Então** o relatório mostra o novo prazo e, em seguida, a atribuição encerrada

### CA-21 — Relatórios

- **Dado** um relatório de uma partida de Ana com 12 participantes
- **Quando** o agente lê o resumo, os participantes e a pergunta mais difícil
- **Então** recebe o percentual geral, os totais, as perguntas difíceis, quem precisa de ajuda e quem não concluiu, com os mesmos números da tela
- **Quando** ele renomeia o relatório e o move para a lixeira
- **Então** a tela de Relatórios mostra o novo nome na Lixeira
- **Quando** ele tenta mover para a lixeira uma atribuição aberta
- **Então** a recusa diz que uma atribuição aberta não vai para a lixeira

### CA-22 — Grupos e a notificação dos membros

- **Dado** Ana administradora do grupo "8º ano" com Bruno e Carla
- **Quando** o agente de Ana publica no mural "Prova na sexta!" com uma imagem por link
- **Então** Bruno e Carla veem a publicação como de Ana e recebem a notificação "Ana compartilhou uma nova postagem com o grupo 8º ano."
- **Quando** o agente desliga "Os membros podem ver quem está no grupo"
- **Então** Bruno passa a ver só o total de membros

### CA-23 — Permissões do grupo valem para o agente

- **Dado** Bruno membro de um grupo com "Os membros podem criar atividades" desligada
- **Quando** o agente de Bruno tenta atribuir um quiz no grupo
- **Então** a recusa diz que só o administrador pode atribuir nesse grupo, e nada é criado
- **E** a lista de membros que o agente de Bruno recebe não traz os e-mails

### CA-24 — Aceitar um convite

- **Dado** o link de convite do grupo "8º ano"
- **Quando** o agente de Davi o aceita
- **Então** Davi passa a ser membro, e Ana recebe "Davi entrou no grupo 8º ano."

### CA-25 — Notificações sem mexer no visto

- **Dado** Ana com três notificações não lidas e o ponto vermelho no sino
- **Quando** o agente lista as notificações e abre um grupo
- **Então** recebe as três em Novo, o ponto vermelho continua no sino e o grupo não entra em Grupos recentes
- **Quando** o agente marca todas como lidas
- **Então** o painel do sino mostra as três em Anteriores

### CA-26 — Ações destrutivas e de leitura marcadas

- **Quando** um agente lista as ações do servidor
- **Então** as de RN-32 vêm marcadas como destrutivas, as que só leem como leitura, e mover para a lixeira não é destrutiva

### CA-27 — O que fica só nas telas

- **Quando** um agente lista as ações do servidor
- **Então** não há como excluir a conta, trocar a senha, mudar a foto, criar ou desconectar conexões e chaves, entrar numa partida como jogador, nem iniciar ou avançar uma partida

### CA-28 — Limite de pedidos

- **Dado** Ana com dois agentes conectados
- **Quando** os dois somam 121 pedidos no mesmo minuto
- **Então** o 121º é recusado com quantos segundos esperar, e nada é feito por ele

### CA-29 — Editor aberto ao mesmo tempo

- **Dado** Ana com o editor aberto no quiz e editando o enunciado da pergunta 1
- **Quando** o agente muda o tempo da pergunta 1 e adiciona uma pergunta no fim
- **Então** o enunciado de Ana, o tempo do agente e a pergunta nova estão guardados
- **E** ao reabrir o editor, Ana vê os três

### CA-30 — A seção Agentes de IA

- **Dado** Ana sem agentes e sem chaves
- **Quando** abre Configurações › Agentes de IA
- **Então** vê a explicação, o endereço do servidor com Copiar, "Como conectar" com as abas ChatGPT, Claude, Codex, Cursor, VS Code, Gemini CLI e Outro agente, todas com o endereço preenchido, "Nenhum agente conectado." e "Nenhuma chave criada."
- **E** a coluna de seções mostra Seu perfil, Acesso à IA, Agentes de IA, Senha e Exclusão de conta, nesta ordem

### CA-31 — Agentes de referência

- **Dado** a instância publicada
- **Quando** se conecta cada agente de referência (ChatGPT, claude.ai, Claude Desktop, Claude Code, Codex, Cursor, VS Code e Gemini CLI) seguindo as instruções da seção
- **Então** cada um conclui a conexão e lista os quizzes da conta (verificação manual registrada no changelog da spec, além do teste automatizado com um cliente MCP de referência, por autorização e por chave)

### CA-32 — Celular

- **Dado** uma tela estreita
- **Quando** a pessoa abre a tela de autorização ou a seção Agentes de IA
- **Então** tudo cabe na largura, sem rolagem lateral, e os comandos longos quebram ou rolam dentro do próprio quadro

## Experiência (telas e estados)

- **Tela "Conectar ao Quizio"** (fora da barra lateral, como o login): o logotipo do Quizio; o título "{agente} quer acessar sua conta do Quizio"; o cartão da conta com foto, nome, e-mail e "Usar outra conta"; **"O agente poderá:"** com cinco linhas com ícone ("Criar, editar, publicar e excluir seus quizzes e temas", "Organizar partidas ao vivo e atribuições", "Ler, renomear e excluir seus relatórios", "Gerenciar seus grupos, membros e publicações", "Ler suas notificações"); "O agente não poderá excluir sua conta nem trocar sua senha."; "Depois, você volta para {domínio}."; **Permitir** (primário) e **Cancelar**. Estados: carregando (esqueleto), pedido inválido (RN-04), cadastro fechado no login (spec 001).
- **Configurações › Agentes de IA**: cartões brancos sobre o fundo cinza, como as outras seções. Cartão do endereço; cartão "Como conectar" com as abas e os quadros de comando em fonte monoespaçada com Copiar ("Copiado" por um instante); cartão "Agentes conectados"; cartão "Chaves de acesso" com Criar chave. O diálogo **"Criar chave"** pede o nome e, depois, mostra a chave num quadro com Copiar e o aviso, com **Concluído**. Confirmações de Desconectar e Revogar em diálogo de alerta. Estados: carregando (esqueletos), vazio (RN-14, RN-15), falha ao carregar ("Não foi possível carregar seus agentes." com **Tentar de novo**), falha ao desconectar ou revogar (aviso, e a linha continua).
- **No agente**: a pessoa vê o Quizio na lista de ferramentas do agente; as respostas trazem os endereços das telas (RN-11), as recusas trazem o motivo, e o agente pede confirmação antes das ações destrutivas (RN-32), conforme a forma de cada agente mostrar isso.

## Divergências intencionais do Kahoot

- **O recurso inteiro**: o Kahoot não oferece ao criador uma forma de ligar o próprio agente de IA à conta. O Quizio oferece, sem plano pago (constituição, artigo VI).
- **Marca de IA nas perguntas do agente**: como as do assistente (spec 027), mesmo sem passar pelo assistente.

## Fora de escopo

- Excluir a conta, trocar a senha e a foto do perfil pelo agente (RN-08).
- O agente **conduzir** a partida ao vivo (iniciar, avançar, pular o cronômetro, revisar respostas) e **jogar** como participante.
- O assistente "Crie" pelo agente (o agente escreve as perguntas com o próprio modelo).
- Escolher, na conexão, um acesso **só de leitura** ou por área; o acesso é um nível único (RN-07).
- Ver o **histórico** do que cada agente fez; a seção mostra só o último uso.
- Avisos em tempo real para o agente (o agente pergunta; o servidor não o chama).
- Limite de pedidos por agente em vez de por pessoa.
- Tipos de pergunta ainda não entregues (Coletar opiniões, slides etc.): entram no servidor junto com as specs deles.

## Perguntas em aberto

- [x] A entrega pode ser feita em duas etapas sem mudar a spec: primeiro a conexão (autorização, chaves, Agentes de IA) com quizzes, perguntas, temas e biblioteca (RN-01 a RN-25); depois partidas, atribuições, relatórios, grupos e notificações (RN-26 a RN-31). — **Decidido no plano**: duas etapas, cada uma um PR usável sozinho.
- [ ] O limite de 120 pedidos por minuto e os 90 dias sem uso são um ponto de partida; podem mudar depois do teste com os agentes de referência, por configuração.

## Changelog

- 2026-10-28 — spec criada a partir do pedido do usuário de um servidor MCP para agentes de IA. Decisões do usuário na criação: conexão por autorização e por chave de acesso, acesso total menos excluir a conta e trocar a senha, partida ao vivo só até o lobby (a tela do anfitrião conduz), marca de IA nas perguntas do agente.
- 2026-10-28 — spec aprovada pelo usuário (status `approved`). No plano, excluir uma pergunta e remover um jogador entraram na lista de ações destrutivas (RN-32): também não têm volta.
- 2026-10-28 — etapa 1 entregue (conexão por autorização e por chave, a seção Agentes de IA e as ferramentas de quizzes, perguntas, arquivos, temas, biblioteca e conta). Escolhas da implementação: o Better Auth 1.7.14 é o servidor de autorização, com o documento de metadados do cliente (CIMD) como forma principal e o registro dinâmico como alternativa; o pedido assinado atravessa o login e a tela "Conectar ao Quizio" embrulhado inteiro em um só parâmetro, para não ser reescrito pelo roteador; o token do agente é um JWT de 1 hora que só vale enquanto a autorização existir, conferido a cada pedido; arquivos por link são baixados pelo servidor com proteção contra rede privada e passam pelo mesmo envio das telas; a coluna `account.issuer`, que o Better Auth novo não usa, ficou como opcional para a versão publicada continuar funcionando durante o deploy. A verificação manual de cada agente de referência (CA-31) fica para depois do deploy; o E2E cobre a conexão por autorização e por chave com o cliente MCP de referência.
- 2026-10-28 — verificação manual (CA-31), pelo usuário, com a instância local exposta por um túnel ngrok: ChatGPT e Claude se conectaram pela autorização ("Conectar ao Quizio" e Permitir) e cada um criou um quiz na conta. Os demais agentes de referência ficam para depois do deploy.
- 2026-10-28 — etapa 2 implementada (RN-26 a RN-31): partida ao vivo até o lobby, atribuições, relatórios, grupos, mural e notificações; 60 ferramentas ao todo. Escolhas da implementação: toda mudança de opção da partida publica um aviso no canal da partida, e a tela do anfitrião aberta pede a partida de novo (menos enquanto o próprio interruptor dela está a caminho); o prazo de uma atribuição vem sempre com o fuso; ler as notificações não apaga a bolinha vermelha da pessoa, e ler um grupo não conta como visita. Falta a verificação manual de cada agente de referência na instância publicada (CA-31).
- 2026-10-28 — o passo a passo do ChatGPT em "Como conectar" foi refeito pelo caminho que o usuário seguiu no plano gratuito: Plugins › Adicionar › Adicionar servidor MCP personalizado, URL do servidor com OAuth, "Entendo e quero continuar" e Conectar, sem o Modo de desenvolvedor. A coluna de seções das Configurações passou a ficar fixa ao rolar.
- 2026-10-28 — atalhos para Agentes de IA, a pedido do usuário: um item com ícone no menu da conta, entre Ver perfil e Configurações, e um cartão no rodapé da barra lateral (também no menu do celular), os dois levando à seção.
- 2026-10-28 — mais dois atalhos, a pedido do usuário: um cartão "Seu agente de IA no Quizio" no Início e uma linha em Acesso à IA, sempre visíveis. O cartão da barra lateral passou a ser só um aviso: some quando a pessoa já tem um agente conectado, seja uma autorização, seja uma chave que algum agente já usou.
