require('dotenv').config();
const mongoose = require('mongoose');

async function resetDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('MONGODB_URI não definido');
        return;
    }

    try {
        await mongoose.connect(uri, { dbName: 'ticket-system' });
        console.log('Conectado ao MongoDB');

        const collections = await mongoose.connection.db.collections();
        
        for (const collection of collections) {
            await collection.drop();
            console.log(`Deletado: ${collection.collectionName}`);
        }

        console.log('\n✅ Database resetada com sucesso!');
    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetDatabase();
