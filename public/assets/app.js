/**
 * ═══════════════════════════════════════════════════════════════
 *  ARYADMONEY PWA — app.js
 *  Router SPA, views, UI components, PWA install
 * ═══════════════════════════════════════════════════════════════
 */

/* ─── Router ───────────────────────────────────────────────────── */
const Router = (() => {
  const routes = {};
  let currentRoute = null;

  function register(name, fn) { routes[name] = fn; }

  function go(name, params = {}, options = {}) {
    if (!routes[name]) { console.warn('Route inconnue:', name); return; }
    const prev = currentRoute;
    currentRoute = name;

    const container = document.getElementById('view-container');
    const nav = document.getElementById('bottom-nav');

    const protectedRoutes = ['home','recharge','virement','retrait','gerer','historique','notification','beneficiaires'];
    const authRoutes      = ['welcome','login','register','confirmation'];

    if (protectedRoutes.includes(name)) {
      if (!AuthService.isAuthenticated()) { go('login'); return; }
      nav.classList.remove('hidden');
      container.classList.add('with-nav');
      // Update active tab
      document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.route === name);
      });
    } else {
      nav.classList.add('hidden');
      container.classList.remove('with-nav');
    }

    const html = routes[name](params);
    container.innerHTML = `<div class="view">${html}</div>`;

    // Run after-render hooks
    document.dispatchEvent(new CustomEvent('view:rendered', { detail: { route: name, params } }));
    container.scrollTop = 0;
  }

  function getCurrent() { return currentRoute; }

  return { register, go, getCurrent };
})();

/* ─── Toast ────────────────────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', duration = 3000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), duration + 300);
    setTimeout(() => el.style.opacity = '0', duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
};

/* ─── Modal (bottom sheet) ─────────────────────────────────────── */
const Modal = {
  show(html) {
    const overlay   = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    container.innerHTML = `<div class="modal-handle"></div>${html}`;
    overlay.classList.remove('hidden');
    container.classList.remove('hidden');
    overlay.addEventListener('click', () => Modal.hide(), { once: true });
  },
  hide() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').classList.add('hidden');
  },
};

/* ─── Confirm dialog ───────────────────────────────────────────── */
function showConfirm(title, msg, onConfirm, danger = false) {
  Modal.show(`
    <div class="modal-title">${title}</div>
    <p style="color:var(--text-secondary);font-size:14px;line-height:1.5;margin-bottom:24px;">${msg}</p>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-secondary" onclick="Modal.hide()">Annuler</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${danger ? 'Confirmer' : 'OK'}</button>
    </div>
  `);
  document.getElementById('confirm-ok').onclick = () => { Modal.hide(); onConfirm(); };
}

/* ─── App State ────────────────────────────────────────────────── */
const AppState = {
  user: null,
  operations: [],
  notifications: [],
  beneficiaires: [],
  notifNonLues: 0,
  loaded: false,

  setUser(u) {
    this.user = u;
    TokenStore.saveUser(u);
  },

  async loadData(refresh = false) {
    if (this.loaded && !refresh) return;
    try {
      const [opsRes, notifsRes] = await Promise.all([
        AccountService.getOperations(),
        AccountService.getNotifications(),
      ]);
      if (opsRes.isSuccess)    { this.operations = opsRes.data.results || opsRes.data || []; }
      if (notifsRes.isSuccess) {
        this.notifications = notifsRes.data.results || notifsRes.data || [];
        this.notifNonLues  = this.notifications.filter(n => !n.lue).length;
      }
      this.loaded = true;
    } catch {}
  },
};

/* ══════════════════════════════════════════════════════════════
   VIEWS
══════════════════════════════════════════════════════════════ */

/* ─── Welcome / Splash ─────────────────────────────────────────── */
Router.register('welcome', () => {
  setTimeout(() => {
    if (AuthService.isAuthenticated()) {
      const u = TokenStore.getUser();
      AppState.setUser(u);
      Router.go('home');
    } else {
      Router.go('login');
    }
  }, 2000);
  return `<div style="height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--bg);">
    <div style="text-align:center;">
      <div style="width:80px;height:80px;border-radius:20px;background:linear-gradient(135deg,var(--gold),var(--gold-dark));display:flex;align-items:center;justify-content:center;margin:0 auto 16px;box-shadow:0 12px 40px rgba(218,174,84,0.3);">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 8C13.4 8 8 13.4 8 20S13.4 32 20 32 32 26.6 32 20 26.6 8 20 8Z" fill="white" fill-opacity="0.2"/><path d="M14 20H26M20 14V26" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
      <div style="font-size:28px;font-weight:900;letter-spacing:-1px;background:linear-gradient(135deg,var(--gold),var(--gold-dark));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AryadMoney</div>
      <p style="color:var(--text-muted);font-size:13px;margin-top:8px;">Votre portefeuille mobile</p>
      <div style="margin-top:48px;width:120px;height:3px;background:var(--surface);border-radius:2px;overflow:hidden;margin-left:auto;margin-right:auto;">
        <div style="height:100%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:2px;animation:loadBar 1.8s ease forwards;"></div>
      </div>
    </div>
  </div>`;
});

/* ─── Login ─────────────────────────────────────────────────────── */
Router.register('login', () => `
  <div class="auth-page" style="position:relative;">
    <div class="auth-logo">
      <div class="auth-logo-mark">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 6C11.4 6 6 11.4 6 18S11.4 30 18 30 30 24.6 30 18 24.6 6 18 6Z" fill="white" fill-opacity="0.2"/><path d="M12 18H24M18 12V24" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="auth-logo-text" style="font-size:22px;font-weight:900;background:linear-gradient(135deg,var(--gold),var(--gold-dark));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AryadMoney</div>
      </div>
    </div>
    <div>
      <h1 class="auth-title">Connexion</h1>
      <p class="auth-subtitle">Bienvenue ! Connectez-vous à votre compte.</p>
    </div>
    <div class="auth-form stagger">
      <div class="input-group">
        <label class="input-label">Téléphone</label>
        <div class="phone-row">
          <button class="country-select" id="login-country-btn">🇲🇦 +212 <span style="font-size:10px;margin-left:4px;">▼</span></button>
          <input class="input" id="login-tel" type="tel" placeholder="6 00 00 00 00" inputmode="tel" />
        </div>
        <div class="input-error-msg hidden" id="login-tel-err"></div>
      </div>
      <div class="input-group">
        <label class="input-label">Mot de passe</label>
        <div class="input-with-icon">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input class="input" id="login-pass" type="password" placeholder="Votre mot de passe" />
          <button class="input-action" id="login-pass-toggle" onclick="togglePassword('login-pass', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="input-error-msg hidden" id="login-pass-err"></div>
      </div>
      <button class="btn btn-ghost" style="font-size:13px;justify-content:flex-end;padding:0;" onclick="showForgotPassword()">Mot de passe oublié ?</button>
      <button class="btn btn-primary" id="login-btn" onclick="doLogin()">
        <span id="login-btn-text">Se connecter</span>
      </button>
    </div>
    <div class="auth-footer">
      Pas de compte ? <a href="#" onclick="Router.go('register')">Créer un compte</a>
    </div>
  </div>
`);

/* ─── Register ──────────────────────────────────────────────────── */
Router.register('register', () => `
  <div class="auth-page" style="position:relative;">
    <button class="auth-back" onclick="Router.go('login')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div style="margin-top:8px;">
      <h1 class="auth-title">Créer un compte</h1>
      <p class="auth-subtitle">Rejoignez AryadMoney pour gérer vos transferts facilement.</p>
    </div>
    <div class="auth-form stagger">
      <div class="input-group">
        <label class="input-label">Téléphone</label>
        <div class="phone-row">
          <button class="country-select" id="reg-country-btn">🇲🇦 +212 <span style="font-size:10px;margin-left:4px;">▼</span></button>
          <input class="input" id="reg-tel" type="tel" placeholder="6 00 00 00 00" inputmode="tel" />
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Email</label>
        <div class="input-with-icon">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <input class="input" id="reg-email" type="email" placeholder="votre@email.com" />
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Mot de passe</label>
        <div class="input-with-icon">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input class="input" id="reg-pass" type="password" placeholder="Minimum 8 caractères" />
          <button class="input-action" onclick="togglePassword('reg-pass', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <div id="reg-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" id="reg-btn" onclick="doRegister()">
        <span id="reg-btn-text">Créer mon compte</span>
      </button>
    </div>
    <div class="auth-footer">
      Déjà un compte ? <a href="#" onclick="Router.go('login')">Se connecter</a>
    </div>
  </div>
`);

