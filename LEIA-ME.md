# Savepoint — como colocar o site no ar

Você vai juntar 4 serviços gratuitos. Não precisa instalar nada no computador.

| Serviço  | Para que serve                         |
|----------|----------------------------------------|
| Supabase | Banco de dados, login e fotos          |
| Twitch   | Libera a base de jogos (IGDB)          |
| GitHub   | Guarda o código                        |
| Vercel   | Coloca o site no ar                    |

---

## 1. Supabase: criar o banco de dados

1. Abra o seu projeto `savepoint` no supabase.com.
2. No menu da esquerda, clique em **SQL Editor** e depois em **New query**.
3. Abra o arquivo `supabase/schema.sql` (está nesta pasta), copie **todo** o conteúdo, cole no editor e clique em **Run**. Deve aparecer "Success".
4. Para os testes com amigos, desligue a confirmação por e-mail (assim ninguém fica esperando um e-mail chegar):
   **Authentication › Sign In / Providers › Email** › desmarque **Confirm email** › **Save**.
5. Vá em **Project Settings › API** (ou **Data API / API Keys**) e deixe aberto. Você vai precisar copiar:
   - **Project URL**
   - **anon public** key
   - **service_role** key (é secreta: nunca mande para ninguém)

## 2. Twitch: liberar a base de jogos

1. Entre em **dev.twitch.tv/console** com a sua conta da Twitch. A verificação em duas etapas precisa estar ativada.
2. Clique em **Register Your Application** e preencha:
   - Name: `savepoint-seunome` (o nome precisa ser único)
   - OAuth Redirect URLs: `http://localhost`
   - Category: **Website Integration**
   - Client Type: **Confidential**
3. Clique em **Create**, depois em **Manage** no app que você criou.
4. Copie o **Client ID**. Clique em **New Secret** e copie o **Client Secret**.

## 3. GitHub: enviar o código

1. No github.com, clique em **+ › New repository**.
2. Nome: `savepoint`. Marque **Private** e clique em **Create repository**.
3. Na página seguinte, clique no link **uploading an existing file**.
4. Arraste **todo o conteúdo** desta pasta (as pastas `app`, `components`, `lib`, `supabase` e os arquivos soltos) para a página.
5. Espere carregar e clique em **Commit changes**.

## 4. Vercel: colocar no ar

1. No vercel.com, clique em **Add New… › Project** e importe o repositório `savepoint`.
2. Abra **Environment Variables** e adicione uma por uma (nome à esquerda, valor à direita):

   | Nome                            | Valor                          |
   |---------------------------------|--------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`      | Project URL do Supabase        |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key do Supabase    |
   | `SUPABASE_SERVICE_ROLE_KEY`     | service_role key do Supabase   |
   | `TWITCH_CLIENT_ID`              | Client ID da Twitch            |
   | `TWITCH_CLIENT_SECRET`          | Client Secret da Twitch        |

3. Clique em **Deploy** e espere de 1 a 3 minutos.
4. Quando terminar, copie o endereço do site (algo como `savepoint-xyz.vercel.app`).

## 5. Últimos ajustes

1. Na Vercel: **Settings › Environment Variables** › adicione `NEXT_PUBLIC_SITE_URL` com o endereço do site (com `https://`). Depois vá em **Deployments**, clique nos três pontinhos do último deploy e escolha **Redeploy**.
2. No Supabase: **Authentication › URL Configuration** › em **Site URL**, coloque o mesmo endereço › **Save**.

## 6. Testar

- Crie sua conta, busque um jogo, dê nota, escreva uma review e poste algo na comunidade.
- Mande o link para os amigos e sigam uns aos outros na página **Pessoas**.

### Se der erro

- **O deploy falhou na Vercel:** abra o deploy, copie as últimas linhas vermelhas do log e mande para o Claude.
- **"Não foi possível conectar à Twitch/IGDB":** confira o Client ID e o Secret na Vercel e faça Redeploy.
- **Não consigo criar conta:** confira se rodou o `schema.sql` inteiro no Supabase.

### Observações

- As descrições dos jogos vêm do IGDB em inglês.
- Denúncias ficam salvas na tabela `reports` do Supabase (**Table Editor › reports**). Para apagar um post, abra a tabela `posts` e exclua a linha.
