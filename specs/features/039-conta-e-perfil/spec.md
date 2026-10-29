---
id: "039"
title: Conta e perfil do criador
status: done # draft | approved | planned | in-progress | done
contexts: [identity, quiz, library, media, groups, game, reports]
created: 2026-10-27
---

# 039 — Conta e perfil do criador

## Contexto e problema

Desde a spec 001 a conta do criador é só um botão com o nome na barra superior, que abre "Minha conta" com o e-mail e "Sair". O criador não tem foto, não troca o nome, não troca a senha, não sabe quanto já usou do assistente de criação e não tem como apagar a conta. Os grupos (specs 034 a 038) passaram a mostrar o "ícone do usuário" em todo lugar, sempre o mesmo, e deixaram **"Ver perfil"** como "Em breve", porque não existe perfil.

O usuário mandou em 2026-10-27 as capturas da conta no Kahoot:

1. o **menu da conta**, aberto pela foto na barra superior: a foto grande, o nome de usuário, o e-mail, "Torne-se verificado", **Ver perfil**, "Adicionar perfil infantil", "Passes de aluno", **Configurações**, "Cobrança", "Faça upgrade", "Conteúdos" e **Encerrar sessão**;
2. **Configurações › Seu perfil**: a coluna de seções (**Seu perfil**, Privacidade e notificações, **Acesso à IA**, **Senha e autenticação multifatorial**, **Exclusão de conta**); o cartão com **"Adicionar foto"**, **Nome de usuário**, **Nome** e **E-mail**, cada um com **Alterar**, e **Ver perfil**; ao lado, Idioma, Tipo de conta, Tipo de local de trabalho e Início da semana, e "Solicite um perfil verificado!";
3. o diálogo **"Carregar imagem"**: "Carregue a imagem ou arraste o arquivo até aqui", **Carregar imagem**, o aviso de que a foto é pública, **Cancelar** / **Carregar**;
4. o mesmo diálogo com a imagem escolhida: o **recorte redondo** e o **controle de zoom**;
5. o envio: a barra "Carregando imagem… Cancelar" e o botão "Carregando";
6. **Seu perfil** com a foto: a foto no cartão, na barra superior e no aviso de perfil verificado; **Alterar** do Nome em azul quando o nome mudou;
7. o **perfil público**: a foto, o nome de usuário, **Opções de perfil ⋮**, os números **Kahoots**, **Jogos**, **Participantes** e **Seguidores**, e os cartões dos kahoots públicos;
8. **Privacidade e notificações**: chaves de e-mail, "Idade do aluno", "Cookies" e "Privacidade";
9. e 10. o **sino** de notificações (fica para a spec 040);
11. **Senha e autenticação multifatorial**: **Alterar senha** (Senha atual, Nova senha, Repita a nova senha, com o olho) e "Ativar a autenticação multifator";
12. a 14. **Exclusão de conta**: "Excluir conta" e o aviso; o formulário com a foto, o nome, **Motivo para excluir a conta** (a lista de motivos), o **feedback opcional**, a **Observação** e **Cancelar** / **Excluir conta**;
15. uma publicação de grupo, mostrando o ícone de quem publicou.

### O que entra e o que sai

A análise das capturas contra o que o Quizio tem hoje, confirmada com o usuário em 2026-10-27:

| Captura | Entra | Sai (e por quê) |
| --- | --- | --- |
| Menu da conta | Foto, nome, e-mail, Ver perfil, Configurações, Encerrar sessão | Verificado, perfil infantil, passes de aluno, cobrança, upgrade (planos e paywall, constituição VI) e Conteúdos |
| Seu perfil | Foto com recorte e zoom, Nome com Alterar, E-mail só leitura, Ver perfil | Nome de usuário (o Quizio tem só o Nome); alterar o e-mail (não há envio de e-mail para confirmar, ADR 0007); Idioma, Tipo de conta, Local de trabalho e Início da semana (nada no Quizio depende deles); perfil verificado |
| Perfil público | Foto, nome, Opções de perfil, Quizzes, Jogos, Participantes e os cartões dos quizzes **públicos**, com a nova visibilidade **Público** | Seguidores e Seguir; Descobrir (sai também da barra lateral) |
| Privacidade e notificações | — | As chaves são de e-mails, que o Quizio não envia; idade do aluno e cookies não se aplicam. O sino é a spec 040 |
| Acesso à IA | O uso da cota do assistente de criação (spec 027), só leitura | — |
| Senha | Alterar senha | Autenticação multifatorial (linha própria no roadmap) |
| Exclusão de conta | O aviso, o formulário com motivo e feedback, e a exclusão de tudo do criador | A permanência de kahoots públicos muito jogados |

## Objetivo

O criador tem uma conta que é dele: põe uma foto, que passa a aparecer onde aparece o seu ícone, troca o nome e a senha, vê quanto ainda pode usar do assistente de criação e, se quiser, exclui a conta com tudo o que criou. Cada criador tem um **perfil** com os seus quizzes públicos, que os outros abrem para jogar, atribuir ou duplicar.

