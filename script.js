// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
let currentUser = null;

// Inicializa cliente Supabase
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou.');
}

// ==================== ELEMENTOS DOM ====================
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const authMessageDiv = document.getElementById('auth-message');

// ==================== FUNÇÕES DE AUTENTICAÇÃO ====================
function showAuthMessage(message, isError = true) {
    authMessageDiv.textContent = message;
    authMessageDiv.className = `auth-message ${isError ? 'auth-error' : 'auth-success'}`;
    setTimeout(() => {
        authMessageDiv.textContent = '';
        authMessageDiv.className = 'auth-message';
    }, 4000);
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showAuthMessage('Preencha email e senha');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        showAuthMessage('Login realizado com sucesso!', false);
        await afterLoginSuccess();
    } catch (error) {
        showAuthMessage('Erro ao entrar: ' + error.message);
    }
}

async function handleRegister() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (!email || !password) {
        showAuthMessage('Preencha email e senha');
        return;
    }
    if (password.length < 6) {
        showAuthMessage('A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
            showAuthMessage('Conta criada! Faça login para continuar.', false);
            // Alterna para aba de login
            document.getElementById('tab-login').click();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
        } else {
            showAuthMessage('Erro ao criar conta. Tente novamente.');
        }
    } catch (error) {
        showAuthMessage('Erro ao criar conta: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        authContainer.style.display = 'flex';
        mainContainer.style.display = 'none';
        showAuthMessage('Você saiu do sistema.', false);
    } catch (error) {
        console.error('Erro ao sair:', error);
    }
}

async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            await afterLoginSuccess();
        } else {
            // Mostra tela de login
            authContainer.style.display = 'flex';
            mainContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        authContainer.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
}

async function afterLoginSuccess() {
    authContainer.style.display = 'none';
    mainContainer.style.display = 'block';
    
    // Carrega todos os dados do sistema
    await carregarDadosIniciais();
    
    // Atualiza status da conexão
    const statusEl = document.getElementById('status-nuvem');
    if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Conectado como ${currentUser.email}`;
        statusEl.className = 'status-badge status-connected';
    }
}

// ==================== DADOS (carregamento após login) ====================
async function carregarDadosIniciais() {
    await testarConexao();
    await carregarCaixa();
    await carregarServicos();
    await carregarAgenda();
    await carregarPiercings();
    await carregarVendasPiercing();
    await carregarMateriais();
    await carregarUsosMateriais();
    atualizarDashboard();
    await carregarRelatorios();
}

// ==================== HELPERS ====================
function formatMoney(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v||0); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
function formatDateTime(d) { if(!d)return '-'; const dt=new Date(d); return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function showAlert(msg,type) { 
    const a=document.createElement('div'); a.className=`alert alert-${type}`; 
    a.innerHTML=`<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`; 
    a.style.display='block'; document.getElementById('alert-container').appendChild(a); 
    setTimeout(()=>a.remove(),4500);
}

async function testarConexao() {
    if (!supabaseClient) {
        document.getElementById('status-nuvem').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Cliente Supabase não inicializado';
        return false;
    }
    const statusEl = document.getElementById('status-nuvem');
    try {
        const { error } = await supabaseClient.from('caixa').select('id').limit(1);
        if (error) throw error;
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Conectado ao Supabase';
        statusEl.className = 'status-badge status-connected';
        return true;
    } catch (err) {
        console.error('Erro de conexão:', err);
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Falha na conexão';
        statusEl.className = 'status-badge status-error';
        showAlert('Erro ao conectar com Supabase: ' + err.message, 'error');
        return false;
    }
}

// ==================== CRUD (mesmo código original, apenas removendo duplicatas) ====================
// [INSIRA AQUI TODAS AS FUNÇÕES ORIGINAIS: carregarCaixa, carregarServicos, etc.]
// Como o arquivo é extenso, mantenha todas as funções que você já tinha (renderizarCaixa, renderizarServicos, etc.)
// E também os CRUDs (abrirModalCaixa, salvarCaixa, editarCaixa, excluirCaixa, etc.)
// E também os populares (popularPiercingsExemplo, popularMateriaisExemplo)

// ATENÇÃO: Para evitar duplicação, copie todo o conteúdo do seu script.js original (a partir de "// ==================== DATA LOADING ====================")
// e cole aqui, substituindo apenas as partes de inicialização (DOMContentLoaded).
// Porém, remova o event listener antigo do DOMContentLoaded e substitua pelo abaixo:

// ==================== INICIALIZAÇÃO ====================
function setupAuthTabs() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginPanel = document.getElementById('login-form');
    const registerPanel = document.getElementById('register-form');
    
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginPanel.classList.add('active');
        registerPanel.classList.remove('active');
    });
    
    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerPanel.classList.add('active');
        loginPanel.classList.remove('active');
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        showAlert('Supabase não disponível. Verifique sua conexão.', 'error');
        return;
    }
    
    // Configura listeners de autenticação
    setupAuthTabs();
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // Verifica se já existe sessão ativa
    await checkSession();
});