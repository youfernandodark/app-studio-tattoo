// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://bhymkxsgrghhpqgzqrni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4';

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error('Supabase não carregou. Verifique a tag script.');
    document.getElementById('status-nuvem').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro: Supabase não carregou';
}

// ==================== GLOBAL STATE ====================
let currentData = { servicos: [], agenda: [], caixa: [] };
let chartFaturamento = null, chartTipos = null;

// ==================== HELPER FUNCTIONS ====================
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

// ==================== DATA LOADING ====================
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
    else data.forEach(l=>{ const ent=+l.entradas||0, sai=+l.saidas||0; totalE+=ent; totalS+=sai; tbody.innerHTML+=`<tr><td>${formatDate(l.data)}</td><td>${formatMoney(l.saldo_inicial)}</td><td style="color:#34D399">+${formatMoney(ent)}</td><td style="color:#F87171">-${formatMoney(sai)}</td><td>${formatMoney(l.saldo_final)}</td><td>${l.descricao||'-'}</td><td><button class="btn btn-warning btn-sm" onclick="editarCaixa('${l.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirCaixa('${l.id}')">Excluir</button></td></tr>`; });
    document.getElementById('caixa-total-entradas').innerText=formatMoney(totalE);
    document.getElementById('caixa-total-saidas').innerText=formatMoney(totalS);
    const ultimoSaldo = data.length ? data[0].saldo_final : 0;
    document.getElementById('caixa-saldo-final').innerText=formatMoney(ultimoSaldo);
}

function renderizarServicos(data){
    let totalV=0,totalE=0,totalR=0; const tbody=document.getElementById('servicos-tbody'); tbody.innerHTML='';
    data.forEach(s=>{ const val=+s.valor_total||0; const estudio = s.tatuador_nome==='Thalia'?val*0.3:0; const repasse = s.tatuador_nome==='Thalia'?val*0.7:val; totalV+=val; totalE+=estudio; totalR+=repasse; tbody.innerHTML+=`<tr><td>${formatDate(s.data)}</td><td>${s.cliente}</td><td>${s.tatuador_nome}</td><td>${s.tipo}</td><td>${s.descricao||'-'}</td><td>${formatMoney(val)}</td><td>${formatMoney(estudio)}</td><td style="color:#34D399">${formatMoney(repasse)}</td><td>${s.forma_pagamento}</td><td><button class="btn btn-warning btn-sm" onclick="editarServico('${s.id}')">Editar</button> <button class="btn btn-danger btn-sm" onclick="excluirServico('${s.id}')">Excluir</button></td></tr>`; });
    document.getElementById('servicos-total-valor').innerText=formatMoney(totalV);
    document.getElementById('servicos-total-estudio').innerText=formatMoney(totalE);
    document.getElementById('servicos-total-repasse').innerText=formatMoney(totalR);
}