/* ─── Confirmation OTP ──────────────────────────────────────────── */
Router.register('confirmation', (params) => {
  const email = params.maskedEmail || '****@****.com';
  const phone  = params.telephone || '';
  const pays   = params.codePays  || 'MA';
  return `
  <div class="auth-page centered" style="position:relative;">
    <button class="auth-back" onclick="Router.go('register')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div style="width:72px;height:72px;background:var(--gold-faint);border:2px solid rgba(218,174,84,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    </div>
    <h1 class="auth-title" style="font-size:24px;">Vérification OTP</h1>
    <p class="auth-subtitle" style="max-width:280px;">Un code a été envoyé à<br><strong style="color:var(--text-primary);">${email}</strong></p>

    <div class="step-dots" style="margin:24px 0 28px;">
      <div class="step-dot done"></div>
      <div class="step-dot active"></div>
      <div class="step-dot"></div>
    </div>

    <div class="otp-group" id="otp-group" style="margin-bottom:8px;">
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
      <input class="otp-box" maxlength="1" inputmode="numeric" pattern="[0-9]" />
    </div>
    <div id="otp-error" class="input-error-msg hidden" style="margin-bottom:16px;"></div>

    <button class="btn btn-primary" id="otp-btn" onclick="doVerifyOtp('${phone}','${pays}')" style="max-width:320px;margin-top:8px;">
      <span id="otp-btn-text">Valider</span>
    </button>
    <button class="btn btn-ghost" id="resend-btn" onclick="doResendOtp('${phone}','${pays}')" style="font-size:13px;max-width:320px;margin-top:8px;">
      Renvoyer le code
    </button>
  </div>
  `;
});

/* ─── Home ──────────────────────────────────────────────────────── */
Router.register('home', () => {
  const user = AppState.user || TokenStore.getUser() || {};
  const prenom = user.prenom || user.nom || 'Utilisateur';
  const solde  = user.solde  ?? 0;
  const devise = user.devise || 'MAD';
  const rib    = user.rib    || '——';

  return `
  <div class="view" style="min-height:100%;">
    <!-- Header -->
    <div class="home-header">
      <div class="home-logo-text">AryadMoney</div>
      <div class="home-actions">
        <button class="notif-badge" onclick="Router.go('notification')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          ${AppState.notifNonLues > 0 ? `<span class="notif-count">${AppState.notifNonLues}</span>` : ''}
        </button>
        <button class="btn-icon" onclick="Router.go('gerer')">
          <div class="avatar avatar-sm">${getInitials(user.nom, user.prenom)}</div>
        </button>
      </div>
    </div>

    <div class="home-content stagger">
      <!-- Account Card -->
      <div class="account-card">
        <div class="account-card-header">
          <div>
            <div class="account-greeting">Bonjour,</div>
            <div class="account-name">${prenom}</div>
          </div>
          <div class="account-badge">Actif</div>
        </div>
        <div class="account-balance-section">
          <div class="balance-label">
            Solde disponible
            <button class="balance-toggle" onclick="toggleBalance(this)">
              <svg id="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <div class="balance-amount" id="balance-display">
            <span id="balance-val" class="mono">${formatMontant(solde, '')}</span>
            <span class="balance-currency">${devise}</span>
          </div>
        </div>
        <div class="account-rib">
          <div>
            <div class="rib-label">RIB</div>
            <div class="rib-value">${formatRib(rib)}</div>
          </div>
          <button class="copy-btn" onclick="copyToClipboard('${rib}')">COPIER</button>
        </div>
      </div>

      <!-- Quick Actions -->
      <div>
        <div class="section-header"><div class="section-title">Actions rapides</div></div>
        <div class="quick-actions">
          <button class="quick-action" onclick="Router.go('virement')">
            <div class="quick-action-icon gold"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>
            <span>Virement</span>
          </button>
          <button class="quick-action" onclick="Router.go('recharge')">
            <div class="quick-action-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
            <span>Recharge</span>
          </button>
          <button class="quick-action" onclick="Router.go('retrait')">
            <div class="quick-action-icon red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg></div>
            <span>Retrait</span>
          </button>
          <button class="quick-action" onclick="Router.go('beneficiaires')">
            <div class="quick-action-icon blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg></div>
            <span>Bénéficiaires</span>
          </button>
        </div>
      </div>

      <!-- Recent Operations -->
      <div>
        <div class="section-header">
          <div class="section-title">Dernières opérations</div>
          <button class="section-link" onclick="Router.go('historique')">VOIR TOUT</button>
        </div>
        <div id="home-ops">
          ${renderOperationsSkeleton()}
        </div>
      </div>
    </div>
  </div>`;
});

/* ─── Historique ────────────────────────────────────────────────── */
Router.register('historique', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Historique</h1>
      <button class="header-action" onclick="loadHistorique(true)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
      </button>
    </div>

    <!-- Search -->
    <div style="padding:12px 20px;">
      <div class="input-with-icon">
        <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input class="input" id="hist-search" type="search" placeholder="Rechercher..." oninput="filterHistorique()" />
      </div>
    </div>

    <!-- Filters -->
    <div style="padding:0 20px 12px;display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;">
      <button class="chip active" data-filter="all" onclick="setHistFilter(this,'all')">Tout</button>
      <button class="chip" data-filter="virement" onclick="setHistFilter(this,'virement')">Virements</button>
      <button class="chip" data-filter="recharge" onclick="setHistFilter(this,'recharge')">Recharges</button>
      <button class="chip" data-filter="retrait" onclick="setHistFilter(this,'retrait')">Retraits</button>
      <button class="chip" data-filter="reception" onclick="setHistFilter(this,'reception')">Reçus</button>
    </div>

    <div id="hist-list" style="padding:0 20px 16px;">
      ${renderOperationsSkeleton()}
    </div>
  </div>
`);

/* ─── Virement ──────────────────────────────────────────────────── */
Router.register('virement', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Virement</h1>
    </div>

    <!-- Solde -->
    ${renderSoldeBanner()}

    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:20px;">
      <!-- Step 1: Recipient -->
      <div>
        <div class="section-header"><div class="section-title">Destinataire</div></div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="phone-row">
            <button class="country-select" id="vir-country-btn">🇲🇦 +212 <span style="font-size:10px;margin-left:4px;">▼</span></button>
            <input class="input" id="vir-tel" type="tel" placeholder="Numéro de téléphone" inputmode="tel" />
          </div>
          <div id="vir-tel-err" class="input-error-msg hidden"></div>
        </div>

        <!-- Bénéficiaires rapides -->
        <div style="margin-top:14px;">
          <div class="section-title" style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">RÉCENTS</div>
          <div id="vir-benes" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;">
            ${renderBeneSkeletons()}
          </div>
        </div>
      </div>

      <!-- Step 2: Amount -->
      <div>
        <div class="section-header"><div class="section-title">Montant</div></div>
        <div class="amount-display" style="background:var(--surface);border-radius:var(--radius);padding:24px 16px;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;">
            <span class="amount-val mono" id="vir-amount-display">0</span>
            <span class="currency" style="font-size:18px;color:var(--text-muted);font-weight:600;">MAD</span>
          </div>
          <input type="hidden" id="vir-montant" value="0" />
          <div class="amount-hint" style="font-size:11px;color:var(--text-muted);margin-top:4px;">Solde: ${formatMontant(AppState.user?.solde||0,'MAD')}</div>
        </div>
        <div class="amount-presets" style="margin-top:10px;">
          ${[50,100,200,500,1000].map(v => `<button class="amount-preset" onclick="setAmount(${v})">${v} MAD</button>`).join('')}
        </div>
        <!-- Numeric Keypad -->
        <div style="margin-top:14px;">${renderKeypad('vir')}</div>
      </div>

      <!-- Motif -->
      <div class="input-group">
        <label class="input-label">Motif (optionnel)</label>
        <input class="input" id="vir-motif" type="text" placeholder="Ex: loyer, remboursement..." />
      </div>

      <div id="vir-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" id="vir-btn" onclick="doVirementConfirm()">
        <span id="vir-btn-text">Continuer</span>
      </button>
    </div>
  </div>
`);

