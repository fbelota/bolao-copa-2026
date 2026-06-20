# Bolão Copa 2026 V5

Versão alinhada com as tabelas reais do seu Supabase.

## Estrutura esperada

### admins
- email
- created_at

### games
- id
- home_team
- away_team
- game_date
- game_time
- status
- created_at

### bets
- id
- name
- whatsapp
- game_id
- home_score
- away_score
- status

## Arquivos para subir no GitHub

Substitua todos os arquivos atuais do repositório por estes:

- index.html
- style.css
- app.js
- config.js
- README.md

## Depois de subir

Aguarde o GitHub Pages atualizar.

Abra:
https://fbelota.github.io/bolao-copa-2026/

Faça Ctrl + F5.

Teste um palpite em aba anônima.

Depois valide no painel do organizador.

## Ajustes pendentes

Edite o config.js no GitHub para trocar:

- PIX_CHAVE
- PIX_TEXTO
- WHATSAPP_ORGANIZADOR


## Alterações da V6

- Campos de placar mostram os nomes reais dos times.
- Card do jogo mostra bandeiras por país quando reconhecido.
- Config.js aplicado conforme arquivo enviado pelo organizador.
