// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
let currentUser = null;

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
    const statusEl = document.getElementById('status-nuvem');
    if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Conectado como ${currentUser.email}`;
        statusEl.className = 'status-badge status-connected';
    }
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
    await carregarRelatorios();
}

// ==================== DADOS & HELPERS ====================
let currentData = { servicos: [], agenda: [], caixa: [] };
let chartFaturamento = null, chartTipos = null;

function formatMoney(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v||0); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
function formatDateTime(d) { if(!d)return '-'; const dt=new Date(d); return dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}
function showAlert(msg,type) { 
    const a=document.createElement('div'); a.className=`alert alert-${type}`; 
    a.innerHTML=`<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`; 
    a.style.display='block'; document.getElementById('alert-container').appendChild(a); 
    setTimeout(()=>a.remove(),4500);
}

// ==================== LOAD DATA ====================
async function carregarCaixa() { 
    try {
        const {data, error} = await supabaseClient.from('caixa').select('*').order('data',{ascending:false});
        if (error) throw error;
        currentData.caixa = data || [];
        renderizarCaixa(currentData.caixa);
    } catch(e) { showAlert('Erro ao carregar caixa: '+e.message, 'error'); }
}
async function carregarServicos() { 
    try {
        const {data, error} = await supabaseClient.from('servicos').select('*').order('data',{ascending:false});
        if (error) throw error;
        currentData.servicos = data || [];
        renderizarServicos(currentData.servicos);
    } catch(e) { showAlert('Erro ao carregar serviços: '+e.message, 'error'); }
}
async function carregarAgenda() { 
    try {
        const {data, error} = await supabaseClient.from('agenda').select('*').order('data_hora');
        if (error) throw error;
        currentData.agenda = data || [];
        renderizarAgenda(currentData.agenda);
    } catch(e) { showAlert('Erro ao carregar agenda: '+e.message, 'error'); }
}
async function carregarPiercings() { 
    try {
        const {data, error} = await supabaseClient.from('piercings_estoque').select('*').order('nome');
        if (error) throw error;
        renderizarEstoquePiercing(data || []);
    } catch(e) { showAlert('Erro ao carregar piercings: '+e.message, 'error'); }
}
async function carregarVendasPiercing() { 
    try {
        const {data, error} = await supabaseClient.from('vendas_piercing').select('*, piercing:piercings_estoque(nome)').order('data',{ascending:false});
        if (error) throw error;
        renderizarVendasPiercing(data || []);
    } catch(e) { showAlert('Erro ao carregar vendas: '+e.message, 'error'); }
}
async function carregarMateriais() { 
    try {
        const {data, error} = await supabaseClient.from('materiais_estoque').select('*').order('nome');
        if (error) throw error;
        renderizarEstoqueMaterial(data || []);
    } catch(e) { showAlert('Erro ao carregar materiais: '+e.message, 'error'); }
}
async function carregarUsosMateriais() { 
    try {
        const {data, error} = await supabaseClient.from('usos_materiais').select('*, material:materiais_estoque(nome)').order('data',{ascending:false});
        if (error) throw error;
        renderizarUsosMateriais(data || []);
    } catch(e) { showAlert('Erro ao carregar usos: '+e.message, 'error'); }
}

// ==================== RENDER FUNCTIONS ====================
function renderizarCaixa(data){
    let totalE=0,totalS=0; const tbody=document.getElementById('caixa-tbody'); tbody.innerHTML='';
    if(data.length===0) tbody.innerHTML='<tr><td colspan="7">Nenhum lançamento</td></tr>';
    else data.forEach(l=>{ const ent=+l.entradas||0, sai=+l.saidas||0; totalE+=ent; totalS+=sai; tbody.innerHTML+=`
        <tr>
            <td>${formatDate(l.data)}</td>
            <td>${formatMoney(l.saldo_inicial)}</td>
            <td style="color:#34D399">+${formatMoney(ent)}</td>
            <td style="color:#F87171">-${formatMoney(sai)}</td>
            <td>${formatMoney(l.saldo_final)}</td>
            <td>${l.descricao||'-'}</td>
            <td><button class="btn btn-warning btn-sm" onclick="editarCaixa('${l.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirCaixa('${l.id}')">Excluir</button></td>
        </tr>
    `; });
    document.getElementById('caixa-total-entradas').innerText=formatMoney(totalE);
    document.getElementById('caixa-total-saidas').innerText=formatMoney(totalS);
    const ultimoSaldo = data.length ? data[0].saldo_final : 0;
    document.getElementById('caixa-saldo-final').innerText=formatMoney(ultimoSaldo);
}
function renderizarServicos(data){
    let totalV=0,totalE=0,totalR=0; const tbody=document.getElementById('servicos-tbody'); tbody.innerHTML='';
    data.forEach(s=>{ const val=+s.valor_total||0; const estudio = s.tatuador_nome==='Thalia'?val*0.3:0; const repasse = s.tatuador_nome==='Thalia'?val*0.7:val; totalV+=val; totalE+=estudio; totalR+=repasse; tbody.innerHTML+=`
        <tr>
            <td>${formatDate(s.data)}</td>
            <td>${s.cliente}</td>
            <td>${s.tatuador_nome}</td>
            <td>${s.tipo}</td>
            <td>${s.descricao||'-'}</td>
            <td>${formatMoney(val)}</td>
            <td>${formatMoney(estudio)}</td>
            <td style="color:#34D399">${formatMoney(repasse)}</td>
            <td>${s.forma_pagamento}</td>
            <td><button class="btn btn-warning btn-sm" onclick="editarServico('${s.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirServico('${s.id}')">Excluir</button></td>
        </tr>
    `; });
    document.getElementById('servicos-total-valor').innerText=formatMoney(totalV);
    document.getElementById('servicos-total-estudio').innerText=formatMoney(totalE);
    document.getElementById('servicos-total-repasse').innerText=formatMoney(totalR);
}
function renderizarAgenda(data){
    const tbody=document.getElementById('agenda-tbody'); tbody.innerHTML='';
    if(data.length===0) tbody.innerHTML='<tr><td colspan="8">Nenhum agendamento</td></tr>';
    else data.forEach(a=>{ const statusClass={Agendado:'status-warning',Confirmado:'status-info',Concluído:'status-success',Cancelado:'status-danger'}[a.status]; let confirmBtn = (a.status === 'Agendado') ? `<button class="btn btn-success btn-sm" onclick="confirmarAgendamento('${a.id}')"><i class="fas fa-check"></i> Confirmar</button> ` : ''; tbody.innerHTML+=`
        <tr>
            <td>${formatDateTime(a.data_hora)}</td>
            <td>${a.cliente}</td>
            <td>${a.tatuador_nome}</td>
            <td>${a.tipo_servico}</td>
            <td>${formatMoney(a.valor_estimado)}</td>
            <td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
            <td>${a.observacoes||'-'}</td>
            <td>${confirmBtn}<button class="btn btn-warning btn-sm" onclick="editarAgenda('${a.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirAgenda('${a.id}')">Excluir</button></td>
        </tr>
    `; });
}
function renderizarEstoquePiercing(piercings) {
    let html=''; piercings.forEach(p=>{ html+=`<tr><td>${p.nome}</td><td>${p.quantidade}</td><td>${formatMoney(p.preco_venda)}</td><td><button class="btn btn-warning btn-sm" onclick="editarPiercing(${p.id})">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirPiercing(${p.id})">Excluir</button></td></tr>`; });
    document.getElementById('estoque-piercing-tbody').innerHTML=html||'<tr><td colspan="4">Nenhum piercing</td></tr>';
    let opts='<option value="">Selecione</option>'; piercings.forEach(p=>{ if(p.quantidade>0) opts+=`<option value="${p.id}" data-preco="${p.preco_venda}">${p.nome} - ${formatMoney(p.preco_venda)} (Estoque: ${p.quantidade})</option>`; });
    document.getElementById('venda-piercing-id').innerHTML=opts;
}
function renderizarVendasPiercing(vendas) {
    let html=''; vendas.forEach(v=>{ html+=`<tr><td>${formatDate(v.data)}</td><td>${v.piercing?.nome||'?'}</td><td>${v.quantidade}</td><td>${formatMoney(v.valor_total)}</td><td>${v.cliente||'-'}</td></tr>`; });
    document.getElementById('vendas-piercing-tbody').innerHTML=html||'<tr><td colspan="5">Nenhuma venda</td></tr>';
}
function renderizarEstoqueMaterial(materiais) {
    let html=''; materiais.forEach(m=>{ html+=`<tr><td>${m.nome}</td><td>${m.quantidade}</td><td>${formatMoney(m.valor_unitario)}</td><td><button class="btn btn-warning btn-sm" onclick="editarMaterial(${m.id})">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirMaterial(${m.id})">Excluir</button></td></tr>`; });
    document.getElementById('estoque-material-tbody').innerHTML=html||'<tr><td colspan="4">Nenhum material</td></tr>';
    let opts='<option value="">Selecione</option>'; materiais.forEach(m=>{ if(m.quantidade>0) opts+=`<option value="${m.id}">${m.nome} (${m.quantidade} un.)</option>`; });
    document.getElementById('uso-material-id').innerHTML=opts;
}
function renderizarUsosMateriais(usos) {
    let html=''; usos.forEach(u=>{ html+=`<tr><td>${formatDate(u.data)}</td><td>${u.material?.nome||'?'}</td><td>${u.quantidade}</td><td>${u.observacao||'-'}</td></tr>`; });
    document.getElementById('usos-materiais-tbody').innerHTML=html||'<tr><td colspan="4">Nenhum uso</td></tr>';
}

