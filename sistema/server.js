const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const port = process.env.PORT || 3003;

// Middleware para entender JSON
app.use(express.json({ limit: '10mb' }));

// Middleware de CORS Manual (Permite acesso de Live Server/VS Code)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const projectRoot = path.join(__dirname, '../');
const dbPath = path.join(projectRoot, 'database.json');

// Servir arquivos estáticos
app.use(express.static(projectRoot));

app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

// --- API ROUTES ---

// Ler Banco de Dados
app.get('/api/db', (req, res) => {
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            // Se não existir, tenta criar ou retorna erro
            return res.status(500).json({ error: 'Erro ao ler banco de dados' });
        }
        res.json(JSON.parse(data));
    });
});

// Atualizar Banco de Dados
app.post('/api/db', (req, res) => {
    const newData = req.body;

    // Validação básica
    if (!newData) return res.status(400).json({ error: 'Dados inválidos' });

    fs.writeFile(dbPath, JSON.stringify(newData, null, 4), (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao salvar no banco' });
        res.json({ success: true });
    });
});

// --- WHATSAPP BOT SETUP ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-notifications',
            '--disable-background-networking',
            '--disable-breakpad',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-sync',
            '--disable-client-side-phishing-detection',
            '--disable-software-rasterizer',
            '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n🌟 LEIA O QR CODE ABAIXO NO SEU WHATSAPP (SISTEMA):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot conectado e pronto!');
    // Tenta enviar mensagem de teste para console se quiser
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação do WhatsApp', msg);
});

// --- API ROUTES ---

// Notificação Admin
app.post('/api/notify-admin', async (req, res) => {
    const { phone, message } = req.body;

    if (!client.info || !client.info.wid) {
        return res.status(503).json({ error: 'Bot do WhatsApp não está conectado ainda.' });
    }

    if (!phone || !message) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
    }

    // Formatar telefone (55 + DDD + Numero)
    let targetPhone = phone.replace(/\D/g, '');
    if (targetPhone.length <= 11) targetPhone = '55' + targetPhone; // Assume BR se não tiver DDI

    const chatId = targetPhone + '@c.us';

    try {
        await client.sendMessage(chatId, message);
        console.log(`📨 Notificação enviada para ${targetPhone}`);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao enviar Zap:', err);
        res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
});

// Ler Banco de Dados

app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(projectRoot, 'adm.html'));
});

// Iniciar (com Bot)
// --- PREVENT CRASHES ---
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL ERROR (Uncaught):', err);
    // Keep running if possible
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 CRITICAL ERROR (Unhandled Rejection):', reason, promise);
});

// Iniciar (com Bot)
if (process.env.DISABLE_BOT !== 'true') {
    client.initialize().catch(err => console.error('❌ Erro fatal ao iniciar Bot:', err));
} else {
    console.log('⚠️ BOT do WhatsApp desativado pela variável de ambiente DISABLE_BOT=true');
}

app.listen(port, () => {
    console.log(`✨ Servidor KAH NAILS rodando com Banco de Dados!`);
    console.log(`📂 DB em: ${dbPath}`);
    console.log(`💅 Site:   http://localhost:${port}`);
    console.log(`📱 Aguardando QR Code do WhatsApp...`);
});
