# ADR 0019 — Conta, perfil e exclusão

- **Status:** aceito (2026-10-27)
- **Contexto da decisão:** spec [039 — Conta e perfil do criador](../../specs/features/039-conta-e-perfil/spec.md)

## Contexto

Na spec 039, o criador ganha quatro coisas:
- uma foto;
- a troca do nome e da senha;
- um perfil com os quizzes **públicos**, que outros usuários jogam, atribuem e duplicam;
- a exclusão da conta com tudo o que criou.

A conta é do Better Auth (ADR 0007), que já tem a coluna `user.image` (preenchida pelo Google), `updateUser`, `changePassword` e `deleteUser`. As regras do Quizio, porém, vivem no core (ADR 0001):
- os arquivos guardam **chaves**, nunca URLs (ADR 0003);
- quem usa um quiz que não é seu é decidido pela porta `QuizShareGrants` (ADR 0018);
- a exclusão de um quiz, de um grupo e de uma publicação já tem casos de uso que limpam arquivos e encerram partidas.

## Decisão

1. **O Better Auth cuida do nome, da senha e da sessão.** As regras do core entram pelas *hooks*, como no cadastro:
   - `/update-user` normaliza e valida o nome e recusa `image`;
   - `/change-password` tem o mesmo limite por IP de `/sign-in/email`;
   - a senha nova encerra as outras sessões (`revokeOtherSessions`).
2. **A foto é do Quizio.** Ela fica na tabela `profile_photo` (uma chave por usuário) e no prefixo `profiles/{userId}/`. A coluna `user.image` não é lida. **O recorte é feito no navegador**: o canvas gera um quadrado de 512 px, e só ele sobe. Cada foto é então um arquivo com uma URL, sem parâmetros de recorte para carregar em cada tela de grupo, e cada envio tem uma chave nova, sem problema de cache. As views passam a levar `PersonView { userId, name, photoUrl }`, com a URL montada no servidor.
3. **Público é uma visibilidade, e a permissão é a mesma porta.** `QuizShareGrants.canUse` passa a dizer sim também para um quiz público, publicado e fora da lixeira. Organizar ao vivo, Atribuir, Duplicar e Jogar novamente funcionam para quem visita o perfil sem mudar `game`, `quiz` e `reports`. `unlisted` sai do core; o valor fica no tipo do Postgres e é lido como `private`.
4. **Excluir a conta é um caso de uso de `identity`.** O banco faz a maior parte, porque quase toda tabela tem `on delete cascade` para `user`. O caso de uso faz o que a cascata não faz, nesta ordem:
   - confere a senha ou o e-mail;
   - guarda o feedback anônimo;
   - encerra as partidas abertas e publica o fim;
   - exclui os grupos que a pessoa administra pelo caso de uso de sempre;
   - apaga a linha de `user`;
   - apaga os arquivos (chaves dos grupos e `deletePrefix` de `media/`, `sources/` e `profiles/`).

   Os outros contextos entram pela porta `AccountClosure`, ligada no `container.ts`. O `deleteUser` do Better Auth não é usado: ele não sabe dos arquivos, das partidas nem do feedback.

## Consequências

- `ObjectStorage` ganha `deletePrefix`, com teste de integração no adapter S3.
- A exclusão não é atômica (banco, storage e real-time). Cada passo pode ser repetido. Se a falha vier depois da linha de `user`, sobram arquivos órfãos no bucket, que não estão ligados a ninguém. Esse risco é aceito.
- Um GIF vira imagem parada na foto do perfil (só nela).
- O id da conta aparece no endereço do perfil, como já aparecia nos grupos. O e-mail nunca aparece.
- A cópia de um quiz de outra pessoa nasce Privada (muda a spec 037, RN-21).