// ==================== DASHBOARD & CHARTS ====================
function atualizarDashboard(){
    const totalEnt=currentData.caixa.reduce((s,i)=>s+(+i.entradas||0),0);
    const totalSai=currentData.caixa.reduce((s,i)=>s+(+i.saidas||0),0);
    const saldo=currentData.caixa[0]?.saldo_final||0;
    document.getElementById('saldo-atual').innerText=formatMoney(saldo);
    document.getElementById('total-entradas').innerText=formatMoney(totalEnt);
    document.getElementById('total-saidas').innerText=formatMoney(totalSai);
    document.getElementById('servicos-realizados').innerText=currentData.servicos.length;
    const repasseThalia = currentData.servicos.reduce((s,sv)=> s + (sv.tatuador_nome==='Thalia'?(+sv.valor_total||0)*0.7:0),0);
    document.getElementById('repasse-thalia').innerText=formatMoney(repasseThalia);
    
    const recentes=currentData.servicos.slice(0,5);
    document.getElementById('servicos-recentes').innerHTML=recentes.length?`<ul>${recentes.map(s=>`<li>${formatDate(s.data)} - ${s.cliente}: ${formatMoney(s.valor_total)}</li>`).join('')}</ul>`:'Nenhum';
    const prox=currentData.agenda.filter(a=>new Date(a.data_hora)>=new Date()&&a.status!=='Cancelado').slice(0,5);
    document.getElementById('proximos-agendamentos').innerHTML=prox.length?`<ul>${prox.map(a=>`<li>${formatDateTime(a.data_hora)} - ${a.cliente}</li>`).join('')}</ul>`:'Nenhum';
    
    if(chartFaturamento)chartFaturamento.destroy();
    const meses=[],valores=[];
    for(let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); meses.push(d.toLocaleDateString('pt-BR',{month:'short'})); const soma=currentData.servicos.filter(s=>new Date(s.data).getMonth()===d.getMonth()&&new Date(s.data).getFullYear()===d.getFullYear()).reduce((s,sv)=>s+(+sv.valor_total||0),0); valores.push(soma); }
    const ctx=document.getElementById('chart-faturamento').getContext('2d');
    chartFaturamento=new Chart(ctx,{type:'bar',data:{labels:meses,datasets:[{label:'Faturamento',data:valores,backgroundColor:'#818CF8'}]}});
    if(chartTipos)chartTipos.destroy();
    const tatuagens=currentData.servicos.filter(s=>s.tipo==='Tatuagem').length;
    const piercingsServ=currentData.servicos.filter(s=>s.tipo==='Piercing').length;
    chartTipos=new Chart(document.getElementById('chart-tipos').getContext('2d'),{type:'doughnut',data:{labels:['Tatuagens','Piercings'],datasets:[{data:[tatuagens,piercingsServ],backgroundColor:['#818CF8','#C084FC']}]}});
}
async function carregarRelatorios(){
    const fat={}; currentData.servicos.forEach(s=>{fat[s.tatuador_nome]=(fat[s.tatuador_nome]||0)+(+s.valor_total||0);});
    document.getElementById('faturamento-tatuador').innerHTML=Object.entries(fat).map(([k,v])=>`<div><strong>${k}:</strong> ${formatMoney(v)}</div>`).join('')||'Sem dados';
    const totalRepThalia = currentData.servicos.reduce((s,sv)=> s + (sv.tatuador_nome==='Thalia'?(+sv.valor_total||0)*0.7:0),0);
    document.getElementById('relatorio-repasse').innerHTML=`<strong>Total a repassar para Thalia:</strong> ${formatMoney(totalRepThalia)}`;
    const estudioThalia = currentData.servicos.reduce((s,sv)=> s + (sv.tatuador_nome==='Thalia'?(+sv.valor_total||0)*0.3:0),0);
    const totalSaidas = currentData.caixa.reduce((s,c)=>s+(+c.saidas||0),0);
    const lucroLiq = estudioThalia - totalSaidas;
    document.getElementById('relatorio-lucro-liquido').innerHTML=`<strong>Lucro Líquido (Estúdio):</strong> ${formatMoney(lucroLiq)}`;
}