## Personas

- **Criador** — dono da conta: muda a foto, o nome e a senha, vê a cota, exclui a conta e vê o próprio perfil.
- **Visitante** — outro usuário com conta que abre o perfil de um criador (pelo link ou por "Ver perfil" num grupo) e usa os quizzes públicos dele.

## Histórias de usuário

- **HU-01** — Como criador, quero abrir a minha conta pela foto na barra superior, para chegar ao perfil, às configurações e a encerrar a sessão.
- **HU-02** — Como criador, quero pôr uma foto e recortá-la, para ser reconhecido nos grupos e no meu perfil.
- **HU-03** — Como criador, quero trocar o meu nome, para corrigir ou atualizar como apareço.
- **HU-04** — Como criador, quero trocar a minha senha, para manter a conta segura.
- **HU-05** — Como criador, quero ver quanto já usei do assistente de criação, para saber quantas criações ainda posso fazer hoje.
- **HU-06** — Como criador, quero excluir a minha conta e tudo o que criei, para sair do Quizio de vez.
- **HU-07** — Como criador, quero marcar um quiz como Público, para que ele apareça no meu perfil.
- **HU-08** — Como visitante, quero ver o perfil de um criador e abrir os quizzes públicos dele, para jogar, atribuir ou duplicar.

## Regras de negócio

### Menu da conta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Na barra superior, o botão da conta passa a ser a **foto do criador** (RN-06) em vez do nome, com o nome como rótulo acessível. | captura 1 |
| RN-02 | O **menu da conta** mostra a foto grande, o **nome**, o **e-mail** e **Ver perfil** (RN-27); abaixo, **Configurações** (Seu perfil, RN-09) e, separado, **Encerrar sessão** em vermelho, que encerra a sessão e leva à página inicial pública. Nada mais. | captura 1 · decisão do produto (2026-10-27) |

### Configurações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-03 | **Configurações** é uma tela da área do criador (com a barra lateral e a barra superior) com uma coluna de seções própria, como a de Grupos (em telas estreitas, abas): **Seu perfil**, **Acesso à IA**, **Senha** e **Exclusão de conta**, nesta ordem. A seção aberta fica destacada e no endereço; abrir Configurações leva a Seu perfil. Nenhum item da barra lateral fica destacado. | capturas 2, 8, 11 e 12 · decisão do produto (2026-10-27) |
| RN-04 | Só o próprio criador vê e muda as suas configurações; não existe tela de configurações de outra pessoa. | decisão do produto (2026-10-27) |

### Foto do perfil

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-05 | A **foto do perfil (`ProfilePhoto`)** é opcional. Sem ela, o criador aparece com o **ícone padrão** (a silhueta sobre o círculo colorido). A foto de uma conta Google **não** é usada: só vale a foto que o criador carrega no Quizio. | captura 1 · decisão do produto (2026-10-27) |
| RN-06 | A foto aparece, **redonda**, em todo lugar onde hoje aparece o ícone do criador: o botão e o menu da conta, a seção Senha, o formulário de exclusão, o perfil, e nos grupos (ícones do cabeçalho, Membros do grupo, Informações do membro, publicações, quizzes compartilhados e atribuições). No cartão de Seu perfil ela é **quadrada**, com os cantos arredondados. | capturas 1, 6, 7, 11, 13 e 15 · specs 034 a 038 |
| RN-07 | No cartão de Seu perfil, **"Adicionar foto"** (sem foto) ou a própria foto abre o diálogo **"Carregar imagem"**: a área "Carregue a imagem ou arraste o arquivo até aqui", "ou", o botão **Carregar imagem**, o aviso "A foto do perfil será pública e poderá ser vista por qualquer pessoa com conta no Quizio." e **Cancelar** / **Carregar** (indisponível sem imagem). Com uma foto já posta, o diálogo tem também **Remover foto**. Esc, clicar fora ou Cancelar fecham sem mudar nada. | capturas 2, 3 e 6 · decisão do produto (2026-10-27) |
| RN-08 | A foto segue a **política de mídia** do Quizio: **JPEG, PNG, GIF ou WebP de até 10 MB**. Outro formato ou tamanho é recusado antes do envio com "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.", e o diálogo continua aberto; o servidor confere de novo. | spec 007, RN-02 e RN-09 |
| RN-09 | Escolhida a imagem, a área mostra o **recorte redondo** sobre ela, com o **controle de zoom** (do ícone de imagem pequena ao de imagem grande); arrastar a imagem escolhe a parte que fica no círculo. O recorte começa centrado, com o menor zoom que cobre o círculo. | captura 4 · spec 007 (recorte) |
| RN-10 | **Carregar** envia a imagem: a área mostra a barra **"Carregando imagem…"** com **Cancelar**, e o botão vira **"Carregando"**, indisponível. Cancelar interrompe o envio e volta à imagem escolhida. Terminado, o diálogo fecha e a nova foto aparece, com o recorte escolhido, em todos os lugares de RN-06 sem recarregar a página. Uma falha mostra "Não foi possível carregar a imagem." e mantém a imagem escolhida para tentar de novo. | capturas 5 e 6 |
| RN-11 | **Remover foto** volta ao ícone padrão em todos os lugares e fecha o diálogo. Trocar ou remover a foto **apaga o arquivo anterior**. | decisão do produto (2026-10-27) |

