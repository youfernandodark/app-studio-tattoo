export const utils = {
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor || 0);
    },

    formatarData(data) {
        if (!data) return '-';
        return new Date(data).toLocaleDateString('pt-BR');
    },

    formatarDataHora(data) {
        if (!data) return '-';
        return new Date(data).toLocaleString('pt-BR');
    },

    gerarId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    mostrarMensagem(tipo, mensagem) {
        const div = document.createElement('div');
        div.className = `mensagem ${tipo}`;
        div.textContent = mensagem;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 5px;
            background-color: ${tipo === 'sucesso' ? '#00ff88' : tipo === 'erro' ? '#ff4444' : '#ffa500'};
            color: #0a0a0a;
            font-weight: bold;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    confirmarAcao(mensagem) {
        return confirm(mensagem);
    }
};

export default utils;
