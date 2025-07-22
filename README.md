# 馬丁路德 Discord 機器人 🕊️

基於馬丁路德神學著作的 Discord AI 機器人，使用 OpenAI 向量資料庫技術。

## ✨ 功能特色

- 🤖 **智能對話**：基於馬丁路德真實著作的回應
- 🌐 **全頻道監聽**：自動檢測相關話題並參與討論
- 🇹🇼 **繁體中文優先**：預設使用繁體中文回應
- 🔄 **機器人互動**：支援與其他機器人對話
- 📚 **神學專業**：涵蓋宗教改革、因信稱義等核心主題
- 💬 **自然對話**：智能判斷回應時機，避免過度打擾

## 🚀 快速部署

### 1. Fork 此專案到您的 GitHub

### 2. 在 Railway 上部署
1. 前往 [Railway](https://railway.app)
2. 使用 GitHub 登入
3. 點擊 "New Project" → "Deploy from GitHub repo"
4. 選擇您 fork 的專案
5. 添加環境變數：
   - `DISCORD_TOKEN`: 您的 Discord 機器人 Token
   - `OPENAI_API_KEY`: 您的 OpenAI API Key

### 3. 取得 Discord Token
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 創建新應用程式
3. 在 "Bot" 頁面創建機器人並取得 Token
4. 在 "OAuth2" → "URL Generator" 設定權限：
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Message History`, `View Channels`

## ⚙️ 配置說明

機器人會自動回應包含以下關鍵詞的訊息：
- 神學相關：路德、馬丁、宗教改革、基督教、聖經、上帝等
- 教義相關：恩典、稱義、救贖、禱告、悔改等

## 🎯 使用方式

機器人會在以下情況回應：
1. **直接提及** (@機器人)
2. **包含關鍵詞**的訊息 (70% 機率)
3. **回覆機器人**的訊息 (30% 機率)

## 📊 監控與維護

查看 Railway 控制台的日誌來監控機器人狀態：
```bash
railway logs# Martin-Luther
