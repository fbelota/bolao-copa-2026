# Bolão Copa 2026 V3

Esta versão foi ajustada para o seu Supabase atual.

## Arquivos que vão para o GitHub

Envie estes arquivos para o repositório:

- index.html
- style.css
- app.js
- config.js
- README.md

O arquivo `supabase-ajuste-v3.sql` é opcional. Use apenas se aparecer erro de permissão ou coluna.

## Configuração do config.js

Abra o arquivo `config.js` e troque:

```js
SUPABASE_ANON_KEY: "COLE_AQUI_SUA_CHAVE_COMPLETA_sb_publishable"
```

pela sua Publishable Key completa.

Também troque:

```js
PIX_CHAVE: "COLE_AQUI_SUA_CHAVE_PIX"
PIX_TEXTO: "Pix: COLE_AQUI_SUA_CHAVE_PIX | Valor: R$ 10,00"
WHATSAPP_ORGANIZADOR: "5592999999999"
```

## Campos usados no Supabase

Tabela games:

- id
- home_team
- away_team
- game_date
- game_time
- status
- created_at

Tabela bets:

- id
- game_id
- bettor_name
- bettor_whatsapp
- home_score
- away_score
- status
- created_at

Tabela admins:

- id
- email

## Publicação no GitHub Pages

1. Abra seu repositório `bolao-copa-2026`.
2. Clique em `uploading an existing file`.
3. Arraste os arquivos do projeto.
4. Clique em `Commit changes`.
5. Vá em `Settings`.
6. Clique em `Pages`.
7. Em Source, escolha `Deploy from a branch`.
8. Branch: `main`.
9. Folder: `/root`.
10. Clique em `Save`.

Seu site ficará em:

https://fbelota.github.io/bolao-copa-2026/

## Supabase URL Configuration

Depois que o GitHub Pages estiver ativo, volte no Supabase:

Authentication → URL Configuration

Site URL:

https://fbelota.github.io/bolao-copa-2026/

Redirect URLs:

https://fbelota.github.io/bolao-copa-2026/

Salve.

## Status corretos

Use sempre minúsculo.

Para jogos:

- open
- closed
- finished

Para palpites:

- pending
- validated
- cancelled


## V4 configurada

Esta versão já está configurada com:

- Supabase URL: https://ppzpfhnnfjplagfozyuh.supabase.co
- Publishable Key informada no chat
- Campos compatíveis com as tabelas `admins`, `bets` e `games`

Antes de publicar, ajuste no arquivo `config.js` apenas estes campos, se desejar:

- `VALOR_PALPITE`
- `PIX_CHAVE`
- `PIX_TEXTO`
- `WHATSAPP_ORGANIZADOR`

Depois de publicar no GitHub Pages, volte ao Supabase em Authentication > URL Configuration e troque:

- Site URL para `https://fbelota.github.io/bolao-copa-2026`
- Redirect URLs para `https://fbelota.github.io/bolao-copa-2026`
