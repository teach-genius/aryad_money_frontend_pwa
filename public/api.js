/**
 * ═══════════════════════════════════════════════════════════════
 *  ARYADMONEY PWA — api.js
 *  Client HTTP centralisé, gestion tokens, refresh auto
 * ═══════════════════════════════════════════════════════════════
 */

const API_BASE = 'https://farya.pythonanywhere.com/v1';// ← remplacer avec l'URL réelle
const TIMEOUT_MS = 20000;

/* ─── Storage Keys ─────────────────────────────────────────────── */
const KEYS = {
  TOKEN:         'aryadmoney_token',
  REFRESH_TOKEN: 'aryadmoney_refresh',
  USER:          'aryadmoney_user',
  USER_ID:       'aryadmoney_uid',
};

/* ─── Token Store ──────────────────────────────────────────────── */
const TokenStore = {
  get()           { return localStorage.getItem(KEYS.TOKEN); },
  set(t)          { localStorage.setItem(KEYS.TOKEN, t); },
  getRefresh()    { return localStorage.getItem(KEYS.REFRESH_TOKEN); },
  setRefresh(t)   { localStorage.setItem(KEYS.REFRESH_TOKEN, t); },
  clear()         { [KEYS.TOKEN, KEYS.REFRESH_TOKEN, KEYS.USER, KEYS.USER_ID].forEach(k => localStorage.removeItem(k)); },
  saveUser(u)     { localStorage.setItem(KEYS.USER, JSON.stringify(u)); },
  getUser()       { try { return JSON.parse(localStorage.getItem(KEYS.USER)); } catch { return null; } },
  saveUserId(id)  { localStorage.setItem(KEYS.USER_ID, id); },
  getUserId()     { return localStorage.getItem(KEYS.USER_ID); },
};

/* ─── Error messages ───────────────────────────────────────────── */
function httpErrorMessage(status, body = {}) {
  if (body.message) return body.message;
  if (body.error)   return body.error;
  const map = {
    400: 'Données invalides. Vérifiez vos informations.',
    401: 'Session expirée. Veuillez vous reconnecter.',
    403: 'Accès refusé.',
    404: 'Ressource introuvable.',
    409: 'Ce compte existe déjà.',
    422: 'Informations incorrectes.',
    429: 'Trop de tentatives. Réessayez dans quelques minutes.',
    500: 'Erreur serveur. Réessayez plus tard.',
    502: 'Erreur serveur. Réessayez plus tard.',
    503: 'Service temporairement indisponible.',
  };
  return map[status] || `Une erreur est survenue (code ${status}).`;
}

/* ─── ApiResult ────────────────────────────────────────────────── */
class ApiResult {
  constructor(data, error, status) {
    this.data       = data   ?? null;
    this.error      = error  ?? null;
    this.statusCode = status ?? null;
  }
  get isSuccess() { return this.error === null; }
  get isFailure() { return this.error !== null; }

  static success(data, status) { return new ApiResult(data, null, status); }
  static failure(error, status) { return new ApiResult(null, error, status); }
}

/* ─── Core fetch wrapper ───────────────────────────────────────── */
async function _request(method, endpoint, body, requiresAuth = true) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };

    if (requiresAuth) {
      const token = TokenStore.get();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const opts = { method, headers, signal: controller.signal };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    clearTimeout(timer);

    let json = {};
    try { json = await res.json(); } catch { /* non-JSON body */ }

    if (res.ok) return ApiResult.success(json, res.status);

    // Auto-refresh on 401
    if (res.status === 401 && requiresAuth) {
      const refreshed = await _refreshToken();
      if (refreshed) return _request(method, endpoint, body, requiresAuth);
      TokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }

    return ApiResult.failure(httpErrorMessage(res.status, json), res.status);

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return ApiResult.failure('La requête a expiré. Vérifiez votre connexion.');
    }
    if (!navigator.onLine) {
      return ApiResult.failure('Pas de connexion internet. Vérifiez votre réseau.');
    }
    return ApiResult.failure('Erreur inattendue: ' + err.message);
  }
}

