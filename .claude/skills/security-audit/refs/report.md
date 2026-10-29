# Modelo do relatório

Usar no **Passo 7**. Arquivo: `docs/security/auditoria-AAAA-MM-DD.md` (se já existir um do mesmo dia, sufixo `-2`). Markdown comum, no tom das docs do projeto: frases curtas, em português, termos técnicos de segurança em inglês quando forem o padrão (IDOR, SSRF, CSRF, GHSA). Links relativos ao arquivo (`../../packages/...`) com linha. O modelo abaixo basta; se `docs/security/` já tiver relatórios, manter o tom e a estrutura do mais recente.

Não commitar o relatório sem pedido.

---

## Ordem das seções

1. **Título e método**

   ```markdown
   # Auditoria de segurança — DD/MM/AAAA

   Método da skill `security-audit` do projeto (`.claude/skills/security-audit/`): versões instaladas, `pnpm audit --prod`, segredos rastreados e revisão do código por fluxo (entrada → validação → identidade → autorização → destino), com filtro de falsos positivos.

   - **Escopo:** …
   - **Stack instalada (lockfile):** …
   - **Auditoria anterior:** `auditoria-AAAA-MM-DD.md` @ `<commit>` (ou `refs/known-findings.md`, quando não houver relatório anterior em `docs/security/`); <n> achados reverificados.
   - **Limitação:** análise estática; <o que foi reproduzido isolado, e como; o que não foi executado>.
   ```

2. **Resumo**: tabela por severidade (🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🔵 LOW, ⚪ INFO), depois três linhas (dependências, segredos, falsos positivos descartados) e um parágrafo: o que está sólido e de que tipo são os achados principais. Sem achado CRITICAL a LOW:

   ```markdown
   ✅ Nenhuma vulnerabilidade confirmada nos critérios desta auditoria. Escopo: …. Limitações: análise estática, sem DAST.
   ```

3. **Reverificação da auditoria anterior**: tabela `Id | Achado | Estado agora | Evidência` (corrigido em qual commit/PR, ainda aberto, piorou). Regressões vão também para os achados.

4. **Achados**, agrupados por categoria (ex.: Autenticação e agentes; Abuso de recursos e custo; Jogos e atividades; Exposição de dados; Configuração e infraestrutura; Agentes de IA; Integridade de dados), cada um no formato:

   ```markdown
   #### 🟡 M1 — <título que diz o efeito, não o padrão>
   - **Confiança:** HIGH | MEDIUM | LOW. <o que foi lido, reproduzido ou não executado>
   - **Onde:** [arquivo.ts:linhas](../../caminho/arquivo.ts), <outros pontos da cadeia>.
     ```ts
     <trecho real, curto>
     ```
   - **Exploração:**
     1. <quem é o atacante e o que precisa ter: conta, PIN, link, mesma rede>
     2. <passo a passo>
     - Variante: …
   - **Efeito:** <na Vercel / na VPS, quando diferir>
   - **Correção:** <acionável, no estilo do projeto; diz se pede atualização de spec>
   ```

   Ids: `C`/`H`/`M`/`L` + número, continuando depois dos já usados em `refs/known-findings.md`. INFO numa lista numerada ao fim da seção ("INFO (sem exploração, registrados para decisão)").

5. **Dependências**: contagem do `pnpm audit --prod` por severidade, depois a tabela:

   ```markdown
   | Pacote (instalado) | Por onde entra | Alcançável em produção? | Ação |
   ```

6. **Segredos**: "✅ Nenhum segredo real em arquivos rastreados." com o que a busca cobriu, ou um card por segredo com as ações de `refs/secrets.md` §6. Listar as variáveis `VITE_*` expostas.

7. **Propostas de patch**: só CRITICAL e HIGH, antes/depois:

   ````markdown
   ### Patch 1/N — <título>

   ⚠️ Revise cada patch antes de aplicar. Nada foi alterado no código.

   Antes (`caminho:linha`):
   ```ts
   …
   ```

   Depois:
   ```ts
   …
   ```

   Teste que falha hoje e passa com o patch: `<arquivo de teste>` — <o que afirma>.
   ````

   Sem CRITICAL/HIGH: "Nenhum achado CRITICAL ou HIGH, então não há patches nesta auditoria. As correções estão descritas em cada achado e ordenadas no plano abaixo. **Nada foi alterado no código.**"

8. **Falsos positivos descartados**: um item por candidato, com o motivo (o helper, a constraint, a versão que segura). Os que valem para as próximas vão também para `refs/false-positives.md`.

9. **Plano de correção sugerido**:

   ```markdown
   | # | Achado | Esforço | Precisa de spec? |
   ```

   Ordem: CRITICAL, HIGH, depois MEDIUM de menor esforço primeiro. Dizer o que precisa estar resolvido antes da VPS.

10. **Cobertura**: frentes revisadas, arquivos (pastas e bibliotecas cujo fonte foi lido, com versão), ferramentas (leitura estática, `pnpm audit --prod`, `git grep`, `git ls-files`, reproduções isoladas) e o que ficou fora (DAST, pentest, painéis da Vercel/R2/Pusher/provedor de IA, histórico do Git).

## Confiança

| Confiança | Quando |
|---|---|
| HIGH | Mecanismo lido de ponta a ponta, ou reproduzido isolado; nenhuma checagem no caminho |
| MEDIUM | Provável; depende do deploy, de uma biblioteca lida mas não executada, ou de um chamador não visto |
| LOW | Padrão suspeito que pede revisão humana: preferir INFO ou descartar |

Nunca omitir a confiança, e sempre dizer em que ela se baseia.

## Depois do relatório

- Atualizar `refs/known-findings.md` (estado de cada achado antigo, achados novos).
- Acrescentar a `refs/false-positives.md` os descartes que valerem para as próximas auditorias.
- Se um caminho citado nesta skill mudou de lugar, corrigir a referência no arquivo da skill.