### Nome e e-mail

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-12 | O campo **Nome** mostra o nome da conta, com o botão **Alterar** ao lado, indisponível (cinza) enquanto o texto é igual ao salvo e azul quando muda. | capturas 2 e 6 |
| RN-13 | O nome segue as **regras de cadastro**: **2 a 50 caracteres** (contados com `characterCount`), sem espaços nas pontas. Fora disso, Alterar mostra "O nome precisa ter de 2 a 50 caracteres." e não salva. | spec 001 (regras de cadastro) |
| RN-14 | **Alterar** salva o nome, avisa "Nome alterado" e o novo nome passa a aparecer em todo lugar que mostra o criador (menu da conta, perfil, grupos, capa das atribuições, saudação da página inicial), inclusive no que ele publicou antes. Enter no campo faz o mesmo que Alterar. | captura 6 · decisão do produto (2026-10-27) |
| RN-15 | O **E-mail** aparece **só para leitura**, sem Alterar. | decisão do usuário (2026-10-27) · ADR 0007 |
| RN-16 | Abaixo dos campos, **Ver perfil** abre o perfil do criador (RN-27). | captura 2 |

### Acesso à IA

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | **Acesso à IA** mostra, numa instância com o assistente de criação, "O assistente de criação está disponível.", o uso da **cota**: **"{usadas} de {cota} criações nas últimas 24 horas"** com uma barra de progresso e, quando há criações na janela, **"A próxima criação volta a ficar livre {em quanto tempo}"** (a da criação mais antiga da janela). Com a cota esgotada, o texto diz "Você usou todas as criações das últimas 24 horas.". | decisão do usuário (2026-10-27) · spec 027 (cota diária) · **alterada pela [spec 045](../045-creditos-de-ia/spec.md)**: em créditos |
| RN-18 | Numa instância **sem** o assistente, a seção diz "O assistente de criação não está disponível neste Quizio." e não mostra cota. | spec 027, RN-01 |
| RN-19 | A seção é **só leitura**: a cota é da instância e não se muda aqui. | constituição, artigo VI · spec 027 |

### Senha

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-20 | **Senha** mostra, no topo, a foto e o e-mail da conta e, abaixo, **Alterar senha** com **Senha atual**, **Nova senha** e **Repita a nova senha**, cada um com o **olho** que mostra e esconde o texto, e o botão **Alterar senha**, indisponível até os três campos terem texto. | captura 11 |
| RN-21 | A nova senha segue as **regras de cadastro** (**8 a 128 caracteres**). As mensagens, no campo: "A nova senha precisa ter de 8 a 128 caracteres.", "As senhas não coincidem." e, quando o servidor recusa a atual, "A senha atual está incorreta.". | spec 001 (regras de cadastro) · decisão do produto (2026-10-27) |
| RN-22 | Alterar a senha avisa "Senha alterada", limpa os campos e **encerra as outras sessões** da conta; a sessão atual continua. | decisão do produto (2026-10-27) |
| RN-23 | Tentativas com a senha atual errada são **limitadas como as de entrar**: depois de 5 em 60 segundos, a próxima é recusada com "Muitas tentativas. Tente de novo em instantes.". | spec 001 (limite de tentativas) |
| RN-24 | Uma conta que **só entra com o Google** não tem senha: a seção diz "Você entra com o Google. Esta conta não tem senha." e não mostra o formulário. | spec 001 (Google) · decisão do produto (2026-10-27) |

### Visibilidade Público

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-25 | A **visibilidade (`Visibility`)** de um quiz passa a ser, como no Kahoot, **Privado** (`private`, padrão), "Visível apenas para você.", ou **Público** (`public`), "Visível para todos no seu perfil.". **Não listado sai**: nunca teve efeito (spec 001, RN-14), e os quizzes Não listados passam a ser Privados. Público quer dizer **aparece no perfil do dono** (RN-28); não há Descobrir nem pesquisa pública. As Configurações do quiz mostram as duas opções, cada uma com o seu texto, e a biblioteca, a página do quiz e os grupos mostram "Privado" ou "Público" onde já mostram a visibilidade. | capturas do Kahoot (Configurações do kahoot, 2026-10-27) · kahoot-reference §3.1 · decisão do usuário (2026-10-27) |
| RN-25a | O **⋮** de cada quiz na biblioteca ganha **Visibilidade**, que abre ao lado **Privado** e **Público** como escolha única, cada um com **ⓘ** que mostra o texto de RN-25. Escolher muda a visibilidade na hora, sem abrir as Configurações, e a coluna Visibilidade da linha acompanha. Um quiz na lixeira não tem a opção. | captura do Kahoot (menu da biblioteca, 2026-10-27) |
| RN-26 | Duplicar o quiz **de outra pessoa** (do perfil ou de um grupo) cria uma cópia **Privada**; duplicar o próprio quiz continua copiando a visibilidade. | decisão do produto (2026-10-27) · spec 001, RN-20 · spec 037, RN-21 |

