# Login social — 18/11/2026

## Configuração aplicada

As credenciais dos provedores Google e Facebook existentes no Firebase foram
recuperadas pela API administrativa autenticada e reaproveitadas no Supabase.
O arquivo local `.env.credentials`, ignorado pelo Git, guarda os valores privados.
Nenhum segredo deve ser incluído na documentação ou no frontend.

- Supabase remoto confirma `external.google = true` e `external.facebook = true`.
- `/auth/v1/authorize` responde HTTP 302 para cada provedor com o callback
  `https://unjaamgdenspepspxzle.supabase.co/auth/v1/callback`.
- O cliente Google existente recebeu esse callback e a origem
  `https://future-academy-six.vercel.app`; o console confirmou o salvamento.
  Os endereços antigos do Firebase foram preservados.
- O frontend já consulta os provedores habilitados para exibir os botões.
- Facebook solicita perfil público além do escopo de e-mail incluído pelo Supabase.

## Pendência Meta

O callback do Supabase foi adicionado em Facebook Login > Configurações.
A Meta confirmou “As alterações foram salvas”, e o validador confirmou que o
endereço é um URI de redirecionamento válido para o aplicativo.

Também foram salvos o domínio público, a categoria Educação, os links de
privacidade/termos e a URL de instruções de exclusão (a política pública descreve
a exclusão pelo perfil).

O app continua em modo de desenvolvimento. A Meta informa que Facebook Login
requer acesso avançado a `public_profile`; `email` e `public_profile` estão com
acesso padrão e status “Verificação necessária”. A liberação pública ainda depende
de verificação empresarial. Ao inspecionar a solicitação de `public_profile`, a
Meta respondeu: “A verificação da empresa é necessária para se obter acesso
avançado.” Nenhuma solicitação foi enviada ou permissão avançada concedida.
O login completo ainda não foi validado.

## Validação

A suíte existente passou: 11 testes Node/PostgreSQL e 81 Vitest.
Há mais três testes específicos para início OAuth e propagação de erros.
Tipagem e build foram verificadas. O build mantém avisos existentes de chunks grandes.
O login completo com conta Google/Facebook e o retorno com sessão ainda precisam
ser validados; HTTP 302 não comprova conclusão de autenticação.

A ativação dos provedores foi aplicada diretamente ao Supabase. A correção local
da importação de grade e a explicitação do escopo Facebook dependem de publicação
do frontend para chegar ao site.