async function _refreshToken() {
  const refresh = TokenStore.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      TokenStore.set(data.access_token);
      if (data.refresh_token) TokenStore.setRefresh(data.refresh_token);
      return true;
    }
    return false;
  } catch { return false; }
}

/* ─── Public HTTP methods ──────────────────────────────────────── */
const Api = {
  get:    (ep, auth = true)       => _request('GET',    ep, null, auth),
  post:   (ep, body, auth = true) => _request('POST',   ep, body, auth),
  put:    (ep, body)              => _request('PUT',    ep, body, true),
  delete: (ep)                    => _request('DELETE', ep, null, true),
  TokenStore,
};

/* ═══════════════════════════════════════════════════════════════
   AUTH SERVICE
═══════════════════════════════════════════════════════════════ */
const AuthService = {

  async login({ telephone, codePays, motDePasse }) {
    const r = await Api.post('/auth/login', { telephone, code_pays: codePays, mot_de_passe: motDePasse }, false);
    if (r.isFailure) return r;

    const { access_token, refresh_token, user } = r.data;
    if (!access_token || !user) return ApiResult.failure('Réponse du serveur invalide.');

    TokenStore.set(access_token);
    if (refresh_token) TokenStore.setRefresh(refresh_token);
    TokenStore.saveUser(user);
    TokenStore.saveUserId(user.id);
    return ApiResult.success(user);
  },

  async register({ telephone, codePays, email, motDePasse }) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return ApiResult.failure('Email invalide.');
    if (motDePasse.length < 6) return ApiResult.failure('Mot de passe minimum 6 caractères.');

    const r = await Api.post('/auth/register', {
      telephone,
      code_pays: codePays,
      email,
      mot_de_passe: motDePasse,
    }, false);

    if (r.isFailure) return r;

    // Retourne succès avec email_masque + infos nécessaires pour la page OTP
    return ApiResult.success({
      email_masque: r.data?.email_masque || email,
      telephone,
      code_pays: codePays,
    });
  },

  async verifyOtp({ telephone, codePays, code }) {
    const r = await Api.post('/auth/verify-otp', { telephone, code_pays: codePays, code }, false);
    if (r.isFailure) return r;

    const { access_token, refresh_token, user } = r.data;
    if (!access_token || !user) return ApiResult.failure('Réponse du serveur invalide.');

    TokenStore.set(access_token);
    if (refresh_token) TokenStore.setRefresh(refresh_token);
    TokenStore.saveUser(user);
    TokenStore.saveUserId(user.id);
    return ApiResult.success(user);
  },

  async resendOtp({ telephone, codePays }) {
    return Api.post('/auth/resend-otp', { telephone, code_pays: codePays }, false);
  },

  async forgotPassword({ telephone, codePays }) {
    return Api.post('/auth/forgot-password', { telephone, code_pays: codePays }, false);
  },

  async logout() {
    try { await Api.post('/auth/logout', {}); } catch {}
    TokenStore.clear();
    return true;
  },

  isAuthenticated() { return !!TokenStore.get() && !!TokenStore.getUser(); },
  getUser()         { return TokenStore.getUser(); },
};

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT SERVICE
═══════════════════════════════════════════════════════════════ */
const AccountService = {

  async getProfile() {
    const r = await Api.get('/account/profile');
    if (r.isFailure) return r;
    TokenStore.saveUser(r.data);
    return r;
  },

  async getOperations({ page = 1, type = null } = {}) {
    let ep = `/account/operations?page=${page}`;
    if (type) ep += `&type=${type}`;
    return Api.get(ep);
  },

  async getNotifications() { return Api.get('/account/notifications'); },
  async markNotifRead(id) { return Api.put(`/account/notifications/${id}/read`, {}); },
  async markAllRead()     { return Api.post('/account/notifications/read-all', {}); },

  async getBeneficiaires() { return Api.get('/account/beneficiaires'); },

  async addBeneficiaire({ nom, prenom, telephone, pays }) {
    return Api.post('/account/beneficiaires', { nom, prenom, telephone, pays });
  },

  async deleteBeneficiaire(id) { return Api.delete(`/account/beneficiaires/${id}`); },

  async updateProfile(data) {
    const r = await Api.put('/account/profile', data);
    if (r.isSuccess) TokenStore.saveUser(r.data);
    return r;
  },

  async changePin({ oldPin, newPin }) {
    return Api.post('/account/change-pin', { old_pin: oldPin, new_pin: newPin });
  },
};

