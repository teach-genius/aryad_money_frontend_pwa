# AryadMoney PWA — Frontend

Application web progressive (PWA) **mobile-first** pour AryadMoney, portée web du projet Flutter.

---

## Structure des fichiers

```
assets/
├── index.html      ← Shell HTML, manifest link, bottom nav, splash screen
├── styles.css      ← Design system complet (CSS variables, composants, animations)
├── api.js          ← Services API (AuthService, AccountService, TransactionService)
├── app.js          ← Router SPA, vues, logique UI, actions
├── sw.js           ← Service Worker (cache, push notifications, offline)
├── manifest.json   ← PWA manifest (icônes, shortcuts, metadata)
└── icons/          ← (à générer) PNG 72, 96, 128, 144, 152, 192, 384, 512px
```

---

## Vues implémentées

| Route           | Vue                              |
|-----------------|----------------------------------|
| `/welcome`      | Splash / session check           |
| `/login`        | Connexion (téléphone + mot de passe) |
| `/register`     | Inscription                      |
| `/confirmation` | Vérification OTP (6 chiffres)    |
| `/home`         | Dashboard (solde, opérations)    |
| `/virement`     | Formulaire virement avec keypad  |
| `/recharge`     | Recharge mobile / ticket         |
| `/retrait`      | Retrait avec code PIN            |
| `/beneficiaires`| Liste et ajout de bénéficiaires  |
| `/historique`   | Toutes les transactions filtrées |
| `/notification` | Centre de notifications          |
| `/gerer`        | Profil, paramètres, déconnexion  |

---

## Configuration API

Dans `api.js`, ligne 10 :
```js
const API_BASE = 'https://votre-api.example.com/v1';
```
Remplacez par l'URL de votre backend Django.

---

## Endpoints attendus (Django)

```
POST /v1/auth/login
POST /v1/auth/register
POST /v1/auth/verify-otp
POST /v1/auth/resend-otp
POST /v1/auth/forgot-password
POST /v1/auth/refresh
POST /v1/auth/logout

GET  /v1/account/profile
PUT  /v1/account/profile
GET  /v1/account/operations?page=&type=
GET  /v1/account/notifications
PUT  /v1/account/notifications/:id/read
POST /v1/account/notifications/read-all
GET  /v1/account/beneficiaires
POST /v1/account/beneficiaires
DELETE /v1/account/beneficiaires/:id
POST /v1/account/change-pin

POST /v1/transactions/virement
POST /v1/transactions/recharge/demande
POST /v1/transactions/recharge/ticket
POST /v1/transactions/retrait
```

---

## Déploiement Django (servir la PWA)

```python
# settings.py
STATICFILES_DIRS = [BASE_DIR / 'frontend/assets']

# urls.py
from django.views.generic import TemplateView
urlpatterns = [
    path('api/', include('api.urls')),
    # Fallback SPA — toutes les routes non-API renvoyées à index.html
    re_path(r'^(?!api/).*$', TemplateView.as_view(template_name='index.html')),
]
```

```python
# django.conf.urls.static pour les icônes/assets en dev
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

---

## PWA — Génération des icônes

Utilisez [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator) :
```bash
npx pwa-asset-generator logo.svg ./assets/icons --manifest ./assets/manifest.json
```

---

## Couleurs

| Variable         | Valeur     | Usage                    |
|------------------|------------|--------------------------|
| `--bg`           | `#20262D`  | Fond principal           |
| `--surface`      | `#393F47`  | Cartes, inputs           |
| `--surface-light`| `#4A5260`  | États hover              |
| `--gold`         | `#DAAE54`  | Accent principal         |
| `--gold-dark`    | `#CB922F`  | Gradient gold            |
| `--blue`         | `#3F7497`  | Liens, actions secondaires|
| `--success`      | `#4CAF50`  | Confirmations            |
| `--error`        | `#E53935`  | Erreurs                  |

---

## Polices

- **Plus Jakarta Sans** — Interface principale (Google Fonts)
- **DM Mono** — Montants, RIB, codes (Google Fonts)