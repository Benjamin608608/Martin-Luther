const { Client, GatewayIntentBits, EmbedBuilder, ActivityType } = require('discord.js');
const OpenAI = require('openai');
require('dotenv').config();

// 初始化 Discord 客戶端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

// 初始化 OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 馬丁路德機器人配置
const LUTHER_CONFIG = {
    promptId: "pmpt_687f0b8c68908193864d9a438af2dd4f01a25e0d816dfd3a",
    version: "1",
    maxResponseLength: 2000,
    responseDelay: 2000, // 回應延遲 (毫秒)
    blacklistedChannels: [], // 可以添加不想回應的頻道 ID
    stopCommand: "!stop", // 停止指令
};

// 機器人狀態管理
const botStatus = {
    isActive: true, // 機器人是否啟用
    adminUsers: new Set(), // 管理員用戶 ID
};

// 儲存最近的對話上下文
const conversationHistory = new Map();
const MAX_HISTORY_LENGTH = 5;

// 機器人準備就緒事件
client.once('ready', () => {
    console.log(`✅ 馬丁路德機器人已上線！登入為 ${client.user.tag}`);
    console.log(`🔗 機器人 ID: ${client.user.id}`);
    console.log(`📺 已加入 ${client.guilds.cache.size} 個伺服器`);
    
    // 從環境變數讀取管理員 ID
    if (process.env.ADMIN_USER_IDS) {
        const adminIds = process.env.ADMIN_USER_IDS.split(',').map(id => id.trim());
        adminIds.forEach(id => botStatus.adminUsers.add(id));
        console.log(`👑 已設定 ${adminIds.length} 位管理員`);
    }
    
    // 設置機器人狀態
    updateBotPresence();
});

// 更新機器人狀態顯示
function updateBotPresence() {
    const activity = botStatus.isActive ? 
        '研讀聖經與神學著作' : '已暫停回應 (!stop)';
    const status = botStatus.isActive ? 'online' : 'idle';
    
    client.user.setPresence({
        activities: [{
            name: activity,
            type: ActivityType.Watching
        }],
        status: status
    });
}

// 訊息處理
client.on('messageCreate', async (message) => {
    try {
        // 忽略自己的訊息
        if (message.author.id === client.user.id) return;
        
        // 檢查是否為停止/啟動指令
        if (message.content.trim() === LUTHER_CONFIG.stopCommand) {
            await handleStopCommand(message);
            return;
        }
        
        // 檢查是否為啟動指令
        if (message.content.trim() === "!start") {
            await handleStartCommand(message);
            return;
        }
        
        // 如果機器人被停止，不回應其他訊息
        if (!botStatus.isActive) return;
        
        // 檢查是否在黑名單頻道
        if (LUTHER_CONFIG.blacklistedChannels.includes(message.channel.id)) return;
        
        console.log(`📨 收到訊息 from ${message.author.tag}: ${message.content.substring(0, 100)}...`);
        
        // 更新對話歷史
        updateConversationHistory(message);
        
        // 顯示正在輸入狀態
        await message.channel.sendTyping();
        
        // 延遲回應讓對話更自然
        setTimeout(async () => {
            try {
                // 獲取馬丁路德的回應
                const response = await getLutherResponse(message);
                
                if (response && response.trim()) {
                    await sendLutherResponse(message, response);
                    console.log(`✅ 已回應 ${message.author.tag} 的訊息`);
                }
            } catch (error) {
                console.error('回應訊息時發生錯誤:', error);
                await handleResponseError(message, error);
            }
        }, LUTHER_CONFIG.responseDelay);
        
    } catch (error) {
        console.error('處理訊息時發生錯誤:', error);
    }
});

// 處理停止指令
async function handleStopCommand(message) {
    if (!isAuthorized(message.author.id)) {
        await message.reply('🔒 只有授權用戶可以停止機器人。');
        return;
    }
    
    botStatus.isActive = false;
    updateBotPresence();
    
    console.log(`⏸️ 機器人已被 ${message.author.tag} 停止`);
    await message.reply('⏸️ 馬丁路德機器人已停止回應。使用 `!start` 重新啟動。');
}