/* ─── Recharge ──────────────────────────────────────────────────── */
Router.register('recharge', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Recharge Compte</h1>
    </div>
 
    ${renderSoldeBanner()}
 
    <!-- Tab Bar -->
    <div style="padding:12px 20px 0;">
      <div class="tab-bar">
        <button class="tab-item active" data-tab="demande" onclick="switchRechargeTab(this)">
          <span>💳 Demande</span>
        </button>
        <button class="tab-item" data-tab="ticket" onclick="switchRechargeTab(this)">
          <span>🎫 Ticket</span>
        </button>
        <button class="tab-item" data-tab="suivi" onclick="switchRechargeTab(this)">
          <span>📋 Suivi</span>
        </button>
      </div>
    </div>
 
    <!-- ═══ TAB DEMANDE ═══════════════════════════════════════════ -->
    <div id="tab-demande" style="padding:20px;display:flex;flex-direction:column;gap:20px;">
 
      <!-- Step 1 : Mode de paiement -->
      <div>
        <div class="section-title" style="margin-bottom:4px;">Mode de paiement</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Choisissez comment vous allez effectuer votre dépôt</p>
        <div id="rch-modes-list" style="display:flex;flex-direction:column;gap:10px;">
          <div class="spinner-full"><div class="spinner-circle"></div></div>
        </div>
      </div>
 
      <!-- Infos de paiement (apparaît après sélection du mode) -->
      <div id="rch-payment-info" class="hidden">
        <div style="background:var(--gold-faint);border:1px solid rgba(218,174,84,0.3);border-radius:var(--radius);padding:16px;">
          <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:10px;letter-spacing:0.5px;">INFORMATIONS DE PAIEMENT</div>
          <div id="rch-payment-info-content"></div>
          <button onclick="copyPaymentInfo()" style="margin-top:12px;font-size:12px;font-weight:700;color:var(--gold);background:none;display:flex;align-items:center;gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copier les infos
          </button>
        </div>
      </div>
 
      <!-- Step 2 : Montant et devise -->
      <div id="rch-montant-section" class="hidden">
        <div class="section-title" style="margin-bottom:4px;">Montant versé</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          Entrez exactement le montant que vous avez envoyé — devise : <strong id="rch-devise-label" style="color:var(--gold);">MAD</strong>
        </p>
        <div class="input-group">
          <div style="position:relative;">
            <input class="input" id="rch-montant" type="number" placeholder="Ex: 500"
              inputmode="decimal" style="padding-right:60px;"
              oninput="validateMontantRecharge()" />
            <span id="rch-devise-badge" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:var(--gold);font-family:var(--font-mono);">MAD</span>
          </div>
        </div>
        <div class="amount-presets" style="margin-top:10px;" id="rch-presets"></div>
      </div>
 
      <!-- Step 3 : Numéro de transaction -->
      <div id="rch-ref-section" class="hidden">
        <div class="section-title" style="margin-bottom:4px;">Numéro de transaction</div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
          Entrez la référence fournie par votre banque ou opérateur lors du paiement
        </p>
        <div class="input-group">
          <input class="input mono" id="rch-num-transaction" type="text"
            placeholder="Ex: TXN-20240401-123456"
            style="letter-spacing:1px;" />
          <div id="rch-num-error" class="input-error-msg hidden"></div>
        </div>
      </div>
 
      <!-- Bouton soumettre -->
      <div id="rch-submit-section" class="hidden">
        <div style="background:var(--surface);border-radius:var(--radius);padding:14px;margin-bottom:16px;font-size:12px;color:var(--text-muted);line-height:1.6;">
          ⏱ Délai de traitement : <strong style="color:var(--text-primary);">24 heures</strong><br>
          📧 Votre ticket sera envoyé par <strong style="color:var(--text-primary);">email</strong> une fois validé
        </div>
        <div id="rch-error" class="input-error-msg hidden" style="margin-bottom:12px;"></div>
        <button class="btn btn-primary" id="rch-btn" onclick="soumettreDemande()">
          <span id="rch-btn-text">Soumettre la demande</span>
        </button>
      </div>
    </div>
 
    <!-- ═══ TAB TICKET ════════════════════════════════════════════ -->
    <div id="tab-ticket" style="padding:20px;display:none;flex-direction:column;gap:18px;">
      <div style="text-align:center;padding:20px 0;">
        <div style="width:64px;height:64px;background:var(--gold-faint);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
        </div>
        <p style="font-size:13px;color:var(--text-muted);">Entrez le code de votre ticket de recharge reçu par email</p>
      </div>
      <div class="input-group">
        <label class="input-label">Code du ticket</label>
        <input class="input mono" id="ticket-code" type="text"
          placeholder="TKT-XXXXXXXXXX"
          style="letter-spacing:2px;font-size:16px;text-align:center;text-transform:uppercase;"
          oninput="this.value=this.value.toUpperCase()" />
      </div>
      <div id="ticket-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" onclick="doTicketRecharge()">Valider le ticket</button>
    </div>
 
    <!-- ═══ TAB SUIVI ═════════════════════════════════════════════ -->
    <div id="tab-suivi" style="padding:20px;display:none;flex-direction:column;gap:12px;">
      <div id="suivi-list">
        <div class="spinner-full"><div class="spinner-circle"></div></div>
      </div>
    </div>
 
  </div>
`);


/* ─── Retrait ───────────────────────────────────────────────────── */
Router.register('retrait', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Retrait</h1>
    </div>

    ${renderSoldeBanner()}

    <div style="padding:20px;display:flex;flex-direction:column;gap:20px;">
      <div style="background:var(--gold-faint);border:1px solid rgba(218,174,84,0.3);border-radius:var(--radius);padding:12px 14px;display:flex;gap:10px;align-items:flex-start;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
        <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;">Vous allez générer un code de retrait. Utilisez-le auprès d'un agent agréé AryadMoney.</p>
      </div>

      <div>
        <label class="input-label" style="display:block;margin-bottom:12px;">Montant du retrait</label>
        <div class="amount-display" style="background:var(--surface);border-radius:var(--radius);padding:24px 16px;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
            <span class="amount-val mono" id="ret-amount-display">0</span>
            <span style="font-size:18px;color:var(--text-muted);font-weight:600;">MAD</span>
          </div>
          <input type="hidden" id="ret-montant" value="0" />
        </div>
        <div class="amount-presets" style="margin-top:10px;">
          ${[100,200,500,1000,2000].map(v => `<button class="amount-preset" onclick="setRetraitAmount(${v})">${v}</button>`).join('')}
        </div>
        <div style="margin-top:14px;">${renderKeypad('ret')}</div>
      </div>

      <div class="input-group">
        <label class="input-label">PIN de sécurité</label>
        <div class="input-with-icon">
          <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input class="input" id="ret-pin" type="password" maxlength="6" placeholder="••••••" inputmode="numeric" style="letter-spacing:6px;font-size:20px;" />
          <button class="input-action" onclick="togglePassword('ret-pin', this)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div id="ret-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" onclick="doRetraitConfirm()">Générer le code</button>
    </div>
  </div>
`);

/* ─── Bénéficiaires ─────────────────────────────────────────────── */
Router.register('beneficiaires', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Bénéficiaires</h1>
      <button class="header-action" onclick="showAddBene()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>

    <!-- Search -->
    <div style="padding:12px 20px;">
      <div class="input-with-icon">
        <svg class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input class="input" id="bene-search" type="search" placeholder="Rechercher un bénéficiaire..." oninput="filterBenes()" />
      </div>
    </div>

    <div id="bene-list" style="padding:0 20px 16px;">
      ${renderBeneListSkeleton()}
    </div>
  </div>
`);

/* ─── Notifications ─────────────────────────────────────────────── */
Router.register('notification', () => `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Notifications</h1>
      <button class="header-action" id="mark-all-btn" onclick="markAllRead()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </div>
    <div id="notif-list">
      ${renderNotifSkeleton()}
    </div>
  </div>
`);

/* ─── Gérer (Profile / Settings) ───────────────────────────────── */
Router.register('gerer', () => {
  const user = AppState.user || TokenStore.getUser() || {};
  return `
  <div>
    <div class="page-header">
      <button class="back-btn" onclick="Router.go('home')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <h1>Mon Compte</h1>
    </div>

    <!-- Profile card -->
    <div style="padding:20px;text-align:center;">
      <div class="avatar avatar-xl" style="margin:0 auto 12px;">${getInitials(user.nom, user.prenom)}</div>
      <div style="font-size:20px;font-weight:800;">${user.prenom || ''} ${user.nom || ''}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">${user.telephone || ''}</div>
      <div style="font-size:13px;color:var(--text-muted);">${user.email || ''}</div>
    </div>

    <!-- Settings Sections -->
    <div style="padding:0 20px 32px;">
      <div class="card" style="margin-bottom:12px;">
        <div class="date-group-label" style="margin-bottom:4px;">COMPTE</div>
        <div class="settings-row" onclick="showEditProfile()">
          <div class="settings-icon gold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-label">Profil</div>
            <div class="settings-sub">Nom, téléphone, email</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
        <div class="settings-row" onclick="showChangePinModal()">
          <div class="settings-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-label">Changer le PIN</div>
            <div class="settings-sub">Sécurisez votre compte</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      <div class="card" style="margin-bottom:12px;">
        <div class="date-group-label" style="margin-bottom:4px;">PRÉFÉRENCES</div>
        <div class="settings-row">
          <div class="settings-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-label">Notifications</div>
            <div class="settings-sub">Recevoir les alertes</div>
          </div>
          <div class="toggle on" id="notif-toggle" onclick="this.classList.toggle('on')"></div>
        </div>
        <div class="settings-row" onclick="router_go_historique()">
          <div class="settings-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/></svg>
          </div>
          <div class="settings-text">
            <div class="settings-label">Historique</div>
            <div class="settings-sub">Toutes vos transactions</div>
          </div>
          <svg class="settings-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>

      <div class="card">
        <div class="settings-row" onclick="doLogout()">
          <div class="settings-icon red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </div>
          <div class="settings-text"><div class="settings-label" style="color:var(--error);">Déconnexion</div></div>
        </div>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:11px;color:var(--text-muted);">
        AryadMoney v1.0.0 · <span style="color:var(--gold);">PWA</span>
      </div>
    </div>
  </div>`;
});

/* ══════════════════════════════════════════════════════════════
   SKELETON HELPERS
══════════════════════════════════════════════════════════════ */
function renderOperationsSkeleton() {
  return Array(4).fill(0).map(() => `
    <div class="tx-item">
      <div class="skeleton skeleton-circle" style="width:40px;height:40px;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton skeleton-text" style="width:60%;"></div>
        <div class="skeleton skeleton-text" style="width:35%;height:10px;"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
        <div class="skeleton skeleton-text" style="width:70px;"></div>
        <div class="skeleton skeleton-text" style="width:40px;height:10px;"></div>
      </div>
    </div>
  `).join('');
}

function renderBeneSkeletons() {
  return Array(4).fill(0).map(() => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
      <div class="skeleton skeleton-circle" style="width:48px;height:48px;"></div>
      <div class="skeleton skeleton-text" style="width:48px;height:10px;"></div>
    </div>
  `).join('');
}