### Perfil

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-27 | O **perfil (`CreatorProfile`)** de um criador tem um endereço próprio e é visto por **qualquer pessoa com conta** no Quizio; sem sessão, o endereço leva a entrar e volta ao perfil. Um endereço de perfil de conta que não existe (ou foi excluída) diz "Este perfil não existe." com **Ir para o início**. Abrem o perfil: **Ver perfil** do menu da conta e de Seu perfil, e **Ver perfil** dos grupos, que deixa de ser "Em breve". | captura 7 · spec 034, RN-33 · decisão do produto (2026-10-27) |
| RN-28 | O perfil mostra a **foto**, o **nome**, **Opções de perfil ⋮** e os números **Quizzes**, **Jogos** e **Participantes**; abaixo, os **cartões dos quizzes públicos** do criador: só os **publicados** (com uma versão salva, spec 006) e **fora da lixeira**, dos salvos por último para os mais antigos. | captura 7 · spec 006 · decisão do produto (2026-10-27) |
| RN-29 | **Quizzes** é o total de cartões; **Jogos** é o total de partidas ao vivo e atribuições **começadas** com esses quizzes, por qualquer anfitrião; **Participantes**, a soma dos participantes delas. Uma partida que só teve lobby não conta. | captura 7 · spec 037, RN-16 |
| RN-30 | Cada **cartão** mostra o rótulo "Quiz", a capa com **"N participantes"** e **"N perguntas"**, o título e o nome do dono. Sem capa, a capa padrão do Quizio. | captura 7 · spec 037, RN-15 |
| RN-31 | Sem quizzes públicos, o perfil diz, para o dono, "Você ainda não tem quizzes públicos. Mude a visibilidade de um quiz para Público para que ele apareça aqui." e, para o visitante, "{nome} ainda não tem quizzes públicos.". | decisão do produto (2026-10-27) |
| RN-32 | **Opções de perfil ⋮** tem **Copiar link do perfil** (avisa "Link copiado") para todos e, para o dono, **Editar perfil**, que abre Seu perfil. | captura 7 · decisão do produto (2026-10-27) |
| RN-33 | O dono, ao abrir um cartão, vai à página de sempre do quiz (spec 001). O visitante vai à **página do quiz público**, que é a página do quiz compartilhado da spec 037 fora do grupo: o dono no topo, Editar ("Duplique para editar") e Duplicar, a capa, o título, a descrição, "N jogos", "N participantes", as perguntas com "Mostrar respostas", **Organizar ao vivo** e **Atribuir**, com a última versão salva pelo dono (spec 037, RN-16 a RN-21). A partida, a atribuição e o relatório são do visitante. | decisão do usuário (2026-10-27) · spec 037 |
| RN-34 | Um quiz deixa de ser público para os visitantes quando o dono muda a visibilidade, o põe na lixeira ou o exclui: some do perfil, e a página do quiz público diz "Este quiz não está mais disponível." com **Voltar ao perfil**. O que o visitante já fez com ele (cópia, partidas, atribuições, relatórios) continua dele. | decisão do produto (2026-10-27) · spec 037, RN-24 e RN-25 |