// 處理啟動指令
async function handleStartCommand(message) {
    if (!isAuthorized(message.author.id)) {
        await message.reply('🔒 只有授權用戶可以啟動機器人。');
        return;
    }
    
    if (botStatus.isActive) {
        await message.reply('✅ 機器人已經在運行中。');
        return;
    }
    
    botStatus.isActive = true;
    updateBotPresence();
    
    console.log(`▶️ 機器人已被 ${message.author.tag} 啟動`);
    await message.reply('▶️ 馬丁路德機器人已重新啟動，將繼續回應訊息。');
}

// 檢查用戶是否有權限
function isAuthorized(userId) {
    // 如果沒有設定管理員，任何人都可以控制
    if (botStatus.adminUsers.size === 0) return true;
    
    // 檢查是否為授權管理員
    return botStatus.adminUsers.has(userId);
}

// 更新對話歷史
function updateConversationHistory(message) {
    const channelId = message.channel.id;
    
    if (!conversationHistory.has(channelId)) {
        conversationHistory.set(channelId, []);
    }
    
    const history = conversationHistory.get(channelId);
    history.push({
        author: message.author.tag,
        content: message.content,
        timestamp: message.createdTimestamp,
        isBot: message.author.bot
    });
    
    // 保持歷史記錄在限制範圍內
    if (history.length > MAX_HISTORY_LENGTH) {
        history.shift();
    }
}

// 獲取對話上下文
function getConversationContext(channelId) {
    const history = conversationHistory.get(channelId) || [];
    
    return history.map(msg => 
        `${msg.author}: ${msg.content.substring(0, 200)}`
    ).join('\n');
}

// 呼叫馬丁路德 AI 回應
async function getLutherResponse(message) {
    try {
        const conversationContext = getConversationContext(message.channel.id);
        const userMessage = message.content;
        
        // 檢測是否被直接提及
        const isDirectMention = message.mentions.has(client.user);
        const isStopCommand = message.content.trim() === LUTHER_CONFIG.stopCommand;
        
        console.log(`🤖 調用 OpenAI API for: ${userMessage.substring(0, 50)}...`);
        
        const response = await openai.responses.create({
            prompt: {
                id: LUTHER_CONFIG.promptId,
                version: LUTHER_CONFIG.version
            },
            variables: {
                user_message: userMessage,
                conversation_context: conversationContext,
                channel_name: message.channel.name || '私人對話',
                is_direct_mention: isDirectMention,
                author_name: message.author.displayName || message.author.username,
                author_is_bot: message.author.bot,
                response_language: "繁體中文",
                luther_persona: "以16世紀德國神學家馬丁路德的身份回應，基於您存儲的馬丁路德著作向量資料庫。請用繁體中文回答，除非特殊情況需要其他語言。保持路德的神學觀點和說話風格。對所有訊息都要給出回應，不論是否包含神學關鍵詞。",
                bot_status: "active"
            }
        });

        // 處理不同可能的回應格式
        let responseContent = response.content || 
                             response.message || 
                             response.text || 
                             response.choices?.[0]?.message?.content ||
                             response.choices?.[0]?.text;
        
        if (!responseContent && response.data) {
            responseContent = response.data.content || response.data.message || response.data.text;
        }
        
        return responseContent || null;
        
    } catch (error) {
        console.error('OpenAI API 調用失敗:', error);
        throw error;
    }
}