function renderBeneListSkeleton() {
  return Array(5).fill(0).map(() => `
    <div class="bene-item">
      <div class="skeleton skeleton-circle" style="width:44px;height:44px;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton skeleton-text" style="width:55%;"></div>
        <div class="skeleton skeleton-text" style="width:40%;height:10px;"></div>
      </div>
    </div>
  `).join('');
}

function renderNotifSkeleton() {
  return Array(5).fill(0).map(() => `
    <div class="notif-item">
      <div class="skeleton skeleton-circle" style="width:8px;height:8px;margin-top:4px;"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton skeleton-text" style="width:70%;"></div>
        <div class="skeleton skeleton-text" style="width:90%;height:10px;"></div>
        <div class="skeleton skeleton-text" style="width:30%;height:10px;"></div>
      </div>
    </div>
  `).join('');
}

function renderSoldeBanner() {
  const user   = AppState.user || TokenStore.getUser() || {};
  const solde  = user.solde  ?? 0;
  const devise = user.devise || 'MAD';
  return `
    <div style="margin:12px 20px 0;padding:12px 16px;background:var(--surface);border-radius:var(--radius);display:flex;align-items:center;gap:10px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:500;">Solde disponible</div>
        <div style="font-size:16px;font-weight:800;font-family:var(--font-mono);">${formatMontant(solde, devise)}</div>
      </div>
    </div>`;
}

function renderKeypad(id) {
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
    ${keys.map(k => `<button onclick="keypadPress('${id}','${k}')" style="height:52px;background:var(--surface);border-radius:var(--radius);font-size:${k==='⌫'?'20px':'18px'};font-weight:600;color:var(--text-primary);transition:all .15s;" onmousedown="this.style.background='var(--surface-light)'" onmouseup="this.style.background='var(--surface)'">${k}</button>`).join('')}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════════════ */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.style.color = isPass ? 'var(--gold)' : 'var(--text-muted)';
}

function setLoading(btnId, textId, loading, text = 'Chargement...') {
  const btn = document.getElementById(btnId);
  const txt = document.getElementById(textId);
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    if (txt) txt.innerHTML = `<div class="spinner"></div>${text}`;
  } else {
    btn.disabled = false;
    if (txt) txt.textContent = txt.dataset.orig || '';
  }
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).then(() => Toast.success('Copié !'));
}

function formatRib(rib = '') {
  return rib.replace(/(.{4})/g, '$1 ').trim();
}

function router_go_historique() { Router.go('historique'); }

/* ─── Balance toggle ───────────────────────────────────────────── */
let balanceHidden = false;
function toggleBalance(btn) {
  balanceHidden = !balanceHidden;
  const el = document.getElementById('balance-display');
  if (el) el.classList.toggle('hidden-val', balanceHidden);
}

/* ─── Country selector ─────────────────────────────────────────── */
let currentCountry = { id: 'vir', code: 'MA' };

function showCountryPicker(forId) {
  currentCountry.id = forId;
  const html = Object.entries(COUNTRIES).map(([code, c]) => `
    <button onclick="selectCountry('${code}')" style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 0;border-bottom:1px solid rgba(88,94,101,0.3);">
      <span style="font-size:22px;">${c.flag}</span>
      <span style="font-size:15px;font-weight:600;">${code}</span>
      <span style="color:var(--text-muted);font-size:13px;">${c.code}</span>
    </button>
  `).join('');
  Modal.show(`<div class="modal-title">Choisir le pays</div>${html}`);
}

function selectCountry(code) {
  Modal.hide();
  const id = currentCountry.id;
  const btn = document.getElementById(`${id}-country-btn`);
  if (btn) btn.innerHTML = `${COUNTRIES[code].label} <span style="font-size:10px;margin-left:4px;">▼</span>`;
  currentCountry.code = code;
}

/* ─── Keypad logic ─────────────────────────────────────────────── */
const keypadValues = {};
function keypadPress(id, key) {
  if (!keypadValues[id]) keypadValues[id] = '0';
  let val = keypadValues[id];
  if (key === '⌫') { val = val.length > 1 ? val.slice(0, -1) : '0'; }
  else if (key === '.') { if (!val.includes('.')) val += '.'; }
  else {
    if (val === '0') val = key;
    else val += key;
  }
  keypadValues[id] = val;
  const display = document.getElementById(`${id}-amount-display`);
  if (display) { display.textContent = val; display.classList.toggle('has-value', parseFloat(val) > 0); }
  const hidden = document.getElementById(`${id}-montant`);
  if (hidden) hidden.value = val;
}

function setAmount(v) {
  keypadValues['vir'] = String(v);
  const d = document.getElementById('vir-amount-display');
  if (d) { d.textContent = v; d.classList.add('has-value'); }
  const h = document.getElementById('vir-montant');
  if (h) h.value = v;
}
function setRetraitAmount(v) {
  keypadValues['ret'] = String(v);
  const d = document.getElementById('ret-amount-display');
  if (d) { d.textContent = v; d.classList.add('has-value'); }
  const h = document.getElementById('ret-montant');
  if (h) h.value = v;
}
function setRechargeAmount(v, btn) {
  document.querySelectorAll('.amount-preset').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const inp = document.getElementById('rch-montant');
  if (inp) inp.value = v;
}

/* ─── Tab switch (recharge) ────────────────────────────────────── */
function switchRechargeTab(btn) {
  const tab = btn.dataset.tab;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.toggle('active', b === btn));
  ['demande', 'ticket', 'suivi'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = t === tab ? 'flex' : 'none';
  });
  if (tab === 'suivi') loadSuivi();
}