function renderizarAgenda(data){
    const tbody=document.getElementById('agenda-tbody'); tbody.innerHTML='';
    if(data.length===0) tbody.innerHTML='<tr><td colspan="9">Nenhum agendamento</td></tr>';
    else data.forEach(a=>{ 
        const statusClass={Agendado:'status-warning',Confirmado:'status-info',Concluído:'status-success',Cancelado:'status-danger'}[a.status]; 
        let confirmBtn = (a.status === 'Agendado') ? `<button class="btn btn-success btn-sm" onclick="confirmarAgendamento('${a.id}')"><i class="fas fa-check"></i> Confirmar</button> ` : ''; 
        tbody.innerHTML+=`<tr>
            <td>${formatDateTime(a.data_hora)}</td>
            <td>${a.cliente}</td>
            <td>${a.tatuador_nome}</td>
            <td>${a.tipo_servico}</td>
            <td>${formatMoney(a.valor_estimado)}</td>
            <td>${a.forma_pagamento || '-'}</td>
            <td><span class="status-badge-item ${statusClass}">${a.status}</span></td>
            <td>${a.observacoes||'-'}</td>
            <td>
                ${confirmBtn}
                <button class="btn btn-primary btn-sm" onclick="remarcarAgendamento('${a.id}')"><i class="fas fa-calendar-alt"></i> Remarcar</button>
                <button class="btn btn-success btn-sm" onclick="finalizarAgendamento('${a.id}')"><i class="fas fa-check-double"></i> Finalizar</button>
                <button class="btn btn-warning btn-sm" onclick="editarAgenda('${a.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="excluirAgenda('${a.id}')">Excluir</button>
            </td>
        </tr>`; 
    });
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
window.abrirModalCaixa=()=>{ document.getElementById('caixa-id').value=''; document.getElementById('caixa-data').value=new Date().toISOString().split('T')[0]; document.getElementById('modal-caixa').style.display='block'; };
window.salvarCaixa=async()=>{ 
    const id = document.getElementById('caixa-id').value; 
    const data={data:document.getElementById('caixa-data').value, saldo_inicial:+document.getElementById('caixa-saldo-inicial').value||0, entradas:+document.getElementById('caixa-entradas').value||0, saidas:+document.getElementById('caixa-saidas').value||0, descricao:document.getElementById('caixa-descricao').value};
    data.saldo_final=data.saldo_inicial+data.entradas-data.saidas; 
    let error; 
    try {
        if(id) error=(await supabaseClient.from('caixa').update(data).eq('id',id)).error;
        else error=(await supabaseClient.from('caixa').insert([data])).error;
        if(error) throw error;
        fecharModal('modal-caixa'); 
        await carregarCaixa(); 
        atualizarDashboard(); 
        showAlert(id?'Atualizado':'Salvo','success');
    } catch(e) { showAlert('Erro ao salvar: '+e.message, 'error'); }
};
window.editarCaixa=async(id)=>{ const item=currentData.caixa.find(c=>c.id===id); if(item){ document.getElementById('caixa-id').value=item.id; document.getElementById('caixa-data').value=item.data; document.getElementById('caixa-saldo-inicial').value=item.saldo_inicial; document.getElementById('caixa-entradas').value=item.entradas; document.getElementById('caixa-saidas').value=item.saidas; document.getElementById('caixa-descricao').value=item.descricao||''; document.getElementById('modal-caixa').style.display='block';}};
window.excluirCaixa=async(id)=>{ if(confirm('Excluir?')){ try { await supabaseClient.from('caixa').delete().eq('id',id); await carregarCaixa(); atualizarDashboard(); showAlert('Excluído','success'); } catch(e) { showAlert('Erro ao excluir','error'); } }};
window.filtrarCaixa=()=>{ const search=document.getElementById('search-caixa').value.toLowerCase(); const filtered=currentData.caixa.filter(i=>(i.descricao||'').toLowerCase().includes(search)); renderizarCaixa(filtered);};

// ==================== CRUD: SERVIÇOS ====================
window.abrirModalServico=()=>{ document.getElementById('servico-id').value=''; document.getElementById('servico-data').value=new Date().toISOString().split('T')[0]; document.getElementById('servico-cliente').value=''; document.getElementById('servico-valor').value=''; document.getElementById('modal-servico').style.display='block'; calcularRepasse();};
window.calcularRepasse=()=>{ const val=+document.getElementById('servico-valor').value||0; const tatuador = document.getElementById('servico-tatuador').value; const estudio = tatuador==='Thalia'?val*0.3:0; const repasse = tatuador==='Thalia'?val*0.7:val; document.getElementById('valor-estudio').innerText=formatMoney(estudio); document.getElementById('valor-repasse').innerText=formatMoney(repasse); };
window.salvarServico=async()=>{ 
    const id=document.getElementById('servico-id').value; 
    const data={data:document.getElementById('servico-data').value, cliente:document.getElementById('servico-cliente').value, tatuador_nome:document.getElementById('servico-tatuador').value, tipo:document.getElementById('servico-tipo').value, descricao:document.getElementById('servico-descricao').value, valor_total:+document.getElementById('servico-valor').value||0, forma_pagamento:document.getElementById('servico-pagamento').value}; 
    let error; 
    try {
        if(id) error=(await supabaseClient.from('servicos').update(data).eq('id',id)).error;
        else error=(await supabaseClient.from('servicos').insert([data])).error;
        if(error) throw error;
        fecharModal('modal-servico'); 
        await carregarServicos(); 
        atualizarDashboard(); 
        showAlert(id?'Atualizado':'Salvo','success');
    } catch(e) { showAlert('Erro ao salvar serviço: '+e.message, 'error'); }
};
window.editarServico=async(id)=>{ const item=currentData.servicos.find(s=>s.id===id); if(item){ document.getElementById('servico-id').value=item.id; document.getElementById('servico-data').value=item.data; document.getElementById('servico-cliente').value=item.cliente; document.getElementById('servico-tatuador').value=item.tatuador_nome; document.getElementById('servico-tipo').value=item.tipo; document.getElementById('servico-descricao').value=item.descricao||''; document.getElementById('servico-valor').value=item.valor_total; document.getElementById('servico-pagamento').value=item.forma_pagamento; document.getElementById('modal-servico').style.display='block'; calcularRepasse();}};
window.excluirServico=async(id)=>{ if(confirm('Excluir serviço?')){ try { await supabaseClient.from('servicos').delete().eq('id',id); await carregarServicos(); atualizarDashboard(); showAlert('Serviço excluído','success'); } catch(e) { showAlert('Erro ao excluir','error'); } }};
window.filtrarServicos=()=>{ let f=[...currentData.servicos]; const t=document.getElementById('filtro-tatuador-servico').value; if(t) f=f.filter(s=>s.tatuador_nome===t); const tp=document.getElementById('filtro-tipo-servico').value; if(tp) f=f.filter(s=>s.tipo===tp); const pg=document.getElementById('filtro-pagamento').value; if(pg) f=f.filter(s=>s.forma_pagamento===pg); const dt=document.getElementById('filtro-data-servico').value; if(dt) f=f.filter(s=>s.data===dt); const src=document.getElementById('search-servicos').value.toLowerCase(); if(src) f=f.filter(s=>s.cliente.toLowerCase().includes(src)||(s.descricao||'').toLowerCase().includes(src)); renderizarServicos(f);};
window.limparFiltrosServicos=()=>{ document.getElementById('filtro-tatuador-servico').value=''; document.getElementById('filtro-tipo-servico').value=''; document.getElementById('filtro-pagamento').value=''; document.getElementById('filtro-data-servico').value=''; document.getElementById('search-servicos').value=''; renderizarServicos(currentData.servicos);};

// ==================== CRUD: AGENDA (MODIFICADO) ====================
window.abrirModalAgendamento=()=>{ 
    document.getElementById('agenda-id').value=''; 
    document.getElementById('agenda-data').value=new Date().toISOString().split('T')[0]; 
    document.getElementById('agenda-forma-pagamento').value = 'Pix'; // valor padrão
    document.getElementById('modal-agenda').style.display='block';
};

window.salvarAgenda=async()=>{ 
    const id=document.getElementById('agenda-id').value; 
    const dataHora=`${document.getElementById('agenda-data').value} ${document.getElementById('agenda-horario').value}`; 
    const data={
        data_hora:dataHora, 
        cliente:document.getElementById('agenda-cliente').value, 
        tatuador_nome:document.getElementById('agenda-tatuador').value, 
        tipo_servico:document.getElementById('agenda-tipo').value, 
        valor_estimado:+document.getElementById('agenda-valor').value||0, 
        forma_pagamento: document.getElementById('agenda-forma-pagamento').value,
        status:document.getElementById('agenda-status').value, 
        observacoes:document.getElementById('agenda-obs').value
    }; 
    let error; 
    try {
        if(id) error=(await supabaseClient.from('agenda').update(data).eq('id',id)).error;
        else error=(await supabaseClient.from('agenda').insert([data])).error;
        if(error) throw error;
        fecharModal('modal-agenda'); 
        await carregarAgenda(); 
        atualizarDashboard(); 
        showAlert(id?'Atualizado':'Salvo','success');
    } catch(e) { showAlert('Erro ao salvar agenda: '+e.message, 'error'); }
};

window.editarAgenda=async(id)=>{ 
    const item=currentData.agenda.find(a=>a.id===id); 
    if(item){ 
        document.getElementById('agenda-id').value=item.id; 
        const dt=new Date(item.data_hora); 
        document.getElementById('agenda-data').value=dt.toISOString().split('T')[0]; 
        document.getElementById('agenda-horario').value=dt.toTimeString().slice(0,5); 
        document.getElementById('agenda-cliente').value=item.cliente; 
        document.getElementById('agenda-tatuador').value=item.tatuador_nome; 
        document.getElementById('agenda-tipo').value=item.tipo_servico; 
        document.getElementById('agenda-valor').value=item.valor_estimado; 
        document.getElementById('agenda-forma-pagamento').value = item.forma_pagamento || 'Pix';
        document.getElementById('agenda-status').value=item.status; 
        document.getElementById('agenda-obs').value=item.observacoes||''; 
        document.getElementById('modal-agenda').style.display='block';
    }
};

window.excluirAgenda=async(id)=>{ 
    if(confirm('Excluir agendamento?')){ 
        try { 
            await supabaseClient.from('agenda').delete().eq('id',id); 
            await carregarAgenda(); 
            atualizarDashboard(); 
            showAlert('Agendamento excluído','success'); 
        } catch(e) { showAlert('Erro ao excluir','error'); } 
    }
};

window.confirmarAgendamento=async(id)=>{ 
    if(confirm('Confirmar este agendamento?')){ 
        try { 
            await supabaseClient.from('agenda').update({status:'Confirmado'}).eq('id',id); 
            await carregarAgenda(); 
            atualizarDashboard(); 
            showAlert('Status alterado para Confirmado','success'); 
        } catch(e) { showAlert('Erro ao confirmar','error'); } 
    } 
};

// NOVO: Remarcar (abre edição)
window.remarcarAgendamento = (id) => {
    editarAgenda(id);
};

// NOVO: Finalizar agendamento (muda status para Concluído e gera serviço)
window.finalizarAgendamento = async (id) => {
    const agendamento = currentData.agenda.find(a => a.id === id);
    if (!agendamento) return;
    
    if (!confirm(`Finalizar agendamento de ${agendamento.cliente}? Isso criará um serviço concluído.`)) return;
    
    try {
        // Atualizar status para Concluído
        await supabaseClient.from('agenda').update({ status: 'Concluído' }).eq('id', id);
        
        // Criar serviço correspondente
        const servicoData = {
            data: new Date().toISOString().split('T')[0],
            cliente: agendamento.cliente,
            tatuador_nome: agendamento.tatuador_nome,
            tipo: agendamento.tipo_servico,
            descricao: agendamento.observacoes || '',
            valor_total: agendamento.valor_estimado,
            forma_pagamento: agendamento.forma_pagamento || 'Pix'
        };
        
        await supabaseClient.from('servicos').insert([servicoData]);
        
        await carregarAgenda();
        await carregarServicos();
        atualizarDashboard();
        showAlert('Agendamento finalizado e serviço registrado!', 'success');
    } catch (e) {
        showAlert('Erro ao finalizar: ' + e.message, 'error');
    }
};

window.filtrarAgenda=()=>{ 
    let filtered=[...currentData.agenda]; 
    const tat=document.getElementById('filtro-tatuador-agenda').value; 
    const stat=document.getElementById('filtro-status-agenda').value; 
    const data=document.getElementById('filtro-data-agenda').value; 
    if(tat) filtered=filtered.filter(a=>a.tatuador_nome===tat); 
    if(stat) filtered=filtered.filter(a=>a.status===stat); 
    if(data) filtered=filtered.filter(a=>a.data_hora.startsWith(data)); 
    renderizarAgenda(filtered);
};

window.filtrarAgendaHoje=()=>{ 
    document.getElementById('filtro-data-agenda').valueAsDate=new Date(); 
    filtrarAgenda();
};

window.limparFiltrosAgenda=()=>{ 
    document.getElementById('filtro-tatuador-agenda').value=''; 
    document.getElementById('filtro-status-agenda').value=''; 
    document.getElementById('filtro-data-agenda').value=''; 
    renderizarAgenda(currentData.agenda);
};

// ==================== PIERCING (inalterado) ====================
// ... (código de piercing permanece igual)

// ==================== MATERIAIS (inalterado) ====================
// ... (código de materiais permanece igual)

// ==================== BACKUP (inalterado) ====================
// ... (código de backup permanece igual)

// ==================== NAVEGAÇÃO E INICIALIZAÇÃO ====================
// ... (restante do código permanece igual)