### Exclusão de conta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-35 | **Exclusão de conta** mostra **Excluir conta** (link) e "Ao excluir sua conta, você perderá o acesso a todos os quizzes que criou.". | captura 12 |
| RN-36 | **Excluir conta** abre o formulário: a foto e o nome; "Lamentamos que você tenha partido. Agradecemos se puder dizer por que decidiu excluir sua conta. Assim, podemos melhorar o Quizio."; **Motivo para excluir a conta** ("Escolha uma opção"), **obrigatório**; **"Gostaria de compartilhar algum feedback? (opcional)"**, até **1.000 caracteres**; a **Observação**: "todos os quizzes, relatórios e grupos que você administra serão excluídos, e as suas publicações saem dos grupos."; e **Cancelar** (volta ao link) / **Excluir conta**, em vermelho, indisponível sem motivo. | capturas 13 e 14 · decisão do produto (2026-10-27) |
| RN-37 | Os **motivos** são, nesta ordem: Tenho outra conta; Quero criar um novo perfil; Pensei que precisava de uma conta para jogar; Falta de recursos; Problemas técnicos; Eu não uso esta conta; O Quizio não era o que eu pensei que fosse; Outro. | captura 14 |
| RN-38 | **Excluir conta** pede uma confirmação final: "Excluir sua conta?", "Tudo o que você criou será excluído. Esta ação não pode ser desfeita.", o campo **Senha** (ou, numa conta que só entra com o Google, o campo "Digite seu e-mail para confirmar") e **Cancelar** / **Excluir minha conta**. Senha errada: "A senha está incorreta.", com o limite de RN-23; e-mail diferente do da conta mantém o botão indisponível. | decisão do produto (2026-10-27) |
| RN-39 | Confirmada, a exclusão é **definitiva** e apaga, de uma vez: a conta e as sessões; a foto; todos os quizzes (inclusive os da lixeira), as versões e as imagens; todas as partidas e atribuições do criador e os relatórios delas (as abertas acabam para os jogadores, como em "Encerrar agora", specs 013 e 029); os **grupos que ele administra** (como em "Excluir grupo", spec 034, RN-37); nos outros grupos, a participação, as **publicações**, as curtidas e os quizzes que ele compartilhou; as preferências guardadas e o uso da cota. | decisão do produto (2026-10-27) · spec 034, RN-37 |
| RN-40 | Partidas e atribuições **de outras pessoas** feitas com quizzes dele (compartilhados ou públicos) **continuam** delas, com os relatórios, como quando um quiz é excluído (spec 015). | spec 015 · spec 037, RN-24 |
| RN-41 | O **motivo** e o **feedback** são guardados **sem ligação com a conta** (sem nome, e-mail ou identificador), com a data, para consulta direta no banco; nenhuma tela os mostra nesta spec. | decisão do usuário (2026-10-27) |
| RN-42 | Depois da exclusão, a sessão acaba e o navegador vai à página inicial pública com o aviso "Sua conta foi excluída.". O mesmo e-mail pode criar uma conta nova depois, quando o cadastro estiver aberto, começando do zero. | decisão do produto (2026-10-27) · spec 001 (cadastro desligável) |

### Barra lateral

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-43 | **Descobrir** sai da navegação principal, que passa a ser **Início**, **Biblioteca**, **Relatórios** e **Grupos**. Volta quando a descoberta pública for especificada. | decisão do usuário (2026-10-27) · altera a spec 002, RN-04 |

## Critérios de aceite

### CA-01 — Menu da conta pela foto

- **Dado** um criador sem foto, com sessão
- **Quando** ele aciona o botão da conta na barra superior
- **Então** vê o ícone padrão grande, o nome, o e-mail, Ver perfil, Configurações e Encerrar sessão, e nenhum outro item

### CA-02 — Encerrar sessão

- **Dado** o menu da conta aberto
- **Quando** o criador aciona Encerrar sessão
- **Então** a sessão acaba e ele está na página inicial pública

### CA-03 — Seções das configurações

- **Dado** um criador com sessão
- **Quando** ele aciona Configurações no menu da conta
- **Então** vê Seu perfil aberto, com a coluna Seu perfil, Acesso à IA, Senha e Exclusão de conta, e o endereço indica a seção
- **E** abrir o endereço de Senha diretamente mostra a seção Senha destacada

### CA-04 — Pôr a foto com recorte

- **Dado** Seu perfil sem foto
- **Quando** o criador aciona Adicionar foto, escolhe um PNG de 2 MB, aumenta o zoom, arrasta a imagem e aciona Carregar
- **Então** vê "Carregando imagem…" com o botão "Carregando" indisponível, e o diálogo fecha sozinho
- **E** a foto, com o recorte escolhido, aparece no cartão de Seu perfil e, redonda, no botão da conta, sem recarregar a página

### CA-05 — Carregar indisponível sem imagem

- **Dado** o diálogo "Carregar imagem" aberto sem imagem escolhida
- **Então** Carregar está indisponível
- **E** Cancelar fecha o diálogo sem mudar a foto

### CA-06 — Arquivo recusado

- **Dado** o diálogo "Carregar imagem" aberto
- **Quando** o criador escolhe um PDF, ou um JPEG de 11 MB
- **Então** vê "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB." e nada é enviado
- **E** o servidor também recusa a foto quando o arquivo não respeita o formato ou o tamanho

### CA-07 — Cancelar o envio

- **Dado** o envio de uma foto em andamento
- **Quando** o criador aciona Cancelar na barra de progresso
- **Então** o envio para, a imagem escolhida continua no recorte e a foto da conta não muda

### CA-08 — Trocar e remover a foto

- **Dado** um criador com foto
- **Quando** ele carrega outra foto
- **Então** a nova aparece em todos os lugares e o arquivo da anterior deixa de existir
- **E** quando ele aciona Remover foto, o ícone padrão volta em todos os lugares e o arquivo é apagado

### CA-09 — A foto nos grupos

- **Dado** um criador com foto, membro de um grupo onde publicou e compartilhou um quiz
- **Quando** outro membro abre o grupo, Membros do grupo e Informações do membro
- **Então** vê a foto do criador nos ícones do cabeçalho, na linha da tabela, nas informações do membro, na publicação e no cartão do quiz compartilhado