// ==================== CRUD: CAIXA ====================
window.abrirModalCaixa = async () => {
    const { data } = await supabaseClient.from('caixa').select('saldo_final').order('data', { ascending: false }).limit(1);
    const ultimoSaldo = data?.length ? data[0].saldo_final : 0;
    document.getElementById('caixa-id').value = '';
    document.getElementById('caixa-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('caixa-saldo-inicial').value = ultimoSaldo;
    document.getElementById('caixa-entradas').value = 0;
    document.getElementById('caixa-saidas').value = 0;
    document.getElementById('caixa-descricao').value = '';
    document.getElementById('modal-caixa').style.display = 'block';
};
window.salvarCaixa = async () => {
    const id = document.getElementById('caixa-id').value;
    const data = {
        data: document.getElementById('caixa-data').value,
        saldo_inicial: parseFloat(document.getElementById('caixa-saldo-inicial').value) || 0,
        entradas: parseFloat(document.getElementById('caixa-entradas').value) || 0,
        saidas: parseFloat(document.getElementById('caixa-saidas').value) || 0,
        descricao: document.getElementById('caixa-descricao').value
    };
    if (!data.data) return showAlert('Data é obrigatória', 'error');
    data.saldo_final = data.saldo_inicial + data.entradas - data.saidas;
    try {
        let error;
        if (id) error = (await supabaseClient.from('caixa').update(data).eq('id', id)).error;
        else error = (await supabaseClient.from('caixa').insert([data])).error;
        if (error) throw error;
        fecharModal('modal-caixa');
        await carregarCaixa();
        atualizarDashboard();
        showAlert(id ? 'Atualizado' : 'Salvo', 'success');
    } catch (e) {
        showAlert('Erro ao salvar: ' + e.message, 'error');
    }
};
window.editarCaixa = async (id) => {
    const item = currentData.caixa.find(c => c.id === id);
    if (!item) return showAlert('Lançamento não encontrado', 'error');
    document.getElementById('caixa-id').value = item.id;
    document.getElementById('caixa-data').value = item.data;
    document.getElementById('caixa-saldo-inicial').value = item.saldo_inicial;
    document.getElementById('caixa-entradas').value = item.entradas;
    document.getElementById('caixa-saidas').value = item.saidas;
    document.getElementById('caixa-descricao').value = item.descricao || '';
    document.getElementById('modal-caixa').style.display = 'block';
};
window.excluirCaixa = async (id) => {
    if (confirm('Excluir?')) {
        try {
            await supabaseClient.from('caixa').delete().eq('id', id);
            await carregarCaixa();
            atualizarDashboard();
            showAlert('Excluído', 'success');
        } catch (e) { showAlert('Erro ao excluir', 'error'); }
    }
};
window.filtrarCaixa = () => {
    const search = document.getElementById('search-caixa').value.toLowerCase();
    const filtered = currentData.caixa.filter(i => (i.descricao || '').toLowerCase().includes(search));
    renderizarCaixa(filtered);
};

// ==================== CRUD: SERVIÇOS ====================
window.abrirModalServico = () => {
    document.getElementById('servico-id').value = '';
    document.getElementById('servico-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('servico-cliente').value = '';
    document.getElementById('servico-valor').value = '';
    document.getElementById('modal-servico').style.display = 'block';
    calcularRepasse();
};
window.calcularRepasse = () => {
    const val = +document.getElementById('servico-valor').value || 0;
    const tatuador = document.getElementById('servico-tatuador').value;
    const estudio = tatuador === 'Thalia' ? val * 0.3 : 0;
    const repasse = tatuador === 'Thalia' ? val * 0.7 : val;
    document.getElementById('valor-estudio').innerText = formatMoney(estudio);
    document.getElementById('valor-repasse').innerText = formatMoney(repasse);
};
window.salvarServico = async () => {
    const id = document.getElementById('servico-id').value;
    const data = {
        data: document.getElementById('servico-data').value,
        cliente: document.getElementById('servico-cliente').value,
        tatuador_nome: document.getElementById('servico-tatuador').value,
        tipo: document.getElementById('servico-tipo').value,
        descricao: document.getElementById('servico-descricao').value,
        valor_total: +document.getElementById('servico-valor').value || 0,
        forma_pagamento: document.getElementById('servico-pagamento').value
    };
    if (!data.data || !data.cliente) return showAlert('Data e cliente são obrigatórios', 'error');
    try {
        let error;
        if (id) error = (await supabaseClient.from('servicos').update(data).eq('id', id)).error;
        else error = (await supabaseClient.from('servicos').insert([data])).error;
        if (error) throw error;
        fecharModal('modal-servico');
        await carregarServicos();
        atualizarDashboard();
        showAlert(id ? 'Atualizado' : 'Salvo', 'success');
    } catch (e) {
        showAlert('Erro ao salvar serviço: ' + e.message, 'error');
    }
};
window.editarServico = async (id) => {
    const item = currentData.servicos.find(s => s.id === id);
    if (!item) return showAlert('Serviço não encontrado', 'error');
    document.getElementById('servico-id').value = item.id;
    document.getElementById('servico-data').value = item.data;
    document.getElementById('servico-cliente').value = item.cliente;
    document.getElementById('servico-tatuador').value = item.tatuador_nome;
    document.getElementById('servico-tipo').value = item.tipo;
    document.getElementById('servico-descricao').value = item.descricao || '';
    document.getElementById('servico-valor').value = item.valor_total;
    document.getElementById('servico-pagamento').value = item.forma_pagamento;
    document.getElementById('modal-servico').style.display = 'block';
    calcularRepasse();
};
window.excluirServico = async (id) => {
    if (confirm('Excluir serviço?')) {
        try {
            await supabaseClient.from('servicos').delete().eq('id', id);
            await carregarServicos();
            atualizarDashboard();
            showAlert('Serviço excluído', 'success');
        } catch (e) { showAlert('Erro ao excluir', 'error'); }
    }
};
window.filtrarServicos = () => {
    let f = [...currentData.servicos];
    const t = document.getElementById('filtro-tatuador-servico').value;
    if (t) f = f.filter(s => s.tatuador_nome === t);
    const tp = document.getElementById('filtro-tipo-servico').value;
    if (tp) f = f.filter(s => s.tipo === tp);
    const pg = document.getElementById('filtro-pagamento').value;
    if (pg) f = f.filter(s => s.forma_pagamento === pg);
    const dt = document.getElementById('filtro-data-servico').value;
    if (dt) f = f.filter(s => s.data === dt);
    const src = document.getElementById('search-servicos').value.toLowerCase();
    if (src) f = f.filter(s => s.cliente.toLowerCase().includes(src) || (s.descricao || '').toLowerCase().includes(src));
    renderizarServicos(f);
};
window.limparFiltrosServicos = () => {
    document.getElementById('filtro-tatuador-servico').value = '';
    document.getElementById('filtro-tipo-servico').value = '';
    document.getElementById('filtro-pagamento').value = '';
    document.getElementById('filtro-data-servico').value = '';
    document.getElementById('search-servicos').value = '';
    renderizarServicos(currentData.servicos);
};

// ==================== CRUD: AGENDA ====================
window.abrirModalAgendamento = () => {
    document.getElementById('agenda-id').value = '';
    document.getElementById('agenda-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('agenda-horario').value = '10:00';
    document.getElementById('modal-agenda').style.display = 'block';
};
window.salvarAgenda = async () => {
    const id = document.getElementById('agenda-id').value;
    const dataHora = `${document.getElementById('agenda-data').value} ${document.getElementById('agenda-horario').value}`;
    const data = {
        data_hora: dataHora,
        cliente: document.getElementById('agenda-cliente').value,
        tatuador_nome: document.getElementById('agenda-tatuador').value,
        tipo_servico: document.getElementById('agenda-tipo').value,
        valor_estimado: +document.getElementById('agenda-valor').value || 0,
        status: document.getElementById('agenda-status').value,
        observacoes: document.getElementById('agenda-obs').value
    };
    if (!data.data_hora || !data.cliente) return showAlert('Data/hora e cliente são obrigatórios', 'error');
    try {
        let error;
        if (id) error = (await supabaseClient.from('agenda').update(data).eq('id', id)).error;
        else error = (await supabaseClient.from('agenda').insert([data])).error;
        if (error) throw error;
        fecharModal('modal-agenda');
        await carregarAgenda();
        atualizarDashboard();
        showAlert(id ? 'Atualizado' : 'Salvo', 'success');
    } catch (e) {
        showAlert('Erro ao salvar agenda: ' + e.message, 'error');
    }
};
window.editarAgenda = async (id) => {
    const item = currentData.agenda.find(a => a.id === id);
    if (!item) return showAlert('Agendamento não encontrado', 'error');
    document.getElementById('agenda-id').value = item.id;
    const dt = new Date(item.data_hora);
    document.getElementById('agenda-data').value = dt.toISOString().split('T')[0];
    document.getElementById('agenda-horario').value = dt.toTimeString().slice(0, 5);
    document.getElementById('agenda-cliente').value = item.cliente;
    document.getElementById('agenda-tatuador').value = item.tatuador_nome;
    document.getElementById('agenda-tipo').value = item.tipo_servico;
    document.getElementById('agenda-valor').value = item.valor_estimado;
    document.getElementById('agenda-status').value = item.status;
    document.getElementById('agenda-obs').value = item.observacoes || '';
    document.getElementById('modal-agenda').style.display = 'block';
};
window.excluirAgenda = async (id) => {
    if (confirm('Excluir agendamento?')) {
        try {
            await supabaseClient.from('agenda').delete().eq('id', id);
            await carregarAgenda();
            atualizarDashboard();
            showAlert('Agendamento excluído', 'success');
        } catch (e) { showAlert('Erro ao excluir', 'error'); }
    }
};
window.confirmarAgendamento = async (id) => {
    if (confirm('Confirmar este agendamento?')) {
        try {
            await supabaseClient.from('agenda').update({ status: 'Confirmado' }).eq('id', id);
            await carregarAgenda();
            atualizarDashboard();
            showAlert('Status alterado para Confirmado', 'success');
        } catch (e) { showAlert('Erro ao confirmar', 'error'); }
    }
};
window.filtrarAgenda = () => {
    let filtered = [...currentData.agenda];
    const tat = document.getElementById('filtro-tatuador-agenda').value;
    const stat = document.getElementById('filtro-status-agenda').value;
    const data = document.getElementById('filtro-data-agenda').value;
    if (tat) filtered = filtered.filter(a => a.tatuador_nome === tat);
    if (stat) filtered = filtered.filter(a => a.status === stat);
    if (data) filtered = filtered.filter(a => a.data_hora.split('T')[0] === data);
    renderizarAgenda(filtered);
};
window.filtrarAgendaHoje = () => {
    document.getElementById('filtro-data-agenda').valueAsDate = new Date();
    filtrarAgenda();
};
window.limparFiltrosAgenda = () => {
    document.getElementById('filtro-tatuador-agenda').value = '';
    document.getElementById('filtro-status-agenda').value = '';
    document.getElementById('filtro-data-agenda').value = '';
    renderizarAgenda(currentData.agenda);
};

// ==================== PIERCING ====================
window.abrirModalPiercing = (id = null) => {
    document.getElementById('piercing-id').value = '';
    document.getElementById('piercing-nome').value = '';
    document.getElementById('piercing-qtd').value = '';
    document.getElementById('piercing-preco').value = '';
    if (id) {
        supabaseClient.from('piercings_estoque').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('piercing-id').value = data.id;
                document.getElementById('piercing-nome').value = data.nome;
                document.getElementById('piercing-qtd').value = data.quantidade;
                document.getElementById('piercing-preco').value = data.preco_venda;
                document.getElementById('modal-piercing').style.display = 'block';
            }
        }).catch(e => showAlert('Erro ao carregar piercing', 'error'));
    } else document.getElementById('modal-piercing').style.display = 'block';
};
window.salvarPiercing = async () => {
    const id = document.getElementById('piercing-id').value;
    const nome = document.getElementById('piercing-nome').value;
    const quantidade = parseInt(document.getElementById('piercing-qtd').value) || 0;
    const preco_venda = parseFloat(document.getElementById('piercing-preco').value) || 0;
    if (!nome) return showAlert('Nome obrigatório', 'error');
    try {
        if (id) await supabaseClient.from('piercings_estoque').update({ nome, quantidade, preco_venda }).eq('id', id);
        else await supabaseClient.from('piercings_estoque').insert([{ nome, quantidade, preco_venda }]);
        fecharModal('modal-piercing');
        await carregarPiercings();
        await carregarVendasPiercing();
        showAlert('Piercing salvo', 'success');
    } catch (e) { showAlert('Erro ao salvar piercing', 'error'); }
};
window.editarPiercing = (id) => window.abrirModalPiercing(id);
window.excluirPiercing = async (id) => {
    if (confirm('Excluir piercing?')) {
        try {
            await supabaseClient.from('piercings_estoque').delete().eq('id', id);
            await carregarPiercings();
            await carregarVendasPiercing();
            showAlert('Excluído', 'success');
        } catch (e) { showAlert('Erro ao excluir', 'error'); }
    }
};
window.registrarVendaPiercing = async () => {
    const piercingId = document.getElementById('venda-piercing-id').value;
    const qtd = parseInt(document.getElementById('venda-qtd').value);
    const cliente = document.getElementById('venda-cliente').value;
    if (!piercingId) return showAlert('Selecione um piercing', 'error');
    try {
        const { data: piercing, error: fetchError } = await supabaseClient.from('piercings_estoque').select('*').eq('id', piercingId).single();
        if (fetchError) throw fetchError;
        if (!piercing || piercing.quantidade < qtd) return showAlert('Estoque insuficiente', 'error');
        if (qtd <= 0) return showAlert('Quantidade deve ser maior que zero', 'error');
        const valorTotal = qtd * piercing.preco_venda;
        const { error: upd } = await supabaseClient.from('piercings_estoque').update({ quantidade: piercing.quantidade - qtd }).eq('id', piercingId);
        if (upd) throw upd;
        await supabaseClient.from('vendas_piercing').insert([{ piercing_id: piercingId, quantidade: qtd, valor_total: valorTotal, cliente: cliente || null }]);
        await carregarPiercings();
        await carregarVendasPiercing();
        document.getElementById('venda-qtd').value = 1;
        document.getElementById('venda-cliente').value = '';
        showAlert(`Venda registrada: ${formatMoney(valorTotal)}`, 'success');
    } catch (e) { showAlert('Erro na venda: ' + e.message, 'error'); }
};

