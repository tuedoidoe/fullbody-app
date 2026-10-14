# FullBody — versão 1.1.0

Aplicativo pessoal de musculação em formato PWA, em português, com armazenamento local no navegador.

## Mudanças desta versão

- Na sessão, todos os exercícios do bloco atual ficam visíveis ao mesmo tempo.
- O treino é executado em rodadas: série 1 de cada exercício do bloco, depois descanso; em seguida série 2 de cada exercício, e assim por diante.
- A série seguinte da rodada só é liberada depois que os exercícios da rodada atual forem marcados. Os próximos blocos são liberados após concluir o bloco atual.
- Ao terminar o descanso, o aplicativo emite três bipes e tenta vibrar o dispositivo. A capacidade de emitir som/vibração com a tela bloqueada depende do navegador e do sistema; um PWA estático não consegue garantir um alarme em segundo plano em todos os celulares.
- O botão **Detalhes** do histórico abre o resumo completo do treino.
- O menu **Preparar treino** usa uma rotina persistente. O botão **Editar rotina** permite alterar o nome e selecionar/deselecionar exercícios; salvar atualiza a rotina atual em vez de criar outra cópia.
- A rotina salva é local ao navegador, assim como o histórico.

## Recursos incluídos

- Os 7 exercícios iniciais divididos em blocos A, B e C.
- Cronômetro da sessão, pausa/retomada e temporizador de descanso entre rodadas.
- Registro de repetições e cargas por série.
- Salvamento automático do andamento e histórico detalhado.
- Cadastro, edição e exclusão de exercícios.
- Edição do nome e da lista de exercícios da rotina permanente.
- Perfil, peso corporal, painel de evolução, tema claro/escuro e backup JSON.
- Layout responsivo e modo instalável PWA para hospedagem HTTPS.

## Como testar no computador

1. Extraia o ZIP.
2. Abra a pasta `FullBody` no VS Code.
3. Use a extensão Live Server ou, nesta pasta, rode `python -m http.server 8000`.
4. Abra `http://localhost:8000`. Para testar instalação PWA e service worker, use localhost ou HTTPS, não `file://`.

## Hospedar no GitHub Pages

Envie os arquivos da pasta `FullBody` para a raiz de um repositório e, em **Settings → Pages**, escolha **Deploy from a branch**, branch `main` e pasta `/(root)`. O GitHub Pages hospedará os arquivos estáticos do app.

## Armazenamento, backup e sincronização

Os dados de perfil, exercícios, rotina e treinos ficam no `localStorage` do navegador. **GitHub Pages não é um backend e não sincroniza os treinos finalizados entre dispositivos.** Para sincronização automática com servidor é preciso integrar um backend com autenticação e banco de dados, por exemplo Supabase com Auth e Row Level Security. Não publique dados pessoais nem credenciais secretas em um repositório público.

Até configurar esse backend, use **Configurações → Exportar backup JSON** e **Importar backup JSON** para fazer cópia manual. Guarde o arquivo exportado em local seguro. Limpar os dados do navegador pode apagar os registros.

## Limitação do alarme

O som é gerado pelo próprio navegador depois que o usuário interage com o aplicativo. O aplicativo tenta vibrar por meio da API de vibração quando disponível. Se o celular bloquear a tela ou suspender a PWA, o navegador pode atrasar timers e impedir o alarme na hora exata. Para alarme garantido com app totalmente em segundo plano, seria necessário outro tipo de implementação (por exemplo, app nativo ou backend de notificações push).