function selectOperator(btn) {
  document.querySelectorAll('.operator-card').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

/* ─── Filter historique ────────────────────────────────────────── */
let histFilter = 'all';
function setHistFilter(btn, type) {
  histFilter = type;
  document.querySelectorAll('.chip').forEach(b => b.classList.toggle('active', b === btn));
  renderHistoriqueList();
}
function filterHistorique() { renderHistoriqueList(); }

function renderHistoriqueList() {
  const q    = (document.getElementById('hist-search')?.value || '').toLowerCase();
  let ops    = [...AppState.operations];
  if (histFilter !== 'all') ops = ops.filter(o => o.type === histFilter);
  if (q) ops = ops.filter(o => (o.nom||'').toLowerCase().includes(q) || (o.reference||'').includes(q));

  const grouped = {};
  ops.forEach(o => {
    const key = formatDateGroup(o.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(o);
  });

  const list = document.getElementById('hist-list');
  if (!list) return;
  if (!ops.length) { list.innerHTML = emptyState('receipt', 'Aucune opération', 'Aucun résultat pour ce filtre.'); return; }

  list.innerHTML = Object.entries(grouped).map(([date, items]) => `
    <div class="date-group-label">${date}</div>
    ${items.map(renderOpItem).join('')}
  `).join('');
}

function renderOpItem(op) {
  const type  = op.type || 'virement';
  const label = { virement:'VIR', recharge:'RCH', retrait:'RET', reception:'REC' }[type] || 'OP';
  const isDebit = type === 'virement' || type === 'retrait';
  const sign    = isDebit ? '-' : '+';
  const cls     = isDebit ? 'debit' : 'credit';
  const statCls = { success:'success', pending:'pending', failed:'failed' }[op.statut] || 'success';
  const statLbl = { success:'Succès', pending:'En cours', failed:'Échoué' }[op.statut] || 'OK';
  return `
    <div class="tx-item" onclick="showOpDetail(${JSON.stringify(op).replace(/'/g,"&#39;")})">
      <div class="tx-badge ${type.substring(0,3)}">${label}</div>
      <div class="tx-info">
        <div class="tx-name">${op.nom || 'Inconnu'}</div>
        <div class="tx-date">${formatDate(op.date)}</div>
      </div>
      <div class="tx-amount">
        <div class="amount ${cls}">${sign}${formatMontant(op.montant, op.devise||'MAD')}</div>
        <div class="tx-status ${statCls}">${statLbl}</div>
      </div>
    </div>`;
}

function emptyState(icon, title, sub) {
  const icons = {
    receipt: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    notif:   '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    people:  '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  };
  return `<div class="empty-state">
    <div class="empty-icon">${icons[icon]||''}</div>
    <div class="empty-title">${title}</div>
    <div class="empty-sub">${sub}</div>
  </div>`;
}

/* ─── Op detail modal ──────────────────────────────────────────── */
function showOpDetail(op) {
  if (typeof op === 'string') op = JSON.parse(op);
  const isDebit = op.type === 'virement' || op.type === 'retrait';
  Modal.show(`
    <div class="modal-title">Détails de l'opération</div>
    <div class="confirm-amount-big">${isDebit?'-':'+'} ${formatMontant(op.montant, op.devise||'MAD')}</div>
    <div class="confirm-card">
      <div class="confirm-row"><span class="confirm-key">Type</span><span class="confirm-val">${op.type}</span></div>
      <div class="confirm-row"><span class="confirm-key">Nom</span><span class="confirm-val">${op.nom}</span></div>
      ${op.telephone ? `<div class="confirm-row"><span class="confirm-key">Téléphone</span><span class="confirm-val mono">${op.telephone}</span></div>` : ''}
      ${op.reference ? `<div class="confirm-row"><span class="confirm-key">Référence</span><span class="confirm-val mono">${op.reference}</span></div>` : ''}
      ${op.motif ? `<div class="confirm-row"><span class="confirm-key">Motif</span><span class="confirm-val">${op.motif}</span></div>` : ''}
      <div class="confirm-row"><span class="confirm-key">Date</span><span class="confirm-val">${formatDate(op.date)}</span></div>
      <div class="confirm-row"><span class="confirm-key">Statut</span><span class="confirm-val tx-status ${op.statut}">${op.statut}</span></div>
    </div>
    <button class="btn btn-secondary" onclick="Modal.hide()">Fermer</button>
  `);
}

/* ─── Bénéficiaires list ───────────────────────────────────────── */
function renderBeneList(list) {
  const q = (document.getElementById('bene-search')?.value || '').toLowerCase();
  const filtered = q ? list.filter(b => (b.nom+b.prenom+b.telephone).toLowerCase().includes(q)) : list;
  const el = document.getElementById('bene-list');
  if (!el) return;
  if (!filtered.length) { el.innerHTML = emptyState('people', 'Aucun bénéficiaire', 'Ajoutez des bénéficiaires pour des virements rapides.'); return; }
  el.innerHTML = filtered.map(b => `
    <div class="bene-item">
      <div class="avatar avatar-md">${getInitials(b.nom, b.prenom)}</div>
      <div class="bene-info">
        <div class="bene-name">${b.prenom} ${b.nom}</div>
        <div class="bene-phone">${COUNTRIES[b.pays]?.flag||''} ${b.telephone}</div>
      </div>
      <button onclick="startVirementToBene(${JSON.stringify(b).replace(/'/g,'&#39;')})" style="background:var(--gold-faint);color:var(--gold);border:1px solid rgba(218,174,84,0.3);border-radius:var(--radius-sm);padding:6px 12px;font-size:12px;font-weight:700;">Virer</button>
      <button onclick="confirmDeleteBene('${b.id}')" style="background:rgba(229,57,53,0.1);color:var(--error);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  `).join('');
}

function filterBenes() {
  renderBeneList(AppState.beneficiaires);
}

function startVirementToBene(b) {
  if (typeof b === 'string') b = JSON.parse(b);
  Router.go('virement');
  setTimeout(() => {
    const tel = document.getElementById('vir-tel');
    if (tel) tel.value = b.telephone;
  }, 100);
}

function confirmDeleteBene(id) {
  showConfirm('Supprimer', 'Voulez-vous supprimer ce bénéficiaire ?', async () => {
    const r = await AccountService.deleteBeneficiaire(id);
    if (r.isSuccess) {
      AppState.beneficiaires = AppState.beneficiaires.filter(b => b.id !== id);
      renderBeneList(AppState.beneficiaires);
      Toast.success('Bénéficiaire supprimé.');
    } else Toast.error(r.error);
  }, true);
}

function showAddBene() {
  Modal.show(`
    <div class="modal-title">Ajouter un bénéficiaire</div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="input-group"><label class="input-label">Prénom</label><input class="input" id="bene-prenom" placeholder="Prénom" /></div>
      <div class="input-group"><label class="input-label">Nom</label><input class="input" id="bene-nom" placeholder="Nom" /></div>
      <div class="input-group">
        <label class="input-label">Téléphone</label>
        <div class="phone-row">
          <button class="country-select" id="bene-country-btn" onclick="showCountryPicker('bene')">🇲🇦 +212 <span style="font-size:10px;margin-left:4px;">▼</span></button>
          <input class="input" id="bene-tel" type="tel" placeholder="6 00 00 00 00" inputmode="tel" />
        </div>
      </div>
      <div id="bene-add-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" onclick="doAddBene()">Ajouter</button>
    </div>
  `);
}

/* ─── Notifications render ─────────────────────────────────────── */
function renderNotifications(list) {
  const el = document.getElementById('notif-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = `<div style="padding:20px;">${emptyState('notif', 'Aucune notification', 'Vous êtes à jour !')}</div>`; return; }
  el.innerHTML = list.map(n => `
    <div class="notif-item ${n.lue ? '' : 'unread'}" onclick="markRead('${n.id}', this)">
      <div class="notif-dot ${n.lue ? 'read' : ''}"></div>
      <div class="notif-body">
        <div class="notif-title">${n.titre}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${formatDate(n.date)}</div>
      </div>
    </div>
  `).join('');
}

async function markRead(id, el) {
  el.classList.remove('unread');
  el.querySelector('.notif-dot')?.classList.add('read');
  await AccountService.markNotifRead(id);
  const n = AppState.notifications.find(n => n.id === id);
  if (n) n.lue = true;
  AppState.notifNonLues = AppState.notifications.filter(n => !n.lue).length;
}

async function markAllRead() {
  await AccountService.markAllRead();
  AppState.notifications.forEach(n => n.lue = true);
  AppState.notifNonLues = 0;
  document.querySelectorAll('.notif-item').forEach(el => {
    el.classList.remove('unread');
    el.querySelector('.notif-dot')?.classList.add('read');
  });
  Toast.success('Toutes les notifications lues.');
}

/* ══════════════════════════════════════════════════════════════
   AUTH ACTIONS
══════════════════════════════════════════════════════════════ */
async function doLogin() {
  const tel  = document.getElementById('login-tel')?.value.trim();
  const pass = document.getElementById('login-pass')?.value;
  if (!tel || !pass) { Toast.error('Remplissez tous les champs.'); return; }

  document.getElementById('login-btn').disabled = true;
  document.getElementById('login-btn-text').innerHTML = '<div class="spinner"></div> Connexion...';

  const codePays = currentCountry.code || 'MA';
  const r = await AuthService.login({ telephone: tel, codePays, motDePasse: pass });

  document.getElementById('login-btn').disabled = false;
  document.getElementById('login-btn-text').textContent = 'Se connecter';

  if (r.isSuccess) {
    AppState.setUser(r.data);
    await AppState.loadData();
    Router.go('home');
  } else if (r.statusCode === 403) {
    // Compte non vérifié — envoyer un nouveau code OTP et rediriger
    Toast.info('Compte non vérifié. Un nouveau code vous a été envoyé.');
    await AuthService.resendOtp({ telephone: tel, codePays });
    Router.go('confirmation', {
      maskedEmail: '****@****.com',
      telephone: tel,
      codePays,
    });
  } else {
    Toast.error(r.error);
  }
}

async function doRegister() {
  const tel   = document.getElementById('reg-tel')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const pass  = document.getElementById('reg-pass')?.value;
  hideError('reg-error');

  if (!tel || !email || !pass) { showError('reg-error', 'Remplissez tous les champs.'); return; }

  document.getElementById('reg-btn').disabled = true;
  document.getElementById('reg-btn-text').innerHTML = '<div class="spinner"></div> Création...';

  const r = await AuthService.register({ telephone: tel, codePays: currentCountry.code || 'MA', email, motDePasse: pass });

  document.getElementById('reg-btn').disabled = false;
  document.getElementById('reg-btn-text').textContent = 'Créer mon compte';

  if (r.isSuccess) {
    Router.go('confirmation', {
      maskedEmail: r.data?.email_masque || email,
      telephone:   r.data?.telephone   || tel,
      codePays:    r.data?.code_pays   || currentCountry.code || 'MA',
    });
  } else {
    showError('reg-error', r.error);
  }
}

async function doVerifyOtp(telephone, codePays) {
  const boxes = document.querySelectorAll('.otp-box');
  const code  = Array.from(boxes).map(b => b.value).join('');
  hideError('otp-error');
  if (code.length < 6) { showError('otp-error', 'Entrez le code à 6 chiffres.'); return; }

  document.getElementById('otp-btn').disabled = true;
  document.getElementById('otp-btn-text').innerHTML = '<div class="spinner"></div> Vérification...';

  const r = await AuthService.verifyOtp({ telephone, codePays, code });

  document.getElementById('otp-btn').disabled = false;
  document.getElementById('otp-btn-text').textContent = 'Valider';

  if (r.isSuccess) {
    AppState.setUser(r.data);
    await AppState.loadData();
    Router.go('home');
  } else {
    showError('otp-error', r.error);
  }
}

async function doResendOtp(telephone, codePays) {
  const r = await AuthService.resendOtp({ telephone, codePays });
  if (r.isSuccess) Toast.success('Code renvoyé !');
  else Toast.error(r.error);
}

function showForgotPassword() {
  Modal.show(`
    <div class="modal-title">Mot de passe oublié</div>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">Entrez votre téléphone pour recevoir un code de réinitialisation.</p>
    <div class="phone-row" style="margin-bottom:16px;">
      <button class="country-select">🇲🇦 +212 <span style="font-size:10px;margin-left:4px;">▼</span></button>
      <input class="input" id="forgot-tel" type="tel" placeholder="6 00 00 00 00" inputmode="tel" />
    </div>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-secondary" onclick="Modal.hide()">Annuler</button>
      <button class="btn btn-primary" onclick="doForgotPass()">Envoyer</button>
    </div>
  `);
}

async function doForgotPass() {
  const tel = document.getElementById('forgot-tel')?.value.trim();
  if (!tel) return;
  Modal.hide();
  await AuthService.forgotPassword({ telephone: tel, codePays: 'MA' });
  Toast.success('Code envoyé par SMS si le compte existe.');
}

async function doLogout() {
  showConfirm('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', async () => {
    await AuthService.logout();
    AppState.user = null;
    AppState.operations = [];
    AppState.notifications = [];
    AppState.loaded = false;
    Router.go('login');
  }, true);
}

/* ══════════════════════════════════════════════════════════════
   TRANSACTION ACTIONS
══════════════════════════════════════════════════════════════ */
async function doVirementConfirm() {
  const tel    = document.getElementById('vir-tel')?.value.trim();
  const montant = parseFloat(document.getElementById('vir-montant')?.value || '0');
  const motif  = document.getElementById('vir-motif')?.value.trim();
  hideError('vir-error');

  if (!tel) { showError('vir-error', 'Entrez un numéro de téléphone.'); return; }
  if (!montant || montant <= 0) { showError('vir-error', 'Entrez un montant valide.'); return; }
  const solde = AppState.user?.solde || 0;
  if (montant > solde) { showError('vir-error', 'Solde insuffisant.'); return; }

  Modal.show(`
    <div class="modal-title">Confirmer le virement</div>
    <div class="confirm-amount-big">${formatMontant(montant, 'MAD')}</div>
    <div class="confirm-card">
      <div class="confirm-row"><span class="confirm-key">Destinataire</span><span class="confirm-val mono">${COUNTRIES[currentCountry.code||'MA']?.code} ${tel}</span></div>
      <div class="confirm-row"><span class="confirm-key">Montant</span><span class="confirm-val">${formatMontant(montant,'MAD')}</span></div>
      ${motif ? `<div class="confirm-row"><span class="confirm-key">Motif</span><span class="confirm-val">${motif}</span></div>` : ''}
    </div>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-secondary" onclick="Modal.hide()">Annuler</button>
      <button class="btn btn-primary" id="vir-confirm-btn" onclick="doVirement('${tel}','${currentCountry.code||'MA'}',${montant},'${motif}')">Confirmer</button>
    </div>
  `);
}

async function doVirement(tel, codePays, montant, motif) {
  const btn = document.getElementById('vir-confirm-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Envoi...'; }
  const r = await TransactionService.virement({ telephone: tel, codePays, montant, motif });
  Modal.hide();
  if (r.isSuccess) {
    Toast.success('Virement effectué avec succès !');
    if (AppState.user) AppState.user.solde -= montant;
    await AppState.loadData(true);
    Router.go('home');
  } else {
    Toast.error(r.error);
  }
}

async function doRechargeConfirm() {
  const tel    = document.getElementById('rch-tel')?.value.trim();
  const montant = parseFloat(document.getElementById('rch-montant')?.value || '0');
  const op     = document.querySelector('.operator-card.selected')?.dataset.op || 'Maroc Telecom';
  hideError('rch-error');
  if (!tel) { showError('rch-error', 'Entrez un numéro.'); return; }
  if (!montant || montant < 10) { showError('rch-error', 'Montant minimum 10 MAD.'); return; }

  const r = await TransactionService.rechargeRequest({ telephone: tel, codePays: 'MA', montant, operateur: op });
  if (r.isSuccess) { Toast.success('Recharge envoyée !'); Router.go('home'); }
  else showError('rch-error', r.error);
}

async function doTicketRecharge() {
  const code = document.getElementById('ticket-code')?.value.trim();
  hideError('ticket-error');
  if (!code) { showError('ticket-error', 'Entrez le code du ticket.'); return; }
  const r = await TransactionService.rechargeTicket({ code });
  if (r.isSuccess) { Toast.success('Ticket validé !'); Router.go('home'); }
  else showError('ticket-error', r.error);
}

async function doRetraitConfirm() {
  const montant = parseFloat(document.getElementById('ret-montant')?.value || '0');
  const pin     = document.getElementById('ret-pin')?.value;
  hideError('ret-error');
  if (!montant || montant <= 0) { showError('ret-error', 'Entrez un montant valide.'); return; }
  if (!pin || pin.length < 4) { showError('ret-error', 'PIN invalide.'); return; }

  Modal.show(`
    <div class="modal-title">Confirmer le retrait</div>
    <div class="confirm-amount-big">${formatMontant(montant,'MAD')}</div>
    <p style="color:var(--text-secondary);font-size:13px;text-align:center;margin-bottom:16px;">Un code de retrait vous sera transmis. Présentez-le à un agent agréé.</p>
    <div style="display:flex;gap:12px;">
      <button class="btn btn-secondary" onclick="Modal.hide()">Annuler</button>
      <button class="btn btn-primary" id="ret-confirm-btn" onclick="doRetrait(${montant},'${pin}')">Générer</button>
    </div>
  `);
}

async function doRetrait(montant, pin) {
  const btn = document.getElementById('ret-confirm-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }
  const r = await TransactionService.retrait({ montant, pin });
  Modal.hide();
  if (r.isSuccess) {
    const code = r.data?.code || r.data?.retrait_code || 'XXXX-XXXX';
    Modal.show(`
      <div class="modal-title" style="text-align:center;">Code de retrait</div>
      <div style="background:var(--bg);border-radius:var(--radius);padding:24px;text-align:center;margin-bottom:16px;">
        <div style="font-size:32px;font-weight:900;font-family:var(--font-mono);letter-spacing:4px;color:var(--gold);">${code}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Valable 30 minutes</div>
      </div>
      <button class="btn btn-secondary" onclick="copyToClipboard('${code}');Toast.success('Code copié !')">📋 Copier</button>
      <button class="btn btn-ghost" onclick="Modal.hide();Router.go('home')">Fermer</button>
    `);
  } else {
    Toast.error(r.error);
  }
}

async function doAddBene() {
  const prenom = document.getElementById('bene-prenom')?.value.trim();
  const nom    = document.getElementById('bene-nom')?.value.trim();
  const tel    = document.getElementById('bene-tel')?.value.trim();
  hideError('bene-add-error');
  if (!prenom || !nom || !tel) { showError('bene-add-error', 'Remplissez tous les champs.'); return; }
  const r = await AccountService.addBeneficiaire({ nom, prenom, telephone: tel, pays: 'MA' });
  Modal.hide();
  if (r.isSuccess) {
    AppState.beneficiaires.push(r.data);
    renderBeneList(AppState.beneficiaires);
    Toast.success('Bénéficiaire ajouté !');
  } else Toast.error(r.error);
}

/* ─── Profile / Settings modals ───────────────────────────────── */
function showEditProfile() {
  const user = AppState.user || {};
  Modal.show(`
    <div class="modal-title">Modifier le profil</div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="input-group"><label class="input-label">Prénom</label><input class="input" id="ep-prenom" value="${user.prenom||''}" /></div>
      <div class="input-group"><label class="input-label">Nom</label><input class="input" id="ep-nom" value="${user.nom||''}" /></div>
      <div class="input-group"><label class="input-label">Email</label><input class="input" id="ep-email" type="email" value="${user.email||''}" /></div>
      <button class="btn btn-primary" onclick="doEditProfile()">Enregistrer</button>
    </div>
  `);
}

async function doEditProfile() {
  const prenom = document.getElementById('ep-prenom')?.value.trim();
  const nom    = document.getElementById('ep-nom')?.value.trim();
  const email  = document.getElementById('ep-email')?.value.trim();
  const r = await AccountService.updateProfile({ prenom, nom, email });
  Modal.hide();
  if (r.isSuccess) { AppState.setUser(r.data); Toast.success('Profil mis à jour !'); }
  else Toast.error(r.error);
}

function showChangePinModal() {
  Modal.show(`
    <div class="modal-title">Changer le PIN</div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="input-group"><label class="input-label">PIN actuel</label><input class="input mono" id="cp-old" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" /></div>
      <div class="input-group"><label class="input-label">Nouveau PIN</label><input class="input mono" id="cp-new" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" /></div>
      <div class="input-group"><label class="input-label">Confirmer PIN</label><input class="input mono" id="cp-conf" type="password" maxlength="6" inputmode="numeric" placeholder="••••••" /></div>
      <div id="cp-error" class="input-error-msg hidden"></div>
      <button class="btn btn-primary" onclick="doChangePin()">Modifier</button>
    </div>
  `);
}

async function doChangePin() {
  const old  = document.getElementById('cp-old')?.value;
  const newP = document.getElementById('cp-new')?.value;
  const conf = document.getElementById('cp-conf')?.value;
  hideError('cp-error');
  if (newP !== conf) { showError('cp-error', 'Les PINs ne correspondent pas.'); return; }
  if (newP.length < 4) { showError('cp-error', 'PIN minimum 4 chiffres.'); return; }
  const r = await AccountService.changePin({ oldPin: old, newPin: newP });
  Modal.hide();
  if (r.isSuccess) Toast.success('PIN modifié avec succès !');
  else Toast.error(r.error);
}

/* ══════════════════════════════════════════════════════════════
   EVENT LISTENERS (post-render hooks)
══════════════════════════════════════════════════════════════ */
document.addEventListener('view:rendered', async ({ detail: { route, params } }) => {
  // OTP keyboard navigation
  if (route === 'confirmation') {
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        if (box.value && i < boxes.length - 1) boxes[i+1].focus();
      });
      box.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !box.value && i > 0) boxes[i-1].focus();
      });
    });
    boxes[0]?.focus();
  }

  // Country picker buttons
  document.getElementById('login-country-btn')?.addEventListener('click', () => showCountryPicker('login'));
  document.getElementById('reg-country-btn')?.addEventListener('click',   () => showCountryPicker('reg'));
  document.getElementById('vir-country-btn')?.addEventListener('click',   () => showCountryPicker('vir'));
  document.getElementById('rch-country-btn')?.addEventListener('click',   () => showCountryPicker('rch'));

  // Load data for views
  if (route === 'home') {
    await AppState.loadData();
    const ops = AppState.operations.slice(0, 5);
    const homeOps = document.getElementById('home-ops');
    if (homeOps) {
      homeOps.innerHTML = ops.length ? ops.map(renderOpItem).join('') : emptyState('receipt', 'Aucune opération', 'Vos transactions apparaîtront ici.');
    }
    // Update notif badge
    const notifCount = document.querySelector('.notif-count');
    if (AppState.notifNonLues > 0) {
      if (!notifCount) {
        const btn = document.querySelector('.notif-badge');
        if (btn) btn.innerHTML += `<span class="notif-count">${AppState.notifNonLues}</span>`;
      }
    }
  }

  if (route === 'historique') {
    await AppState.loadData();
    renderHistoriqueList();
  }

  if (route === 'notification') {
    await AppState.loadData();
    renderNotifications(AppState.notifications);
  }

  if (route === 'beneficiaires') {
    const r = await AccountService.getBeneficiaires();
    AppState.beneficiaires = r.isSuccess ? (r.data.results || r.data || []) : [];
    renderBeneList(AppState.beneficiaires);
  }

  if (route === 'virement') {
    const r = await AccountService.getBeneficiaires();
    if (r.isSuccess) {
      AppState.beneficiaires = r.data.results || r.data || [];
      const benes = document.getElementById('vir-benes');
      if (benes) {
        if (AppState.beneficiaires.length === 0) {
          benes.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Aucun bénéficiaire enregistré.</span>';
        } else {
          benes.innerHTML = AppState.beneficiaires.slice(0,6).map(b => `
            <button onclick="quickSelectBene('${b.telephone}')" style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;background:none;">
              <div class="avatar avatar-md">${getInitials(b.nom, b.prenom)}</div>
              <span style="font-size:11px;color:var(--text-secondary);max-width:52px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${b.prenom}</span>
            </button>
          `).join('');
        }
      }
    }
  }

  if (route === 'recharge') {
  await initRechargeView();
}

  // Scroll detection for header
  document.getElementById('view-container')?.addEventListener('scroll', function() {
    const header = document.querySelector('.page-header');
    if (header) header.classList.toggle('scrolled', this.scrollTop > 10);
  }, { passive: true });
});