### CA-10 — Foto do Google não é usada

- **Dado** um criador que entrou pela primeira vez com o Google, cuja conta Google tem foto
- **Então** ele aparece com o ícone padrão até carregar uma foto no Quizio

### CA-11 — Alterar o nome

- **Dado** Seu perfil com o nome "João"
- **Então** Alterar está indisponível
- **Quando** o criador digita "João Gabriel" e aciona Alterar
- **Então** vê "Nome alterado", e o menu da conta, o perfil e as suas publicações num grupo mostram "João Gabriel"

### CA-12 — Nome fora do limite

- **Dado** Seu perfil
- **Quando** o criador deixa o nome com 1 caractere, ou com 51, e aciona Alterar
- **Então** vê "O nome precisa ter de 2 a 50 caracteres." e o nome salvo não muda
- **E** um nome com espaços nas pontas é salvo sem eles

### CA-13 — E-mail só leitura

- **Dado** Seu perfil
- **Então** o e-mail aparece sem Alterar e não pode ser editado

### CA-14 — Acesso à IA com cota

- **Dado** uma instância com o assistente e cota de 20, e um criador que fez 3 criações, a mais antiga há 19 horas
- **Quando** ele abre Acesso à IA
- **Então** vê "O assistente de criação está disponível.", "3 de 20 criações nas últimas 24 horas" com a barra e que a próxima criação volta a ficar livre em 5 horas
- **E** com 20 criações na janela, vê "Você usou todas as criações das últimas 24 horas."

### CA-15 — Acesso à IA sem assistente

- **Dado** uma instância sem provedor de IA
- **Quando** o criador abre Acesso à IA
- **Então** vê "O assistente de criação não está disponível neste Quizio." e nenhuma cota

### CA-16 — Alterar a senha

- **Dado** um criador com senha, com sessão em dois navegadores
- **Quando** ele preenche a senha atual certa e duas vezes uma nova de 8 caracteres e aciona Alterar senha
- **Então** vê "Senha alterada" e os campos ficam vazios
- **E** a sessão do outro navegador acaba, e a atual continua
- **E** depois disso ele entra com a nova senha e não com a antiga

### CA-17 — Erros ao alterar a senha

- **Dado** a seção Senha
- **Então** Alterar senha fica indisponível enquanto algum campo está vazio
- **Quando** a nova senha tem 7 caracteres
- **Então** vê "A nova senha precisa ter de 8 a 128 caracteres."
- **Quando** as duas novas senhas diferem
- **Então** vê "As senhas não coincidem."
- **Quando** a senha atual está errada
- **Então** vê "A senha atual está incorreta." e a senha não muda
- **E** a sexta tentativa errada em 60 segundos é recusada com "Muitas tentativas. Tente de novo em instantes."

### CA-18 — Conta só com Google

- **Dado** um criador que só entra com o Google
- **Quando** ele abre Senha
- **Então** vê "Você entra com o Google. Esta conta não tem senha." e nenhum formulário

### CA-19 — Visibilidade Público

- **Dado** um quiz publicado e Privado
- **Quando** o dono muda a visibilidade para Público
- **Então** a biblioteca e a página do quiz mostram "Público"
- **E** o quiz aparece como cartão no perfil do dono

### CA-19a — Visibilidade pelo menu da biblioteca

- **Dado** um quiz Privado na biblioteca
- **Quando** o dono aciona ⋮ › Visibilidade
- **Então** vê Privado (marcado) e Público, cada um com ⓘ ("Visível apenas para você." e "Visível para todos no seu perfil.")
- **Quando** ele escolhe Público
- **Então** a coluna Visibilidade da linha mostra "Público" sem abrir as Configurações

### CA-19b — Não listado deixa de existir

- **Dado** um quiz que estava Não listado antes desta entrega
- **Então** ele aparece como Privado
- **E** as Configurações do quiz oferecem só Privado e Público

### CA-20 — Perfil com os quizzes públicos

- **Dado** um criador com um quiz Público publicado (15 perguntas, jogado em 3 partidas por 41 participantes no total), um Público nunca salvo, um Público na lixeira e um Privado publicado
- **Quando** outro usuário abre o perfil dele
- **Então** vê a foto, o nome, Quizzes 1, Jogos 3 e Participantes 41, e um único cartão, com "41 participantes", "15 perguntas", o título e o nome do dono

### CA-21 — Perfil vazio

- **Dado** um criador sem quizzes públicos
- **Quando** ele abre o próprio perfil
- **Então** vê "Você ainda não tem quizzes públicos. Mude a visibilidade de um quiz para Público para que ele apareça aqui."
- **E** um visitante vê "{nome} ainda não tem quizzes públicos."

### CA-22 — Opções de perfil

