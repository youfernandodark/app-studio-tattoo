import { supabase } from '../supabaseClient.js';
import { formatMoney, formatDate, showAlert } from '../utils.js';

let currentCaixaData = [];

export async function carregarCaixa() { ... }
export function renderizarCaixa(data) { ... }
export async function salvarCaixa() { ... }
export async function excluirCaixa(id) { ... }
// etc.
