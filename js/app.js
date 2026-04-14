import utils from './utils.js';
import { supabase } from '../config/supabase.js';

// Torna o app global
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
        console.log('🚀 Iniciando app...');
        
        try {
            // Testa conexão
            await this.testarConexao();
            
            // Setup
            this.setupNavigation();
            this.setupModals();
            
            // Carrega dados iniciais
            await this.carregarTodosDados();
            
            console.log('✅ App inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            utils.mostrarMensagem('erro', 'Erro ao iniciar: ' + error.message);
        }
    },

    async testarConexao() {
        try {
            const { data, error } = await supabase.from('caixa').select('*').limit(1);
            if (error) throw error;
            
            console.log('✅ Supabase conectado!');
            const subtitle = document.querySelector('.subtitle');
            if (subtitle) {
                subtitle.textContent = '✓ Conectado à nuvem | Dark Mode Studio';
                subtitle.style.color = '#00ff88';
            }
        } catch (error) {
            console.error('❌ Erro de conexão:', error);
            const subtitle = document.querySelector('.subtitle');
            if (subtitle) {
                subtitle.textContent = '❌ ERRO DE CONEXÃO | Verifique o console (F12)';
                subtitle.style.color = '#ff4444';
            }
            throw error;
        }
    },

    setupNavigation() {
        console.log('📍 Configurando navegação...');
        const buttons = document.querySelectorAll('.nav-btn');
        console.log('Botões encontrados:', buttons.length);
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                console.log('Navegando para:', section);
                this.navegarPara(section);
            });
        });
    },

    navegarPara(sectionId) {
        console.log('🔄 Navegando para seção:', sectionId);
        
        // Esconde todas as seções
        document.querySelectorAll('.section').forEach(s => {
            s.classList.remove('active');
        });
        
        // Remove active dos botões
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Mostra seção atual
        const section = document.getElementById(sectionId);
        const button = document.querySelector(`[data-section="${sectionId}"]`);
        
        if (section) {
            section.classList.add('active');
            console.log('✓ Seção ativada:', sectionId);
        }
        
        if (button) {
            button.classList.add('active');
        }
        
        // Carrega dados da seção
        if (window.app[sectionId] && typeof window.app[sectionId].carregar === 'function') {
            console.log('📥 Carregando dados de:', sectionId);
            window.app[sectionId].carregar();
        }
    },

    setupModals() {
        console.log('🔲 Configurando modais...');
        
        window.app.modais = {
            open: function(modalId) {
                console.log('Abrindo modal:', modalId);
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    console.log('✓ Modal aberto');
                } else {
                    console.error('❌ Modal não encontrado:', modalId);
                }
            },
            close: function(modalId) {
                console.log('Fechando modal:', modalId);
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('active');
                    console.log('✓ Modal fechado');
                }
            }
        };
        
        // Torna global para os botões do HTML
        window.app.modais.open = window.app.modais.open;
        window.app.modais.close = window.app.modais.close;
    },

    async carregarTodosDados() {
        console.log('📊 Carregando todos os dados...');
        
        // Carrega dashboard inicialmente
        if (window.app.dashboard && typeof window.app.dashboard.atualizar === 'function') {
            await window.app.dashboard.atualizar();
        }
    },

    salvarDados() {
        localStorage.setItem('dark013tattoo_cache', JSON.stringify(this.dados));
    }
};

// Inicia quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM pronto, iniciando...');
        window.app.init();
    });
} else {
    console.log('DOM já pronto, iniciando...');
    window.app.init();
}

export default window.app;            