- **Dado** o perfil aberto
- **Quando** o dono aciona Opções de perfil
- **Então** vê Copiar link do perfil e Editar perfil, e Editar perfil abre Seu perfil
- **E** um visitante vê só Copiar link do perfil, que avisa "Link copiado"

### CA-23 — Ver perfil num grupo

- **Dado** dois membros de um grupo
- **Quando** um deles aciona Ver perfil no menu do outro em Membros do grupo
- **Então** abre o perfil do outro, e Ver perfil não está mais marcado "Em breve"

### CA-24 — Perfil sem sessão e perfil inexistente

- **Dado** o link do perfil de um criador
- **Quando** alguém sem sessão o abre
- **Então** vai à tela de entrar e, depois de entrar, volta ao perfil
- **E** o endereço de um perfil que não existe mostra "Este perfil não existe." com Ir para o início

### CA-25 — Página do quiz público

- **Dado** um visitante no perfil de um criador com um quiz Público
- **Quando** ele abre o cartão
- **Então** vê a página do quiz público com o dono, Editar, Duplicar, as perguntas com as respostas escondidas até Mostrar respostas, Organizar ao vivo e Atribuir
- **E** Organizar ao vivo abre uma partida dele, que depois aparece nos Relatórios dele
- **E** Duplicar cria na biblioteca dele um rascunho Privado "{título} (cópia)" e o abre no editor

### CA-26 — Quiz que deixou de ser público

- **Dado** um visitante com a página de um quiz público aberta
- **Quando** o dono muda a visibilidade para Privado
- **Então** o quiz some do perfil, e a página diz "Este quiz não está mais disponível." com Voltar ao perfil
- **E** a cópia que o visitante fez antes continua na biblioteca dele

### CA-27 — Formulário de exclusão

- **Dado** a seção Exclusão de conta
- **Quando** o criador aciona Excluir conta
- **Então** vê a foto, o nome, o motivo com as oito opções na ordem de RN-37, o feedback opcional e a Observação
- **E** Excluir conta fica indisponível até escolher um motivo, e o feedback não aceita mais de 1.000 caracteres
- **E** Cancelar volta ao link "Excluir conta"

### CA-28 — Excluir a conta

- **Dado** um criador com quizzes (um na lixeira, um com imagens), uma atribuição aberta, um grupo que administra, uma publicação num grupo de outra pessoa e uma foto
- **Quando** ele escolhe um motivo, escreve um feedback, aciona Excluir conta e confirma com a senha certa
- **Então** a sessão acaba, ele está na página inicial pública com "Sua conta foi excluída." e não consegue mais entrar
- **E** os quizzes, as imagens, a foto, a atribuição e os relatórios deixaram de existir, e o participante da atribuição vê que ela acabou
- **E** o grupo que ele administrava não existe mais para os membros, e a publicação dele saiu do outro grupo
- **E** o motivo e o feedback ficaram guardados sem nada que identifique a conta

### CA-29 — Confirmação recusada

- **Dado** a confirmação final da exclusão
- **Quando** o criador digita a senha errada
- **Então** vê "A senha está incorreta." e a conta continua
- **E** numa conta só com Google, o botão fica indisponível até o e-mail digitado ser o da conta

### CA-30 — O que é dos outros continua

- **Dado** um membro que jogou ao vivo um quiz compartilhado por um criador
- **Quando** o criador exclui a conta
- **Então** o relatório da partida continua nos Relatórios do membro

### CA-31 — Novo cadastro com o mesmo e-mail

- **Dado** uma conta excluída e o cadastro aberto
- **Quando** alguém se cadastra com o mesmo e-mail
- **Então** a conta nova começa sem quizzes, grupos nem foto

### CA-32 — Barra lateral sem Descobrir

- **Dado** um criador em qualquer tela da área do criador
- **Então** a barra lateral mostra, nesta ordem, Início, Biblioteca, Relatórios e Grupos

## Experiência (telas e estados)

- **Barra superior**: a foto (ou o ícone padrão) no lugar do botão com o nome; enquanto a sessão carrega, um círculo de espera.
- **Menu da conta**: cabeçalho cinza claro com a foto grande, o nome em negrito, o e-mail e o botão contornado Ver perfil; abaixo, Configurações (engrenagem) e, separado por uma linha, Encerrar sessão em vermelho.
- **Configurações**: coluna de seções à esquerda (abas em telas estreitas) e, ao lado, o título da seção e os cartões brancos sobre o fundo cinza.
  - **Seu perfil**: um cartão com a foto (ou "Adicionar foto" tracejado), Nome com Alterar, E-mail só leitura e Ver perfil.
  - **Acesso à IA**: um cartão com a disponibilidade, a barra da cota e o tempo até a próxima criação livre; carregando, um esqueleto.
  - **Senha**: um cartão com a foto e o e-mail, os três campos com o olho e Alterar senha; para conta Google, só o aviso.
  - **Exclusão de conta**: o link e o aviso; depois, o formulário; a confirmação final é um diálogo.
