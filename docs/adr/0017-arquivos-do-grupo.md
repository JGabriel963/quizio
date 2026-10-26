# ADR 0017 — Arquivos do grupo

- **Status:** aceito (2026-10-26)
- **Contexto da decisão:** spec [036 — Atividade](../../specs/features/036-atividade-do-grupo/spec.md)

## Contexto

Na spec 036, uma publicação do mural pode levar uma imagem (até 10 MB) ou um PDF (até 20 MB). As regras do projeto já valem aqui:
- os bytes não passam pela Vercel: o navegador sobe direto ao bucket por URL pré-assinada (ADR 0003);
- o banco guarda chaves, nunca URLs;
- não há timers no servidor.

Falta decidir três coisas:
- onde ficam os arquivos;
- quem pode abri-los;
- como some um arquivo enviado e nunca publicado.

Até aqui, só `media/*` é de leitura pública. Os PDFs do assistente (`sources/`) são temporários e lidos só pelo servidor.

## Decisão

1. **Prefixo próprio, por grupo:** `groups/{groupId}/{id}.{ext}`, com `id` aleatório (UUID). O `groups` monta a chave e confere que um envio pertence ao grupo (`isGroupFileKeyOf`, no shared kernel, junto de `mediaKeyFor` e `sourceKeyFor`).
2. **Leitura pública com endereço impossível de adivinhar**, como as imagens das perguntas. O Quizio só mostra o endereço a membros, na página do grupo. Quem recebe o endereço por fora consegue abrir o arquivo enquanto a publicação existir. O `bucket:setup` libera `groups/*` junto de `media/*`; no R2, o domínio público já cobre o bucket inteiro.
3. **O envio pendente é uma linha de `group_upload`** com o grupo, quem enviou, o tipo, o nome e o tamanho. "Publicar" a consome e cria a publicação **numa transação** (`DELETE … RETURNING` e depois `INSERT`), então um envio vira no máximo uma publicação, e só de quem o fez, no grupo dele.
4. **Limpeza sem timer:** cada novo pedido de envio apaga até 20 envios pendentes com mais de 24 horas, como o `source_upload` da spec 027. Cancelar e o X pedem o descarte na hora, como melhor esforço.
5. **O arquivo segue a publicação:** excluir a publicação ou o grupo apaga a linha e, depois, o objeto.
6. **O nome do arquivo vai assinado no envio** (`Content-Disposition: inline; filename*=…`, um campo opcional novo da porta `ObjectStorage`), para o PDF abrir no navegador e baixar com o nome original. O nome também fica no banco, para o cartão do mural.

## Consequências

- Não há custo por leitura nem URL que vence com a página aberta.
- A privacidade é a mesma das imagens das perguntas: segredo do endereço, não controle de acesso.
- Apagar o objeto depois do banco é melhor esforço: uma falha do storage, ou uma conta excluída (cuja cascata apaga as publicações sem passar pelo caso de uso), deixa um objeto órfão. O custo é aceito.
- O `groups` repete a política de tipos e tamanhos do `media` em vez de importá-la. Um teste liga as duas.

## Alternativas consideradas

- **URLs temporárias de leitura** (`GetObject` pré-assinado) com o bucket fechado. Exigiria tirar `groups/` do domínio público, o que o R2 não faz por prefixo. As URLs venceriam com a página aberta, o mural teria de renová-las, e um PDF aberto numa aba deixaria de funcionar.
- **Passar os arquivos por uma rota do app que confere a sessão:** os bytes passariam pela Vercel (limites de tamanho e de tempo da função e custo), contra o ADR 0003.
- **Publicar sem a tabela de pendentes**, confiando na chave enviada pelo navegador: não haveria como apagar o que nunca foi publicado sem listar o bucket, e a origem do arquivo não seria comprovada.
