# AI文章作成メーカー

メール、SNS投稿、お知らせ、自己紹介など、用途に合わせた日本語の文章をAIが3案作るWebアプリです。用途・伝えたい内容・宛先・雰囲気・長さを指定できます。生成した文章はコピー、お気に入り保存、履歴の確認ができます。お気に入りと履歴はブラウザのローカルストレージに保存されます。

## 起動

```bash
npm install
cp .env.example .env.local
```

`.env.local` に OpenAI API キーを設定します。

```env
OPENAI_API_KEY=your_openai_api_key_here
# 任意。省略時は gpt-6-luna を使用
OPENAI_MODEL=gpt-6-luna
PORT=8080
```

その後、サーバーを起動して `http://localhost:8080` を開きます。

```bash
npm start
```

APIキーはブラウザへ送らず、サーバーから OpenAI Responses API にリクエストします。APIキーが設定されていない場合やAIサービスに接続できない場合は、エラーを表示します。

## 主なファイル

- `server.js` — 静的ファイル配信と文章生成API
- `public/index.html` — AI文章作成メーカー
- `public/app.js` — 画面、文章生成、ブラウザ保存
- `public/style.css` — レスポンシブUI
- `public/quiz.html` — ITパスポート対策クイズ
- `prompt.md` — クイズ生成API用プロンプト

文章生成APIは `POST /api/writing` です。文章の種類・伝えたい内容・宛先・雰囲気・長さを受け取り、候補を返します。クイズ用の既存 `POST /api/` エンドポイントも利用できます。
