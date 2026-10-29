# ADR 0024 — Créditos de IA: estimativa reservada, cobrança pelo uso real

- **Status:** aceito (2026-10-29)
- **Contexto da decisão:** [spec 045](../../specs/features/045-creditos-de-ia/spec.md) · [plano](../../specs/features/045-creditos-de-ia/plan.md) · auditoria de segurança de 2026-10-29 (achados M2 e M3)

## Contexto

O ADR 0012 limitou o assistente de criação por uma cota de **criações**: uma linha de `generation_usage` por clique, numa janela móvel de 24 horas, devolvida se a chamada falhar. A auditoria de segurança mostrou três problemas:
- devolver em qualquer falha deixava gastar sem limite;
- contas gratuitas somavam cotas;
- cada criação não tinha teto de custo.

Ela corrigiu os três: devolução só quando o provedor não responde, teto de tokens de saída e teto da instância. Restou o problema de fundo: o custo de uma criação varia dezenas de vezes com o tamanho da fonte, e contar cliques não acompanha o gasto real. A spec 045 troca a unidade por créditos.

## Decisão

1. **O crédito vem do uso real que o provedor informa** (tokens de entrada e de saída), convertido por **pesos da instância**, porque cada modelo tem um preço. A conta é uma função pura do core (`quiz/domain/generation-credits.ts`), feita em milésimos inteiros.
2. **Reservar a estimativa, acertar com o uso real.**
   - Antes da chamada, o core calcula o máximo que a criação pode custar a partir do tamanho da fonte e da Duração: a estimativa, com um teto de saída proporcional à Duração.
   - A estimativa é reservada sob a trava única da cota.
   - Depois da resposta, a linha é acertada: o criador paga o uso real limitado à estimativa, e o teto da instância conta o uso real inteiro.
   - Sem uso conhecido (tempo esgotado), fica a estimativa.
3. **Uma linha por criação, com dois números** (`credits` e `instance_credits`), na mesma tabela e na mesma janela móvel. A forma da cota do ADR 0012 continua; muda o que se soma.
4. **A estimativa é a mesma função no navegador e no servidor.** O status do assistente leva os pesos, e a tela calcula a estimativa sem uma chamada por alteração. O servidor recalcula ao reservar e é a autoridade.
5. **O gerador informa o uso também nas falhas** (`GenerationChargedError` com o uso, ou nulo). Assim o core decide a cobrança sem conhecer o SDK.

Substitui o item 5 do ADR 0012.

## Consequências

- Criações pequenas custam pouco e grandes custam mais, e o teto da instância acompanha o gasto em dinheiro.
- A estimativa depende de constantes (tokens por página, por caractere, por pergunta) que precisam ser calibradas com o provedor real. Errar para menos não aumenta o gasto da instância, que conta o uso real; só faz o criador pagar menos do que usou.
- O status do assistente passa a expor os pesos, que não são segredo.
- Linhas antigas valem 1 crédito pelo default da coluna, então a migração é compatível com o código anterior.

## Alternativas consideradas

- **Cobrar só depois, sem reserva:** não daria para recusar antes de gastar. Duas criações ao mesmo tempo poderiam passar do orçamento, e o PDF seria lido sem saber se cabe.
- **Reservar o pior caso absoluto (o teto de saída de 32.000 tokens):** a estimativa ficaria muito acima do custo típico e recusaria criações que cabem no saldo.
- **Pedir a estimativa ao servidor a cada alteração:** uma chamada por tecla ou página marcada, para um cálculo que é uma função pura.
- **Contar créditos em decimais:** mais justo para criações minúsculas, mais difícil de ler. A spec decidiu inteiros, no mínimo 1.
