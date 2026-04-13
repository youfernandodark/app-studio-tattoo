/**
 * 🎨 DARK013TATTOO - Configuração Centralizada
 * Arquivo: js/config.js
 * 
 * INSTRUÇÕES DE USO:
 * 1. Crie um arquivo .env na raiz (NÃO commitar no Git!)
 * 2. Ou defina window.ENV no <head> do index.html (para sites estáticos sem build)
 * 3. Importe este arquivo no seu app.js principal
 */

// Helper para ler variáveis de ambiente (suporta Vite, Webpack ou uso direto no navegador)
const getEnv = (key, fallback = '') => {
  // 1. Build tools (Vite/Webpack)
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  // 2. Variável global (para sites estáticos sem bundler)
  if (typeof window !== 'undefined' && window.ENV?.[key]) {
    return window.ENV[key];
  }
  // 3. Fallback seguro
  return fallback;
};

// 🔗 Configurações do Supabase
export const SUPABASE = {
  url: getEnv('VITE_SUPABASE_URL', 'https://bhymkxsgrghhpqgzqrni.supabase.co'),
  anonKey: getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoeW1reHNncmdoaHBxZ3pxcm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMzEyOTYsImV4cCI6MjA5MTYwNzI5Nn0.GuY32wg63pzCz5aZtGUJBXcb9zicwhsJSzH-czX3Ly4),
  // ⚠️ NUNCA exponha a SERVICE_ROLE_KEY no frontend!
};

// 💼 Configurações de Negócio
export const NEGOCIO = {
  nomeEstudio: getEnv('VITE_NOME_ESTUDIO', 'DARK013TATTOO'),
  pctEstudio: parseFloat(getEnv('VITE_PCT_ESTUDIO', '30')),   // 30% estúdio
  pctRepasse: parseFloat(getEnv('VITE_PCT_REPASSE', '70')),   // 70% tatuador
  moeda: 'BRL',
  locale: 'pt-BR'
};

// ⚙️ Configurações do Sistema
export const SISTEMA = {
  versao: getEnv('VITE_APP_VERSAO', '1.0.0'),
  debug: getEnv('VITE_APP_DEBUG', 'false') === 'true',
  syncIntervalMs: parseInt(getEnv('VITE_SYNC_INTERVAL', '30000'), 10), // 30s
  maxBackupSizeMB: 50
};

// ✅ Validação Automática de Configuração
export function validarConfig() {
  const erros = [];
  const avisos = [];

  if (!SUPABASE.url || SUPABASE.url.includes('seu-projeto')) {
    erros.push('VITE_SUPABASE_URL não configurada corretamente.');
  }
  if (!SUPABASE.anonKey || SUPABASE.anonKey.includes('sua-chave')) {
    erros.push('VITE_SUPABASE_ANON_KEY não configurada corretamente.');
  }
  if (NEGOCIO.pctEstudio + NEGOCIO.pctRepasse !== 100) {
    avisos.push('⚠️ Porcentagens do estúdio e repasse não somam 100%.');
  }

  if (erros.length > 0) {
    console.error('🚨 ERROS DE CONFIGURAÇÃO DARK013TATTOO:', erros);
  }
  if (avisos.length > 0 && SISTEMA.debug) {
    console.warn('⚠️ AVISOS DE CONFIGURAÇÃO:', avisos);
  }

  return { ok: erros.length === 0, erros, avisos };
}

// Exportar configuração consolidada
export const CONFIG = {
  supabase: SUPABASE,
  negocio: NEGOCIO,
  sistema: SISTEMA
};

// Auto-validar ao carregar (apenas em modo debug ou desenvolvimento)
if (SISTEMA.debug || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) {
  validarConfig();
}