// ==================== MATERIAIS ====================
window.abrirModalMaterial = (id = null) => {
    document.getElementById('material-id').value = '';
    document.getElementById('material-nome').value = '';
    document.getElementById('material-qtd').value = '';
    document.getElementById('material-preco').value = '';
    if (id) {
        supabaseClient.from('materiais_estoque').select('*').eq('id', id).single().then(({ data }) => {
            if (data) {
                document.getElementById('material-id').value = data.id;
                document.getElementById('material-nome').value = data.nome;
                document.getElementById('material-qtd').value = data.quantidade;
                document.getElementById('material-preco').value = data.valor_unitario;
                document.getElementById('modal-material').style.display = 'block';
            }
        }).catch(e => showAlert('Erro ao carregar material', 'error'));
    } else document.getElementById('modal-material').style.display = 'block';
};
window.salvarMaterial = async () => {
    const id = document.getElementById('material-id').value;
    const nome = document.getElementById('material-nome').value;
    const quantidade = parseInt(document.getElementById('material-qtd').value) || 0;
    const valor_unitario = parseFloat(document.getElementById('material-preco').value) || 0;
    if (!nome) return showAlert('Nome obrigatório', 'error');
    try {
        if (id) await supabaseClient.from('materiais_estoque').update({ nome, quantidade, valor_unitario }).eq('id', id);
        else await supabaseClient.from('materiais_estoque').insert([{ nome, quantidade, valor_unitario }]);
        fecharModal('modal-material');
        await carregarMateriais();
        await carregarUsosMateriais();
        showAlert('Material salvo', 'success');
    } catch (e) { showAlert('Erro ao salvar material', 'error'); }
};
window.editarMaterial = (id) => window.abrirModalMaterial(id);
window.excluirMaterial = async (id) => {
    if (confirm('Excluir material?')) {
        try {
            await supabaseClient.from('materiais_estoque').delete().eq('id', id);
            await carregarMateriais();
            await carregarUsosMateriais();
            showAlert('Excluído', 'success');
        } catch (e) { showAlert('Erro ao excluir', 'error'); }
    }
};
window.registrarUsoMaterial = async () => {
    const materialId = document.getElementById('uso-material-id').value;
    const qtd = parseInt(document.getElementById('uso-qtd').value);
    const obs = document.getElementById('uso-obs').value;
    if (!materialId) return showAlert('Selecione um material', 'error');
    try {
        const { data: material, error: fetchError } = await supabaseClient.from('materiais_estoque').select('*').eq('id', materialId).single();
        if (fetchError) throw fetchError;
        if (!material || material.quantidade < qtd) return showAlert('Quantidade insuficiente', 'error');
        if (qtd <= 0) return showAlert('Quantidade deve ser maior que zero', 'error');
        const { error: upd } = await supabaseClient.from('materiais_estoque').update({ quantidade: material.quantidade - qtd }).eq('id', materialId);
        if (upd) throw upd;
        await supabaseClient.from('usos_materiais').insert([{ material_id: materialId, quantidade: qtd, observacao: obs || null }]);
        await carregarMateriais();
        await carregarUsosMateriais();
        document.getElementById('uso-qtd').value = 1;
        document.getElementById('uso-obs').value = '';
        showAlert(`Uso de ${qtd} unidade(s) de ${material.nome} registrado`, 'success');
    } catch (e) { showAlert('Erro ao registrar uso: ' + e.message, 'error'); }
};

