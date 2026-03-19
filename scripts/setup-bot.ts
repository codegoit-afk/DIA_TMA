import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dia-tma.vercel.app';

async function setup() {
    if (!BOT_TOKEN) {
        console.error('❌ Error: TELEGRAM_BOT_TOKEN is not defined in .env.local');
        return;
    }

    console.log(`🤖 Setting up bot for: ${APP_URL}`);

    try {
        // 1. Set Menu Button
        console.log('--- Setting Menu Button ---');
        const menuRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
            menu_button: {
                type: 'web_app',
                text: 'Открыть DIA AI',
                web_app: {
                    url: APP_URL
                }
            }
        });
        console.log('✅ Menu Button Result:', menuRes.data);

        // 2. Set Webhook (Optional but good for stability)
        console.log('--- Setting Webhook ---');
        const webhookRes = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            url: `${APP_URL}/api/telegram/webhook`
        });
        console.log('✅ Webhook Result:', webhookRes.data);

        console.log('\n🚀 Setup complete! Your bot should now show the "Open App" button.');
    } catch (error: any) {
        console.error('❌ Setup failed:', error.response?.data || error.message);
    }
}

setup();
