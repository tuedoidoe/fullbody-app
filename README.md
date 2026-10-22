# FullBody — versão 1.2.0

Aplicativo pessoal de musculação em formato PWA, em português, com armazenamento local no navegador.

## Mudanças desta versão

- As abas dos blocos são botões clicáveis: é possível abrir A, B, C ou outros blocos cadastrados em qualquer ordem durante o treino.
- Ao trocar de bloco, o aplicativo mantém o progresso de cada bloco; as rodadas e as séries seguintes continuam controladas dentro de cada bloco.
- Um descanso iniciado em um bloco não impede que o usuário abra e execute séries de outro bloco. Há um único contador de descanso visível por vez.
- O alarme foi reforçado para oito bipes ascendentes mais longos, com ganho Web Audio aumentado e sequência de vibração mais perceptível quando suportada.
- Foi adicionada uma opção para solicitar permissão de notificações do navegador. Quando a sessão continua ativa em segundo plano, o app tenta exibir uma notificação ao fim do descanso.
- A navegação por abas mantém a chave de armazenamento local existente (`fullbody.data.v1`), para preservar os treinos gravados anteriormente.

## Limites importantes do alarme

Esta versão é uma PWA estática. O navegador controla os temporizadores de abas ocultas e pode suspender JavaScript/áudio quando o telefone está bloqueado. A API Web não fornece ao aplicativo uma maneira padronizada de solicitar o foco de áudio nativo do Android (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`) para reduzir ou pausar a música de outro app. Portanto, o som mais forte e a notificação são tentativas de melhor esforço, não uma garantia com tela apagada.

Para um alarme confiável com a tela bloqueada e controle do áudio de outro aplicativo, é necessária uma versão Android nativa (por exemplo, Kotlin ou Flutter com plugin nativo) que use um serviço em primeiro plano e solicite foco de áudio ao sistema. A Screen Wake Lock apenas evita que a tela apague; ela não cumpre o requisito de alarmar com a tela apagada.

## Recursos incluídos

- Os 7 exercícios iniciais divididos em blocos A, B e C.
- Cronômetro geral, pausa/retomada e descanso entre rodadas.
- Registro individual de repetições, cargas e séries.
- Salvamento automático local, resumo e histórico detalhado dos treinos.
- Cadastro de exercícios, edição da rotina, perfil, peso corporal, evolução, tema claro/escuro e backup JSON.
- Layout responsivo e instalação PWA via HTTPS.

## Como testar no computador

1. Extraia o ZIP.
2. Abra a pasta `FullBody` no VS Code.
3. Execute `python -m http.server 8000` nessa pasta ou use Live Server.
4. Abra `http://localhost:8000`. Para instalação PWA e Service Worker, use `localhost` ou HTTPS, não `file://`.

## Hospedar no GitHub Pages

Envie os arquivos da pasta `FullBody` diretamente para a raiz do repositório e, em **Settings → Pages**, escolha **Deploy from a branch**, branch `main` e pasta `/(root)`. O GitHub Pages hospeda os arquivos estáticos do app.

## Armazenamento, backup e sincronização

Os dados de perfil, exercícios, rotina e treinos ficam no `localStorage` do navegador. GitHub Pages não sincroniza registros automaticamente entre dispositivos. Para isso, conecte um backend autenticado e banco de dados, por exemplo Supabase com Auth e Row Level Security. Até configurar sincronização, use **Configurações → Exportar backup JSON** e **Importar backup JSON**. Guarde os arquivos em local seguro.