function quickSelectBene(tel) {
  const inp = document.getElementById('vir-tel');
  if (inp) inp.value = tel;
}

async function loadHistorique(refresh) {
  await AppState.loadData(refresh);
  renderHistoriqueList();
}

/* ─── Bottom nav click ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      if (route) Router.go(route);
    });
  });

  // Auth logout event
  window.addEventListener('auth:logout', () => Router.go('login'));

  // Start app
  const splash = document.getElementById('splash-screen');
  const app    = document.getElementById('app');

  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      splash.style.display = 'none';
      app.classList.remove('hidden');
      Router.go('welcome');
    }, 400);
  }, 1800);
});

/* ─── PWA Install prompt ───────────────────────────────────────── */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  // Could show a custom install button here
});


/* ═══════════════════════════════════════════════════════════════
   RECHARGE — fonctions à coller à la fin de app.js
   ═══════════════════════════════════════════════════════════════ */

let _rchModes      = [];
let _rchModeSelect = null;
let _rchDevise     = 'MAD';

async function initRechargeView() {
  const r = await RechargeService.getModes();
  if (r.isFailure) {
    document.getElementById('rch-modes-list').innerHTML =
      '<p style="color:var(--error);font-size:13px;">Impossible de charger les modes de paiement.</p>';
    return;
  }
  _rchModes  = r.data.modes || [];
  _rchDevise = r.data.devise || 'MAD';
  _rchModeSelect = null;
  const badge = document.getElementById('rch-devise-badge');
  const label = document.getElementById('rch-devise-label');
  if (badge) badge.textContent = _rchDevise;
  if (label) label.textContent = _rchDevise;
  const presets = _rchDevise === 'MAD' ? [100,200,500,1000,2000] : [1000,5000,10000,25000,50000];
  const presetsEl = document.getElementById('rch-presets');
  if (presetsEl) {
    presetsEl.innerHTML = presets.map(v =>
      `<button class="amount-preset" onclick="setRchPreset(${v})">${v} ${_rchDevise}</button>`
    ).join('');
  }
  renderModesPaiement(_rchModes);
  loadSuivi();
}
 
