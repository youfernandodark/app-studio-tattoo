import utils from './utils.js';
import { supabase } from '../config/supabase.js';

window.app = {
    utils,
    supabase,
    modais: {},
    dados: {
        caixa: [],
        servicos: [],
        piercings: [],
        materiais: [],
        agenda: []
    },

    async init() {
        // Limpa localStorage para evitar conflitos
        localStorage.removeItem('dark013tattoo_dados');
        
        // Testa conexão
        await this.testarConexao();
        
        this.setupNavigation();
        this.setupModals();
        await this.carregarTodosDados();
        
        console.log('✅ Aplicação inicializada com Supabase');
    },

    async testarConexao() {
        try {
            const { error } = await supabase.from('caixa').select('count').limit(1);
            if (error) throw error;
            console.log('✅ Conectado ao Supabase');
            document.querySelector('.subtitle').textContent = '✓ Conectado à nuvem | Dark Mode Studio';
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            document.querySelector('.subtitle').textContent = '❌ Erro de conexão | Dark Mode Studio';
            utils.mostrarMensagem('erro', 'Erro ao conectar com a nuvem!');
        }
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
        
        // Carrega dados da seção específica
        if (window.app[sectionId] && window.app[sectionId].carregar) {
            window.app[sectionId].carregar();
        }
    },

    setupModals() {
        window.app.modais = {
            open(modalId) {
                document.getElementById(modalId).classList.add('active');
            },
            close(modalId) {
                document.getElementById(modalId).classList.remove('active');
            }
        };
    },

    async carregarTodosDados() {
        // Carrega todos os módulos inicialmente
        if (window.app.dashboard) window.app.dashboard.atualizar();
    },

    salvarDados() {
        // Mantém cache local para performance (opcional)
        localStorage.setItem('dark013tattoo_cache', JSON.stringify(this.dados));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

export default app;
