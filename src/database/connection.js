const mongoose = require('mongoose');

let isConnected = false;
let currentGuildId = null;

function setGuildId(guildId) {
    currentGuildId = guildId;
}

function getGuildId() {
    return currentGuildId;
}

async function connectDB() {
    if (isConnected) {
        console.log('MongoDB já conectado');
        return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('MONGODB_URI não definido');
        return false;
    }

    try {
        await mongoose.connect(uri, { dbName: 'ticket-system' });
        isConnected = true;
        console.log('✅ MongoDB conectado');
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:', error.message);
        
        for (let i = 1; i <= 3; i++) {
            console.log(`Tentativa ${i}/3...`);
            await new Promise(r => setTimeout(r, 2000 * i));
            try {
                await mongoose.connect(uri, { dbName: 'ticket-system' });
                isConnected = true;
                console.log('✅ MongoDB conectado após retry');
                return true;
            } catch (e) {
                console.error(`Tentativa ${i} falhou:`, e.message);
            }
        }
        
        console.error('❌ Falha ao conectar após 3 tentativas');
        return false;
    }
}

function getConnection() {
    return mongoose.connection;
}

function isDBConnected() {
    return isConnected && mongoose.connection.readyState === 1;
}

async function disconnectDB() {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB desconectado');
}

module.exports = { connectDB, disconnectDB, getConnection, isDBConnected, mongoose, setGuildId, getGuildId };