// ==================== BACKUP ====================
window.exportarBackup = async () => {
    try {
        const { data: servicos } = await supabaseClient.from('servicos').select('*');
        const { data: agenda } = await supabaseClient.from('agenda').select('*');
        const { data: caixa } = await supabaseClient.from('caixa').select('*');
        const { data: piercings } = await supabaseClient.from('piercings_estoque').select('*');
        const { data: vendas } = await supabaseClient.from('vendas_piercing').select('*');
        const { data: materiais } = await supabaseClient.from('materiais_estoque').select('*');
        const { data: usos } = await supabaseClient.from('usos_materiais').select('*');
        const backup = { data_exportacao: new Date().toISOString(), servicos, agenda, caixa, piercings, vendas, materiais, usos };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup-dark013-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showAlert('Backup exportado', 'success');
    } catch (e) { showAlert('Erro ao exportar backup', 'error'); }
};
window.importarBackup = async (input) => {
    const file = input.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.servicos && !backup.agenda && !backup.caixa) throw new Error('Arquivo inválido');
        if (confirm(`Importar backup de ${backup.data_exportacao}? Isso pode duplicar dados.`)) {
            for (const s of backup.servicos || []) { const { id, ...rest } = s; await supabaseClient.from('servicos').insert([rest]); }
            for (const a of backup.agenda || []) { const { id, ...rest } = a; await supabaseClient.from('agenda').insert([rest]); }
            for (const c of backup.caixa || []) { const { id, ...rest } = c; await supabaseClient.from('caixa').insert([rest]); }
            for (const p of backup.piercings || []) { const { id, ...rest } = p; await supabaseClient.from('piercings_estoque').insert([rest]); }
            for (const v of backup.vendas || []) { const { id, ...rest } = v; await supabaseClient.from('vendas_piercing').insert([rest]); }
            for (const m of backup.materiais || []) { const { id, ...rest } = m; await supabaseClient.from('materiais_estoque').insert([rest]); }
            for (const u of backup.usos || []) { const { id, ...rest } = u; await supabaseClient.from('usos_materiais').insert([rest]); }
            showAlert('Backup importado com sucesso! Recarregando...', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    } catch (e) {
        showAlert('Erro ao importar backup: ' + e.message, 'error');
    }
    input.value = '';
};