// 發送馬丁路德回應
async function sendLutherResponse(message, response) {
    try {
        // 處理過長的回應
        if (response.length > LUTHER_CONFIG.maxResponseLength) {
            const chunks = splitMessage(response, LUTHER_CONFIG.maxResponseLength);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                if (chunks.length > 1) {
                    // 多段訊息標記
                    const partIndicator = `(${i + 1}/${chunks.length})`;
                    await message.channel.send(`${chunk} ${partIndicator}`);
                } else {
                    await message.channel.send(chunk);
                }
                
                // 避免發送過快
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } else {
            // 創建嵌入式回應 (較正式的回應)
            if (message.mentions.has(client.user) || response.length > 500) {
                const embed = createLutherEmbed(response, message.author);
                await message.channel.send({ embeds: [embed] });
            } else {
                // 簡單回應 (更自然的對話)
                await message.channel.send(response);
            }
        }
        
    } catch (error) {
        console.error('發送回應時發生錯誤:', error);
        // 如果嵌入式發送失敗，嘗試純文字
        try {
            await message.channel.send(response.substring(0, LUTHER_CONFIG.maxResponseLength));
        } catch (fallbackError) {
            console.error('備援發送也失敗:', fallbackError);
        }
    }
}

// 創建嵌入式回應
function createLutherEmbed(response, author) {
    return new EmbedBuilder()
        .setColor(0x8B4513) // 棕色，象徵古典神學
        .setAuthor({
            name: '馬丁路德 (Martin Luther)',
            iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Lucas_Cranach_d.%C3%84._-_Martin_Luther%2C_1528_%28Veste_Coburg%29.jpg/256px-Lucas_Cranach_d.%C3%84._-_Martin_Luther%2C_1528_%28Veste_Coburg%29.jpg'
        })
        .setDescription(response)
        .setFooter({
            text: `回應給 ${author.displayName || author.username} • 基於馬丁路德著作`,
            iconURL: author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp()
        .addFields({
            name: '💡 提醒',
            value: '此回應基於馬丁路德的神學著作和思想',
            inline: false
        });
}

// 分割長訊息
function splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    // 優先按句號分割
    const sentences = text.split(/(?<=[。！？.!?])\s*/);
    
    for (const sentence of sentences) {
        const potentialChunk = currentChunk + sentence;
        
        if (potentialChunk.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                // 單句過長，強制分割
                const words = sentence.split('');
                let tempChunk = '';
                
                for (const char of words) {
                    if ((tempChunk + char).length > maxLength - 3) {
                        chunks.push(tempChunk + '...');
                        tempChunk = char;
                    } else {
                        tempChunk += char;
                    }
                }
                
                if (tempChunk) {
                    currentChunk = tempChunk;
                }
            }
        } else {
            currentChunk = potentialChunk;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

// 處理回應錯誤
async function handleResponseError(message, error) {
    console.error('API 錯誤詳情:', error);
    
    let errorMessage = '🙏 弟兄姊妹，我現在無法回應您的問題。';
    
    if (error.status === 429) {
        errorMessage += '請稍候片刻再詢問。';
    } else if (error.status === 401) {
        errorMessage += '我的認證出現問題。';
    } else if (error.code === 'ENOTFOUND') {
        errorMessage += '網路連線出現問題。';
    } else {
        errorMessage += '請稍後再試。';
    }
    
    try {
        // 只在被直接提及時才發送錯誤訊息
        if (message.mentions.has(client.user)) {
            await message.channel.send(errorMessage);
        }
    } catch (sendError) {
        console.error('發送錯誤訊息失敗:', sendError);
    }
}

// 優雅關閉處理
process.on('SIGINT', async () => {
    console.log('🔄 正在優雅關閉馬丁路德機器人...');
    
    try {
        await client.user.setStatus('invisible');
        client.destroy();
        console.log('✅ 機器人已安全關閉');
    } catch (error) {
        console.error('關閉時發生錯誤:', error);
    }
    
    process.exit(0);
});

// 錯誤處理
process.on('unhandledRejection', (error) => {
    console.error('未處理的 Promise 拒絕:', error);
});

process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
    process.exit(1);
});

// 登入 Discord
console.log('🚀 正在啟動馬丁路德機器人...');
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('🔐 Discord 登入成功');
    })
    .catch((error) => {
        console.error('❌ Discord 登入失敗:', error);
        process.exit(1);
    });