- **Diálogo "Carregar imagem"**: vazio (área tracejada), com a imagem (recorte redondo, zoom), carregando (barra, Cancelar) e erro (mensagem, imagem mantida).
- **Perfil**: cabeçalho com a foto, o nome, Opções de perfil e os três números; a grade de cartões; estados vazio (RN-31), carregando (esqueletos) e perfil inexistente (RN-27).
- **Página do quiz público**: a mesma da spec 037 fora do grupo, com "Voltar ao perfil" no lugar de voltar ao grupo; estado indisponível (RN-34).

## Divergências intencionais do Kahoot

- **Sem nome de usuário**: o Quizio tem só o Nome, que já aparece nos grupos e nas atribuições (decisão do usuário, 2026-10-27).
- **E-mail só leitura**: trocar o e-mail espera a verificação de e-mail (roadmap, pendências técnicas; ADR 0007).
- **Sem Idioma, Tipo de conta, Tipo de local de trabalho e Início da semana**: nada no Quizio depende deles.
- **Sem Privacidade e notificações**: as chaves são de e-mails, que o Quizio não envia; idade do aluno e cookies não se aplicam.
- **Sem planos**: nada de verificado, perfil infantil, passes de aluno, cobrança e upgrade (constituição, artigo VI).
- **"Público" só aparece no perfil**: não há Descobrir nem pesquisa pública; Descobrir sai da barra lateral. O texto da opção diz "no seu perfil" em vez de "na página Descobrir".
- **Sem Seguidores e Seguir** no perfil.
- **A foto do Google não é usada**: só a foto carregada no Quizio, para que todas as fotos sigam a mesma política de mídia.
- **Confirmação com senha** antes de excluir a conta, que o Kahoot não pede.
- **A exclusão apaga tudo**: o Kahoot mantém os kahoots públicos com mais de 500 jogadas; o Quizio não guarda conteúdo de quem saiu. O que outras pessoas fizeram com os quizzes (partidas, relatórios, cópias) é delas e continua.

## Fora de escopo

- O **sino de notificações** — spec 040.
- **Autenticação multifatorial** — linha própria no roadmap.
- **Alterar o e-mail**, verificação de e-mail e recuperação de senha — pendência técnica do roadmap.
- **Definir uma senha** numa conta que só entra com o Google.
- **Descobrir**, pesquisa pública, Seguidores e Seguir.
- Uma tela para ler os motivos e os feedbacks de exclusão.
- Lista das sessões abertas e encerrar uma a uma.

## Perguntas em aberto

- [ ] O perfil deveria ser visível também sem conta (como no Kahoot, que tem endereço público)? — hoje: só com conta, porque não há Descobrir e as páginas de quiz para visitantes exigem sessão.
- [ ] A página do quiz público deve guardar o ponto onde o visitante estava (perfil ou grupo) para o "Voltar"? — hoje: "Voltar ao perfil".

## Changelog

- 2026-10-27 — spec criada a partir das capturas da conta do Kahoot. Decisões do usuário: "Ver perfil" entra agora, com a nova visibilidade Público, que substitui Não listado como no Kahoot (capturas das Configurações do kahoot e do menu da biblioteca) e a página do quiz público (RN-25 a RN-34); Descobrir sai da barra lateral (RN-43); só o Nome, sem nome de usuário (divergências); e-mail só leitura (RN-15); Acesso à IA só leitura (RN-17 a RN-19); autenticação multifatorial depois; motivo e feedback de exclusão guardados sem tela (RN-41); o sino vira a spec 040.
- 2026-10-27 — spec entregue (status `done`). Todos os 34 CAs têm teste automatizado verde (core, PGlite, auth, API, componentes, integração do storage e E2E). Escolhas feitas na implementação, dentro das regras:
  - a confirmação final diz **"Excluir minha conta"**, para não repetir o "Excluir conta" do formulário atrás do diálogo (RN-38);
  - a foto é recortada no navegador num quadrado de 512 px (WebP), então **um GIF vira imagem parada** só na foto (ADR 0019);
  - "Acesso à IA" lê o status do assistente que já existia (spec 027), agora com o uso e o tempo até a próxima criação livre;
  - o perfil e o quiz público que não existem respondem `LIBRARY.PROFILE_NOT_FOUND` e `LIBRARY.PUBLIC_QUIZ_NOT_FOUND`;
  - a página do quiz público é a do quiz compartilhado (spec 037) sem "Compartilhado por".
- 2026-10-29 — a [spec 045](../045-creditos-de-ia/spec.md) passa o Acesso à IA (RN-17) para créditos: "{usados} de {orçamento} créditos nas últimas 24 horas" e "Os próximos créditos voltam {em quanto tempo}".
- 2026-10-29 — auditoria de segurança (achado L4): a foto enviada e nunca definida como foto de perfil é apagada depois de 24 horas, e conta no limite de envios da pessoa (spec 007, RN-35a).