/* ═══════════════════════════════════════════════════════════════
   TRANSACTION SERVICE
═══════════════════════════════════════════════════════════════ */
const TransactionService = {

  async virement({ telephone, codePays, montant, motif = '' }) {
    const err = this._validateMontant(montant);
    if (err) return ApiResult.failure(err);
    return Api.post('/transactions/virement', { telephone, code_pays: codePays, montant: parseFloat(montant), motif });
  },

  async rechargeRequest({ telephone, codePays, montant, operateur }) {
    const err = this._validateMontant(montant);
    if (err) return ApiResult.failure(err);
    return Api.post('/transactions/recharge/demande', { telephone, code_pays: codePays, montant: parseFloat(montant), operateur });
  },

  async rechargeTicket({ code }) {
    if (!code || code.trim().length < 4) return ApiResult.failure('Code ticket invalide.');
    return Api.post('/transactions/recharge/ticket', { code: code.trim() });
  },

  async retrait({ montant, pin }) {
    const err = this._validateMontant(montant);
    if (err) return ApiResult.failure(err);
    if (!pin || pin.length < 4) return ApiResult.failure('PIN invalide.');
    return Api.post('/transactions/retrait', { montant: parseFloat(montant), pin });
  },

  _validateMontant(montant, solde = null) {
    const v = parseFloat(montant);
    if (isNaN(v) || v <= 0) return 'Montant invalide.';
    if (v < 10) return 'Montant minimum : 10 MAD.';
    if (solde !== null && v > solde) return 'Solde insuffisant.';
    return null;
  },
};

/* ═══════════════════════════════════════════════════════════════
   RECHARGE SERVICE
═══════════════════════════════════════════════════════════════ */
const RechargeService = {

  async getModes() {
    return Api.get('/transactions/recharge/modes');
  },

  async soumettreDemande({ mode_paiement, numero_transaction, montant, devise }) {
    if (!mode_paiement) return ApiResult.failure('Mode de paiement requis.');
    if (!numero_transaction || numero_transaction.trim().length < 4)
      return ApiResult.failure('Numéro de transaction invalide.');
    const v = parseFloat(montant);
    if (isNaN(v) || v < 10) return ApiResult.failure('Montant invalide (minimum 10).');

    return Api.post('/transactions/recharge/demande', {
      mode_paiement,
      numero_transaction: numero_transaction.trim(),
      montant: v,
      devise,
    });
  },

  async getMesDemandes() {
    return Api.get('/transactions/recharge/demande');
  },

  async getDemande(id) {
    return Api.get(`/transactions/recharge/demande/${id}`);
  },

  async validerTicket(code) {
    if (!code || code.trim().length < 4) return ApiResult.failure('Code ticket invalide.');
    return Api.post('/transactions/recharge/ticket', { code: code.trim() });
  },
};

/* ─── Expose globally ──────────────────────────────────────────── */
window.Api             = Api;
window.ApiResult       = ApiResult;
window.AuthService     = AuthService;
window.AccountService  = AccountService;
window.TransactionService = TransactionService;
window.RechargeService    = RechargeService;
window.TokenStore      = TokenStore;

