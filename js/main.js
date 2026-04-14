import { supabase } from './supabaseClient.js';
import { testarConexao, showAlert } from './utils.js';
import { initNavigation, fecharModal } from './ui.js';
import { store } from './store.js';
import { atualizarDashboard } from './modules/dashboard.js';
import { carregarCaixa, salvarCaixa, excluirCaixa, abrirModalCaixa, editarCaixa, filtrarCaixa } from './modules/caixa.js';
import { carregarServicos, salvarServico, excluirServico, abrirModalServico, editarServico, calcularRepasse, filtrarServicos, limparFiltrosServicos } from './modules/servicos.js';
import { carregarAgenda, salvarAgenda, excluirAgenda, abrirModalAgendamento, editarAgenda, confirmarAgendamento, filtrarAgenda, limparFiltrosAgenda, filtrarAgendaHoje } from './modules/agenda.js';
import { carregarPiercings, carregarVendasPiercing, salvarPiercing, excluirPiercing, abrirModalPiercing, editarPiercing, registrarVendaPiercing } from './modules/piercing.js';
import { carregarMateriais, carregarUsosMateriais, salvarMaterial, excluirMaterial, abrirModalMaterial, editarMaterial, registrarUsoMaterial } from './modules/materiais.js';
import { carregarRelatorios } from './modules/relatorios.js';
import { exportarBackup, importarBackup } from './modules/backup.js';

// Expor funções globalmente para os onclick do HTML
window.fecharModal = fecharModal;
window.salvarCaixa = salvarCaixa;
window.excluirCaixa = excluirCaixa;
window.abrirModalCaixa = abrirModalCaixa;
window.editarCaixa = editarCaixa;
window.filtrarCaixa = filtrarCaixa;

window.salvarServico = salvarServico;
window.excluirServico = excluirServico;
window.abrirModalServico = abrirModalServico;
window.editarServico = editarServico;
window.calcularRepasse = calcularRepasse;
window.filtrarServicos = filtrarServicos;
window.limparFiltrosServicos = limparFiltrosServicos;

window.salvarAgenda = salvarAgenda;
window.excluirAgenda = excluirAgenda;
window.abrirModalAgendamento = abrirModalAgendamento;
window.editarAgenda = editarAgenda;
window.confirmarAgendamento = confirmarAgendamento;
window.filtrarAgenda = filtrarAgenda;
window.limparFiltrosAgenda = limparFiltrosAgenda;
window.filtrarAgendaHoje = filtrarAgendaHoje;

window.salvarPiercing = salvarPiercing;
window.excluirPiercing = excluirPiercing;
window.abrirModalPiercing = abrirModalPiercing;
window.editarPiercing = editarPiercing;
window.registrarVendaPiercing = registrarVendaPiercing;

window.salvarMaterial = salvarMaterial;
window.excluirMaterial = excluirMaterial;
window.abrirModalMaterial = abrirModalMaterial;
window.editarMaterial = editarMaterial;
window.registrarUsoMaterial = registrarUsoMaterial;

window.exportarBackup = exportarBackup;
window.importarBackup = importarBackup;
window.sincronizarAgora = () => location.reload();

// Carregamento inicial
document.addEventListener('DOMContentLoaded', async () => {
    await testarConexao(supabase);
    await Promise.all([
        carregarCaixa(),
        carregarServicos(),
        carregarAgenda(),
        carregarPiercings(),
        carregarVendasPiercing(),
        carregarMateriais(),
        carregarUsosMateriais()
    ]);
    atualizarDashboard();
    carregarRelatorios();
    initNavigation();
    
    // Recarregar dados quando mudar de aba
    window.addEventListener('sectionChange', (e) => {
        if(e.detail.section === 'dashboard') atualizarDashboard();
        if(e.detail.section === 'relatorios') carregarRelatorios();
        if(e.detail.section === 'caixa') carregarCaixa();
        if(e.detail.section === 'servicos') carregarServicos();
        if(e.detail.section === 'agenda') carregarAgenda();
        if(e.detail.section === 'piercing') { carregarPiercings(); carregarVendasPiercing(); }
        if(e.detail.section === 'materiais') { carregarMateriais(); carregarUsosMateriais(); }
    });
});