function setRchPreset(v) {
  document.querySelectorAll('#rch-presets .amount-preset').forEach(b => b.classList.remove('selected'));
  event.target.classList.add('selected');
  const inp = document.getElementById('rch-montant');
  if (inp) inp.value = v;
  validateMontantRecharge();
}
 
function renderModesPaiement(modes) {
  const el = document.getElementById('rch-modes-list');
  if (!el) return;
 
  if (!modes.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">Aucun mode disponible pour votre pays.</p>';
    return;
  }
 
  el.innerHTML = modes.map(m => `
    <button class="mode-card" data-mode-id="${m.id}" onclick="selectMode('${m.id}')"
      style="display:flex;align-items:center;gap:14px;width:100%;
             background:var(--surface);border-radius:var(--radius);
             padding:14px 16px;border:2px solid transparent;
             transition:all var(--transition);text-align:left;">
      <div style="width:40px;height:40px;border-radius:10px;background:var(--bg);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${m.type === 'rib'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
        }
      </div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${m.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${m.info}</div>
      </div>
      <div style="width:20px;height:20px;border-radius:50%;border:2px solid var(--border);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0;"
           id="mode-radio-${m.id}">
      </div>
    </button>
  `).join('');
}
 
function selectMode(modeId) {
  _rchModeSelect = _rchModes.find(m => m.id === modeId) || null;
  if (!_rchModeSelect) return;
 
  // Reset les radios
  document.querySelectorAll('.mode-card').forEach(card => {
    card.style.borderColor = 'transparent';
    const radio = card.querySelector('[id^=mode-radio-]');
    if (radio) radio.innerHTML = '';
  });
 
  // Sélectionne
  const selectedCard = document.querySelector(`[data-mode-id="${modeId}"]`);
  if (selectedCard) {
    selectedCard.style.borderColor = 'var(--gold)';
    const radio = selectedCard.querySelector(`#mode-radio-${modeId}`);
    if (radio) {
      radio.style.borderColor = 'var(--gold)';
      radio.innerHTML = '<div style="width:10px;height:10px;border-radius:50%;background:var(--gold);"></div>';
    }
  }
 
  // Affiche les infos de paiement
  afficherInfosPaiement(_rchModeSelect);
 
  // Affiche les sections suivantes
  document.getElementById('rch-montant-section')?.classList.remove('hidden');
  document.getElementById('rch-ref-section')?.classList.remove('hidden');
  document.getElementById('rch-submit-section')?.classList.remove('hidden');
}
 