/* ─── Country helpers ──────────────────────────────────────────── */
window.COUNTRIES = {
  MA: { flag: '🇲🇦', code: '+212', label: '🇲🇦 +212' },
  SN: { flag: '🇸🇳', code: '+221', label: '🇸🇳 +221' },
  GA: { flag: '🇬🇦', code: '+241', label: '🇬🇦 +241' },
  CI: { flag: '🇨🇮', code: '+225', label: '🇨🇮 +225' },
  CM: { flag: '🇨🇲', code: '+237', label: '🇨🇲 +237' },
};

window.formatMontant = (montant, devise = 'MAD') => {
  const abs = Math.abs(montant);
  if (abs >= 1_000_000) return (abs / 1_000_000).toFixed(2) + ' M ' + devise;
  if (abs >= 1_000)     return (abs / 1_000).toFixed(2) + ' K ' + devise;
  return abs.toFixed(2) + ' ' + devise;
};

window.formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - date) / 86400000);
  const pad  = n => String(n).padStart(2, '0');
  if (diff === 0) return `Aujourd'hui ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (diff === 1) return `Hier ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (diff < 7)   return `${diff} jours`;
  return `${pad(date.getDate())}.${pad(date.getMonth()+1)}.${date.getFullYear()}`;
};

window.formatDateGroup = (dateStr) => {
  const date = new Date(dateStr);
  const now  = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d     = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff  = Math.floor((today - d) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  const pad = n => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`;
};

window.getInitials = (nom = '', prenom = '') =>
  ((prenom[0] || '') + (nom[0] || '')).toUpperCase() || '??';


// Dans api.js — déjà présent, à compléter
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    // Afficher un bouton custom
    showInstallBanner()
})

function showInstallBanner() {
    const banner = document.createElement('div')
    banner.id = 'install-banner'
    banner.innerHTML = `
        <div style="position:fixed;bottom:80px;left:16px;right:16px;z-index:9999;
                    background:#DAAE54;border-radius:16px;padding:14px 16px;
                    display:flex;align-items:center;gap:12px;
                    box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <div style="font-size:28px;">📲</div>
            <div style="flex:1;">
                <div style="font-weight:800;color:#20262D;font-size:14px;">Installer AryadMoney</div>
                <div style="font-size:12px;color:#4a3800;">Accès rapide depuis votre écran d'accueil</div>
            </div>
            <button onclick="doInstall()"
                style="background:#20262D;color:#DAAE54;border:none;border-radius:10px;
                       padding:8px 14px;font-weight:700;font-size:12px;cursor:pointer;">
                Installer
            </button>
            <button onclick="document.getElementById('install-banner').remove()"
                style="background:none;border:none;font-size:18px;cursor:pointer;color:#20262D;">✕</button>
        </div>
    `
    document.body.appendChild(banner)
}

window.doInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    document.getElementById('install-banner')?.remove()
}

// iOS — pas de beforeinstallprompt, afficher instructions manuelles
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches

if (isIOS && !isStandalone) {
    setTimeout(() => {
        const banner = document.createElement('div')
        banner.innerHTML = `
            <div style="position:fixed;bottom:80px;left:16px;right:16px;z-index:9999;
                        background:#DAAE54;border-radius:16px;padding:14px 16px;
                        box-shadow:0 8px 32px rgba(0,0,0,0.3);">
                <div style="font-weight:800;color:#20262D;font-size:14px;margin-bottom:6px;">
                    📲 Installer AryadMoney
                </div>
                <div style="font-size:12px;color:#4a3800;line-height:1.6;">
                    Appuyez sur <strong>⬆️ Partager</strong> puis
                    <strong>Sur l'écran d'accueil</strong>
                </div>
                <button onclick="this.closest('div').parentElement.remove()"
                    style="margin-top:10px;background:#20262D;color:#DAAE54;border:none;
                           border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;">
                    OK
                </button>
            </div>
        `
        document.body.appendChild(banner)
    }, 3000)
}