// ==================== EXEMPLOS ====================
window.popularPiercingsExemplo = async () => {
    if (!confirm('Isso irá adicionar piercings de exemplo (não remove os existentes). Continuar?')) return;
    const exemplos = [
        { nome: 'Piercing Nariz Cristal', quantidade: 10, preco_venda: 80.00 },
        { nome: 'Piercing Septo Aço', quantidade: 8, preco_venda: 120.00 },
        { nome: 'Piercing Lábio Argola', quantidade: 5, preco_venda: 70.00 },
        { nome: 'Piercing Tragus Pérola', quantidade: 12, preco_venda: 90.00 },
        { nome: 'Piercing Indústrial Barra', quantidade: 6, preco_venda: 110.00 }
    ];
    try {
        for (const item of exemplos) {
            const { data: existente } = await supabaseClient.from('piercings_estoque').select('id').eq('nome', item.nome).maybeSingle();
            if (!existente) await supabaseClient.from('piercings_estoque').insert([item]);
        }
        await carregarPiercings();
        await carregarVendasPiercing();
        showAlert('Piercings de exemplo adicionados!', 'success');
    } catch (e) { showAlert('Erro ao adicionar exemplos: ' + e.message, 'error'); }
};
window.popularMateriaisExemplo = async () => {
    if (!confirm('Isso irá adicionar materiais de exemplo (não remove os existentes). Continuar?')) return;
    const exemplos = [
        { nome: 'Agulha 1207RL', quantidade: 50, valor_unitario: 2.50 },
        { nome: 'Agulha 1005RL', quantidade: 40, valor_unitario: 2.50 },
        { nome: 'Tinta Preta Intenze', quantidade: 8, valor_unitario: 45.00 },
        { nome: 'Tinta Branca Eternal', quantidade: 5, valor_unitario: 55.00 },
        { nome: 'Luvas Descartáveis M', quantidade: 100, valor_unitario: 0.80 },
        { nome: 'Filme PVC', quantidade: 20, valor_unitario: 12.00 },
        { nome: 'Bálsamo Tattoo', quantidade: 15, valor_unitario: 18.00 }
    ];
    try {
        for (const item of exemplos) {
            const { data: existente } = await supabaseClient.from('materiais_estoque').select('id').eq('nome', item.nome).maybeSingle();
            if (!existente) await supabaseClient.from('materiais_estoque').insert([item]);
        }
        await carregarMateriais();
        await carregarUsosMateriais();
        showAlert('Materiais de exemplo adicionados!', 'success');
    } catch (e) { showAlert('Erro ao adicionar exemplos: ' + e.message, 'error'); }
};

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };
window.sincronizarAgora = async () => {
    showAlert('Sincronizando dados...', 'info');
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
    await carregarRelatorios();
    showAlert('Sincronização concluída!', 'success');
};

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

document.querySelectorAll('.nav button').forEach(btn => btn.addEventListener('click', () => {
    let id = btn.getAttribute('data-section');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (id === 'dashboard') atualizarDashboard();
    if (id === 'relatorios') carregarRelatorios();
    if (id === 'piercing') { carregarPiercings(); carregarVendasPiercing(); }
    if (id === 'materiais') { carregarMateriais(); carregarUsosMateriais(); }
}));

document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        showAlert('Supabase não disponível. Verifique sua conexão.', 'error');
        return;
    }
    setupAuthTabs();
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-register').addEventListener('click', handleRegister);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    await checkSession();
});