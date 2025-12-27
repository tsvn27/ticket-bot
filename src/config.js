module.exports = {
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        warning: 0xFEE75C,
        danger: 0xED4245,
        info: 0x5865F2
    },
    priorities: {
        low: { name: 'Baixa', color: 0x57F287, emoji: '🟢' },
        medium: { name: 'Média', color: 0xFEE75C, emoji: '🟡' },
        high: { name: 'Alta', color: 0xFFA500, emoji: '🟠' },
        urgent: { name: 'Urgente', color: 0xED4245, emoji: '🔴' }
    },
    settings: {
        maxTicketsPerUser: 2,
        inactivityTime: 24,
        autoCloseEnabled: true
    },
    quickResponses: [
        { id: 'greeting', label: 'Saudação', message: 'Olá! Como posso ajudar?' },
        { id: 'wait', label: 'Aguarde', message: 'Por favor, aguarde um momento.' },
        { id: 'info', label: 'Info', message: 'Preciso de mais informações.' },
        { id: 'thanks', label: 'Obrigado', message: 'Obrigado pelo contato!' }
    ]
};
