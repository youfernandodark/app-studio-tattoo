import utils from './utils.js';

window.app = {
    utils,
    modais: {},
    dados: {
        caixa: [],
        servicos: [],
        piercings: [],
        materiais: [],
        agenda: []
    },

    init() {
        this.setupNavigation();
        this.setupModals();
        this.carregarDados();
        console.log('✅ Aplicação inicializada');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.navegarPara(section);
            });
        });
    },

    navegarPara(sectionId) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
        
        if (window.app[sectionId] && window.app[sectionId].carregar) {
            window.app[sectionId].carregar();
        }
    },

    setupModals() {
        window.app.modals = {
            open(modalId) {
                document.getElementById(modalId).classList.add('active');
            },
            close(modalId) {
                document.getElementById(modalId).classList.remove('active');
            }
        };
    },

    async carregarDados() {
        const dadosSalvos = localStorage.getItem('dark013tattoo_dados');
        if (dadosSalvos) {
            this.dados = JSON.parse(dadosSalvos);
        }
        this.atualizarDashboard();
    },

    salvarDados() {
        localStorage.setItem('dark013tattoo_dados', JSON.stringify(this.dados));
        this.atualizarDashboard();
    },

    atualizarDashboard() {
        if (window.app.dashboard && window.app.dashboard.atualizar) {
            window.app.dashboard.atualizar();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

export default app;