function afficherInfosPaiement(mode) {
  const el = document.getElementById('rch-payment-info');
  const content = document.getElementById('rch-payment-info-content');
  if (!el || !content) return;
 
  el.classList.remove('hidden');
 
  if (mode.type === 'rib') {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:11px;color:var(--text-muted);">Banque</div>
        <div style="font-size:15px;font-weight:700;">${mode.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">RIB / IBAN</div>
        <div style="font-size:14px;font-weight:700;font-family:var(--font-mono);
                    letter-spacing:1px;word-break:break-all;">${mode.rib}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Libellé du virement</div>
        <div style="font-size:13px;font-weight:600;">AryadMoney — ${AppState.user?.telephone || ''}</div>
      </div>`;
  } else {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:11px;color:var(--text-muted);">Opérateur</div>
        <div style="font-size:15px;font-weight:700;">${mode.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Code Agent</div>
        <div style="font-size:28px;font-weight:900;font-family:var(--font-mono);
                    letter-spacing:3px;color:var(--gold);">${mode.agent_code}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
          Rendez-vous chez un agent ${mode.label} et effectuez un dépôt sur ce code agent
        </div>
      </div>`;
  }
}
 
function copyPaymentInfo() {
  if (!_rchModeSelect) return;
  const info = _rchModeSelect.type === 'rib'
    ? `${_rchModeSelect.label}\nRIB: ${_rchModeSelect.rib}\nLibellé: AryadMoney — ${AppState.user?.telephone || ''}`
    : `${_rchModeSelect.label}\nCode Agent: ${_rchModeSelect.agent_code}`;
  navigator.clipboard?.writeText(info).then(() => Toast.success('Infos copiées !'));
}
 
function validateMontantRecharge() {
  const val = parseFloat(document.getElementById('rch-montant')?.value || '0');
  const err  = document.getElementById('rch-error');
  if (err) {
    if (val > 0 && val < 10) {
      err.textContent = `Montant minimum 10 ${_rchDevise}.`;
      err.classList.remove('hidden');
    } else {
      err.classList.add('hidden');
    }
  }
}
 
async function soumettreDemande() {
  hideError('rch-error');
 
  if (!_rchModeSelect) {
    showError('rch-error', 'Sélectionnez un mode de paiement.');
    return;
  }
 
  const montant = parseFloat(document.getElementById('rch-montant')?.value || '0');
  const numTx   = document.getElementById('rch-num-transaction')?.value.trim();
 
  if (!montant || montant < 10) {
    showError('rch-error', `Montant minimum 10 ${_rchDevise}.`);
    return;
  }
  if (!numTx || numTx.length < 4) {
    showError('rch-error', 'Entrez un numéro de transaction valide.');
    return;
  }
 
  const btn  = document.getElementById('rch-btn');
  const text = document.getElementById('rch-btn-text');
  btn.disabled = true;
  text.innerHTML = '<div class="spinner"></div> Envoi...';
 
  const r = await RechargeService.soumettreDemande({
    mode_paiement:      _rchModeSelect.id,
    numero_transaction: numTx,
    montant:            montant,
    devise:             _rchDevise,
  });
 
  btn.disabled = false;
  text.textContent = 'Soumettre la demande';
 
  if (r.isSuccess) {
    // Affiche confirmation
    Modal.show(`
      <div class="modal-title" style="text-align:center;">Demande envoyée ✅</div>
      <div style="text-align:center;padding:8px 0 20px;">
        <div style="width:64px;height:64px;background:rgba(76,175,80,0.15);border-radius:50%;
                    display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">
          Votre demande de <strong style="color:var(--text-primary);">${montant} ${_rchDevise}</strong>
          via <strong style="color:var(--text-primary);">${_rchModeSelect.label}</strong>
          a bien été reçue.<br><br>
          Délai de traitement : <strong style="color:var(--gold);">24 heures</strong><br>
          Vous recevrez votre ticket par <strong style="color:var(--text-primary);">email</strong>.
        </p>
      </div>
      <button class="btn btn-primary" onclick="Modal.hide();Router.go('home');">Retour à l'accueil</button>
      <button class="btn btn-ghost" onclick="Modal.hide();switchRechargeTabById('suivi');" style="margin-top:8px;font-size:13px;">Suivre ma demande</button>
    `);
  } else {
    showError('rch-error', r.error);
  }
}
 
/* ─── Suivi des demandes ─────────────────────────────────────────── */
async function loadSuivi() {
  const el = document.getElementById('suivi-list');
  if (!el) return;
 
  const r = await RechargeService.getMesDemandes();
  if (r.isFailure) {
    el.innerHTML = '<p style="color:var(--error);font-size:13px;">Impossible de charger le suivi.</p>';
    return;
  }
 
  const demandes = r.data?.data || [];
  if (!demandes.length) {
    el.innerHTML = emptyState('receipt', 'Aucune demande', 'Vous n\'avez pas encore soumis de demande de recharge.');
    return;
  }
 
  const statutConfig = {
    en_attente: { label: 'En attente',  color: 'var(--warning)',  bg: 'rgba(255,152,0,0.12)',  icon: '⏱' },
    validee:    { label: 'Validée',     color: 'var(--success)',  bg: 'rgba(76,175,80,0.12)',  icon: '✅' },
    rejetee:    { label: 'Rejetée',     color: 'var(--error)',    bg: 'rgba(229,57,53,0.12)',  icon: '❌' },
  };
 
  el.innerHTML = demandes.map(d => {
    const s = statutConfig[d.statut] || statutConfig.en_attente;
    return `
    <div style="background:var(--surface);border-radius:var(--radius);padding:16px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-size:14px;font-weight:700;">${d.mode_label}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${formatDate(d.date)}</div>
        </div>
        <div style="background:${s.bg};color:${s.color};font-size:11px;font-weight:700;
                    padding:4px 10px;border-radius:20px;white-space:nowrap;">
          ${s.icon} ${s.label}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid rgba(88,94,101,0.3);">
        <div>
          <div style="font-size:11px;color:var(--text-muted);">Montant</div>
          <div style="font-size:16px;font-weight:800;font-family:var(--font-mono);">${d.montant} ${d.devise}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--text-muted);">Réf. paiement</div>
          <div style="font-size:12px;font-family:var(--font-mono);font-weight:600;">${d.numero_transaction}</div>
        </div>
      </div>
      ${d.ticket_code ? `
        <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);
                    display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);">TICKET</div>
            <div style="font-size:14px;font-weight:900;font-family:var(--font-mono);
                        letter-spacing:2px;color:var(--gold);">${d.ticket_code}</div>
          </div>
          <button onclick="copyToClipboard('${d.ticket_code}')"
            style="font-size:11px;font-weight:700;color:var(--gold);background:var(--gold-faint);
                   padding:4px 10px;border-radius:4px;">Copier</button>
        </div>
      ` : ''}
      ${d.motif_rejet ? `
        <div style="margin-top:8px;font-size:12px;color:var(--error);">Motif : ${d.motif_rejet}</div>
      ` : ''}
    </div>`;
  }).join('');
}
 
function switchRechargeTabById(tabId) {
  const tabs = { demande: 0, ticket: 1, suivi: 2 };
  const buttons = document.querySelectorAll('.tab-item');
  if (buttons[tabs[tabId]]) switchRechargeTab(buttons[tabs[tabId]]);
}

