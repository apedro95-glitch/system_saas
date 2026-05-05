const TOPBRS_LANG_KEY = 'topbrs_language';
const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-ES'];
const LANGUAGE_LABELS = {
  'pt-BR': 'Português (BR)',
  'en-US': 'English (US)',
  'es-ES': 'Español (ES)'
};
const INLINE_I18N = {
  "pt-BR": {
    "language.name": "Português (BR)",
    "language.short": "PT",
    "language.title": "Idioma",
    "language.subtitle": "Escolha o idioma do sistema.",
    "language.current": "Português (BR)",
    "language.portuguese": "Português",
    "language.english": "English",
    "language.spanish": "Español",
    "language.apply": "Aplicar idioma",
    "common.close": "Fechar",
    "common.cancel": "Cancelar",
    "common.save": "Salvar",
    "common.loading": "Carregando...",
    "common.back": "Voltar",
    "common.continue": "Continuar",
    "auth.welcomeTitle": "Bem-vindo ao\nTopBRS Multi-Clã",
    "auth.welcomeText": "Gerencie seu clã com inteligência, estratégia e dados em tempo real.",
    "auth.registerClan": "Cadastre seu clã",
    "auth.clanTag": "Tag do clã",
    "auth.clanTagPlaceholder": "Ex: #ABC123",
    "auth.searchClan": "Buscar Clã",
    "auth.subscribeNow": "Assine agora!",
    "auth.clanFound": "Clã encontrado",
    "auth.confirmClan": "Confirmar Clã",
    "subscribe.eyebrow": "ASSINE AGORA",
    "subscribe.title": "Escolha seu plano",
    "subscribe.description": "Selecione o plano, escolha o período, preencha os dados do comprador e deixe o pedido pronto para o fluxo de pagamento automático.",
    "subscribe.clanPlan": "Plano do clã",
    "subscribe.clanPlanHint": "Escolha Básico, Plus ou Premium para avançar.",
    "subscribe.choose": "Escolher",
    "subscribe.basic": "Básico",
    "subscribe.plus": "Plus",
    "subscribe.premium": "Premium",
    "subscribe.entry": "Entrada",
    "subscribe.mostChosen": "Mais escolhido",
    "subscribe.elite": "Elite",
    "subscribe.basicText": "Plano básico que cabe no bolso!",
    "subscribe.plusText": "Selo exclusivo de Plus e mais personalizações.",
    "subscribe.premiumText": "Experiência PREMIUM completa 🔥",
    "subscribe.manageClan": "Gestão de clã",
    "subscribe.limitedCustomization": "Personalização limitada",
    "subscribe.moreAvatars": "Mais avatares e fundos",
    "subscribe.fullRelease": "Selo exclusivo e tudo liberado para todos os membros",
    "subscribe.support24": "Suporte 24h",
    "subscribe.paymentPeriod": "Período de pagamento",
    "subscribe.paymentPeriodHint": "Escolha mensal, semestral ou anual.",
    "subscribe.waitingPlan": "Aguardando plano",
    "subscribe.monthly": "Mensal",
    "subscribe.semiannual": "Semestral",
    "subscribe.annual": "Anual",
    "subscribe.buyerData": "Dados do comprador",
    "subscribe.buyerDataHint": "Preencha os dados para criar o pedido.",
    "subscribe.waitingPeriod": "Aguardando período",
    "subscribe.buyerName": "Nome do comprador",
    "subscribe.yourName": "Seu nome",
    "subscribe.email": "E-mail",
    "subscribe.emailPlaceholder": "seu@email.com",
    "subscribe.whatsapp": "WhatsApp",
    "subscribe.clanName": "Nome do clã",
    "subscribe.clanNamePlaceholder": "Nome do clã",
    "subscribe.optionalNote": "Observação opcional",
    "subscribe.optionalNotePlaceholder": "Mensagem para o suporte / SaaS",
    "subscribe.orderSummary": "Resumo do pedido",
    "subscribe.pendingOrder": "Pedido pendente",
    "subscribe.pendingPayment": "Aguardando conexão com o pagamento Mercado Pago.",
    "settings.title": "Configurações",
    "settings.subtitle": "Perfil, plano e sistema",
    "settings.profile": "Perfil",
    "settings.profileSubtitle": "Dados do membro",
    "settings.api": "API Clash",
    "settings.apiSubtitle": "Status da conexão",
    "settings.users": "Usuários",
    "settings.usersSubtitle": "Cadastros e permissões",
    "settings.language": "Idioma",
    "settings.languageSubtitle": "Português (BR)",
    "settings.security": "Segurança",
    "settings.securitySubtitle": "Senha e sessões",
    "settings.logout": "Sair do sistema",
    "settings.languagePopupTitle": "Idioma do sistema",
    "settings.languagePopupText": "Escolha o idioma usado nas telas do comprador, onboarding e sistema do clã. O Painel SaaS permanece em português.",
    "nav.war": "Guerra",
    "nav.classification": "Class.",
    "nav.members": "Membros",
    "nav.tournament": "Torneio",
    "nav.leadership": "Liderança",
    "nav.settings": "Config.",
    "subscribe.selected": "{{value}} selecionado",
    "subscribe.planChosenHint": "Plano escolhido. Toque na etapa se quiser trocar.",
    "subscribe.paymentPeriodChosenHint": "Período escolhido. Toque na etapa se quiser trocar.",
    "subscribe.buyerDataActiveHint": "Última etapa antes de criar o pedido pendente.",
    "subscribe.fillData": "Preencher dados",
    "subscribe.orderSummaryText": "Pedido será criado como pendente para integração Mercado Pago.",
    "subscribe.createPendingOrder": "Criar pedido pendente",
    "subscribe.creatingOrder": "Criando pedido...",
    "subscribe.requiredFields": "Preencha nome, e-mail e tag do clã.",
    "subscribe.pendingCreatedTitle": "Pedido pendente criado",
    "subscribe.pendingCreatedText": "Próxima etapa: conectar o botão ao Mercado Pago pela VPS/webhook para confirmação automática.",
    "subscribe.createdFeedback": "Pedido criado! Ele já fica preparado para o fluxo de pagamento automático no SaaS.",
    "subscribe.localSavedTitle": "Pedido salvo localmente",
    "subscribe.localSavedText": "Se o Firestore bloquear, envie o pedido pelo suporte para registro manual.",
    "subscribe.localSavedFeedback": "Pedido registrado neste aparelho. Se não aparecer no painel, envie pelo suporte."
  },
  "en-US": {
    "language.name": "English (US)",
    "language.short": "EN",
    "language.title": "Language",
    "language.subtitle": "Choose the system language.",
    "language.current": "English (US)",
    "language.portuguese": "Portuguese",
    "language.english": "English",
    "language.spanish": "Spanish",
    "language.apply": "Apply language",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.loading": "Loading...",
    "common.back": "Back",
    "common.continue": "Continue",
    "auth.welcomeTitle": "Welcome to\nTopBRS Multi-Clan",
    "auth.welcomeText": "Manage your clan with intelligence, strategy, and real-time data.",
    "auth.registerClan": "Register your clan",
    "auth.clanTag": "Clan tag",
    "auth.clanTagPlaceholder": "Example: #ABC123",
    "auth.searchClan": "Search clan",
    "auth.subscribeNow": "Subscribe now!",
    "auth.clanFound": "Clan found",
    "auth.confirmClan": "Confirm clan",
    "subscribe.eyebrow": "SUBSCRIBE NOW",
    "subscribe.title": "Choose your plan",
    "subscribe.description": "Select a plan, choose the billing period, enter buyer and clan details, and prepare the request for the automatic payment flow.",
    "subscribe.clanPlan": "Clan plan",
    "subscribe.clanPlanHint": "Choose Basic, Plus, or Premium to continue.",
    "subscribe.choose": "Choose",
    "subscribe.basic": "Basic",
    "subscribe.plus": "Plus",
    "subscribe.premium": "Premium",
    "subscribe.entry": "Starter",
    "subscribe.mostChosen": "Most chosen",
    "subscribe.elite": "Elite",
    "subscribe.basicText": "An affordable basic plan!",
    "subscribe.plusText": "Exclusive Plus badge and more customization.",
    "subscribe.premiumText": "Complete PREMIUM experience 🔥",
    "subscribe.manageClan": "Clan management",
    "subscribe.limitedCustomization": "Limited customization",
    "subscribe.moreAvatars": "More avatars and backgrounds",
    "subscribe.fullRelease": "Exclusive badge and everything unlocked for all members",
    "subscribe.support24": "24-hour support",
    "subscribe.paymentPeriod": "Billing period",
    "subscribe.paymentPeriodHint": "Choose monthly, semiannual, or annual.",
    "subscribe.waitingPlan": "Waiting for plan",
    "subscribe.monthly": "Monthly",
    "subscribe.semiannual": "Semiannual",
    "subscribe.annual": "Annual",
    "subscribe.buyerData": "Buyer data",
    "subscribe.buyerDataHint": "Fill in the details to create the request.",
    "subscribe.waitingPeriod": "Waiting for period",
    "subscribe.buyerName": "Buyer name",
    "subscribe.yourName": "Your name",
    "subscribe.email": "E-mail",
    "subscribe.emailPlaceholder": "you@email.com",
    "subscribe.whatsapp": "WhatsApp",
    "subscribe.clanName": "Clan name",
    "subscribe.clanNamePlaceholder": "Clan name",
    "subscribe.optionalNote": "Optional note",
    "subscribe.optionalNotePlaceholder": "Message for support / SaaS",
    "subscribe.orderSummary": "Order summary",
    "subscribe.pendingOrder": "Pending request",
    "subscribe.pendingPayment": "Waiting for Mercado Pago payment connection.",
    "settings.title": "Settings",
    "settings.subtitle": "Profile, plan, and system",
    "settings.profile": "Profile",
    "settings.profileSubtitle": "Member data",
    "settings.api": "Clash API",
    "settings.apiSubtitle": "Connection status",
    "settings.users": "Users",
    "settings.usersSubtitle": "Accounts and permissions",
    "settings.language": "Language",
    "settings.languageSubtitle": "English (US)",
    "settings.security": "Security",
    "settings.securitySubtitle": "Password and sessions",
    "settings.logout": "Sign out",
    "settings.languagePopupTitle": "System language",
    "settings.languagePopupText": "Choose the language used on buyer screens, onboarding, and the clan system. The SaaS admin panel remains in Portuguese.",
    "nav.war": "War",
    "nav.classification": "Rankings",
    "nav.members": "Members",
    "nav.tournament": "Tournament",
    "nav.leadership": "Leadership",
    "nav.settings": "Settings",
    "subscribe.selected": "{{value}} selected",
    "subscribe.planChosenHint": "Plan selected. Tap this step if you want to change it.",
    "subscribe.paymentPeriodChosenHint": "Billing period selected. Tap this step if you want to change it.",
    "subscribe.buyerDataActiveHint": "Final step before creating the pending request.",
    "subscribe.fillData": "Fill in data",
    "subscribe.orderSummaryText": "The request will be created as pending for Mercado Pago integration.",
    "subscribe.createPendingOrder": "Create pending request",
    "subscribe.creatingOrder": "Creating request...",
    "subscribe.requiredFields": "Fill in name, e-mail, and clan tag.",
    "subscribe.pendingCreatedTitle": "Pending request created",
    "subscribe.pendingCreatedText": "Next step: connect the button to Mercado Pago through the VPS/webhook for automatic confirmation.",
    "subscribe.createdFeedback": "Request created! It is ready for the automatic payment flow in SaaS.",
    "subscribe.localSavedTitle": "Request saved locally",
    "subscribe.localSavedText": "If Firestore blocks it, send the request through support for manual registration.",
    "subscribe.localSavedFeedback": "Request registered on this device. If it does not appear in the panel, send it through support."
  },
  "es-ES": {
    "language.name": "Español (ES)",
    "language.short": "ES",
    "language.title": "Idioma",
    "language.subtitle": "Elige el idioma del sistema.",
    "language.current": "Español (ES)",
    "language.portuguese": "Portugués",
    "language.english": "Inglés",
    "language.spanish": "Español",
    "language.apply": "Aplicar idioma",
    "common.close": "Cerrar",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.loading": "Cargando...",
    "common.back": "Volver",
    "common.continue": "Continuar",
    "auth.welcomeTitle": "Bienvenido a\nTopBRS Multi-Clan",
    "auth.welcomeText": "Gestiona tu clan con inteligencia, estrategia y datos en tiempo real.",
    "auth.registerClan": "Registra tu clan",
    "auth.clanTag": "Etiqueta del clan",
    "auth.clanTagPlaceholder": "Ejemplo: #ABC123",
    "auth.searchClan": "Buscar clan",
    "auth.subscribeNow": "¡Suscríbete ahora!",
    "auth.clanFound": "Clan encontrado",
    "auth.confirmClan": "Confirmar clan",
    "subscribe.eyebrow": "SUSCRÍBETE AHORA",
    "subscribe.title": "Elige tu plan",
    "subscribe.description": "Selecciona el plan, elige el período, completa los datos del comprador y deja la solicitud lista para el flujo de pago automático.",
    "subscribe.clanPlan": "Plan del clan",
    "subscribe.clanPlanHint": "Elige Básico, Plus o Premium para continuar.",
    "subscribe.choose": "Elegir",
    "subscribe.basic": "Básico",
    "subscribe.plus": "Plus",
    "subscribe.premium": "Premium",
    "subscribe.entry": "Entrada",
    "subscribe.mostChosen": "Más elegido",
    "subscribe.elite": "Élite",
    "subscribe.basicText": "¡Un plan básico económico!",
    "subscribe.plusText": "Sello exclusivo Plus y más personalización.",
    "subscribe.premiumText": "Experiencia PREMIUM completa 🔥",
    "subscribe.manageClan": "Gestión del clan",
    "subscribe.limitedCustomization": "Personalización limitada",
    "subscribe.moreAvatars": "Más avatares y fondos",
    "subscribe.fullRelease": "Sello exclusivo y todo desbloqueado para todos los miembros",
    "subscribe.support24": "Soporte 24 h",
    "subscribe.paymentPeriod": "Período de pago",
    "subscribe.paymentPeriodHint": "Elige mensual, semestral o anual.",
    "subscribe.waitingPlan": "Esperando plan",
    "subscribe.monthly": "Mensual",
    "subscribe.semiannual": "Semestral",
    "subscribe.annual": "Anual",
    "subscribe.buyerData": "Datos del comprador",
    "subscribe.buyerDataHint": "Completa los datos para crear la solicitud.",
    "subscribe.waitingPeriod": "Esperando período",
    "subscribe.buyerName": "Nombre del comprador",
    "subscribe.yourName": "Tu nombre",
    "subscribe.email": "E-mail",
    "subscribe.emailPlaceholder": "tu@email.com",
    "subscribe.whatsapp": "WhatsApp",
    "subscribe.clanName": "Nombre del clan",
    "subscribe.clanNamePlaceholder": "Nombre del clan",
    "subscribe.optionalNote": "Nota opcional",
    "subscribe.optionalNotePlaceholder": "Mensaje para soporte / SaaS",
    "subscribe.orderSummary": "Resumen del pedido",
    "subscribe.pendingOrder": "Solicitud pendiente",
    "subscribe.pendingPayment": "Esperando conexión con el pago de Mercado Pago.",
    "settings.title": "Configuración",
    "settings.subtitle": "Perfil, plan y sistema",
    "settings.profile": "Perfil",
    "settings.profileSubtitle": "Datos del miembro",
    "settings.api": "API Clash",
    "settings.apiSubtitle": "Estado de conexión",
    "settings.users": "Usuarios",
    "settings.usersSubtitle": "Registros y permisos",
    "settings.language": "Idioma",
    "settings.languageSubtitle": "Español (ES)",
    "settings.security": "Seguridad",
    "settings.securitySubtitle": "Contraseña y sesiones",
    "settings.logout": "Salir del sistema",
    "settings.languagePopupTitle": "Idioma del sistema",
    "settings.languagePopupText": "Elige el idioma usado en las pantallas del comprador, onboarding y sistema del clan. El Panel SaaS permanece en portugués.",
    "nav.war": "Guerra",
    "nav.classification": "Ranking",
    "nav.members": "Miembros",
    "nav.tournament": "Torneo",
    "nav.leadership": "Liderazgo",
    "nav.settings": "Config.",
    "subscribe.selected": "{{value}} seleccionado",
    "subscribe.planChosenHint": "Plan elegido. Toca esta etapa si quieres cambiarlo.",
    "subscribe.paymentPeriodChosenHint": "Período elegido. Toca esta etapa si quieres cambiarlo.",
    "subscribe.buyerDataActiveHint": "Última etapa antes de crear la solicitud pendiente.",
    "subscribe.fillData": "Completar datos",
    "subscribe.orderSummaryText": "La solicitud se creará como pendiente para integración con Mercado Pago.",
    "subscribe.createPendingOrder": "Crear solicitud pendiente",
    "subscribe.creatingOrder": "Creando solicitud...",
    "subscribe.requiredFields": "Completa nombre, e-mail y etiqueta del clan.",
    "subscribe.pendingCreatedTitle": "Solicitud pendiente creada",
    "subscribe.pendingCreatedText": "Siguiente etapa: conectar el botón a Mercado Pago por VPS/webhook para confirmación automática.",
    "subscribe.createdFeedback": "¡Solicitud creada! Ya queda preparada para el flujo de pago automático en SaaS.",
    "subscribe.localSavedTitle": "Solicitud guardada localmente",
    "subscribe.localSavedText": "Si Firestore la bloquea, envía la solicitud por soporte para registro manual.",
    "subscribe.localSavedFeedback": "Solicitud registrada en este dispositivo. Si no aparece en el panel, envíala por soporte."
  }
};
let currentLanguage = null;
let currentDictionary = {};

const I18N_STAGE2_ONBOARDING_KEYS = {
  "pt-BR": {
    "auth.alreadyMember": "Já é membro?",
    "auth.login": "Login",
    "auth.or": "ou",
    "auth.signup": "Cadastre-se",
    "auth.searching": "Buscando...",
    "auth.tryAgain": "Tentar novamente",
    "auth.email": "Email",
    "auth.emailPlaceholder": "seu@email.com",
    "auth.password": "Senha",
    "auth.passwordPlaceholder": "Sua senha",
    "auth.enter": "Entrar",
    "auth.loginTitle": "Acessar sistema",
    "auth.loginText": "Entre com seu email e senha para continuar.",
    "auth.forgotPassword": "Esqueci minha senha",
    "auth.noAccount": "Ainda não tem conta?",
    "auth.invalidLogin": "E-mail ou senha incorreto",
    "auth.entering": "Entrando...",
    "auth.enterEmailPassword": "Digite email e senha.",
    "auth.signupTitle": "Criar cadastro",
    "auth.signupText": "Valide sua tag para vincular seu perfil ao clã.",
    "auth.name": "Nome",
    "auth.namePlaceholder": "Seu nome",
    "auth.playerTag": "Tag do jogador",
    "auth.validate": "Validar",
    "auth.validating": "Validando...",
    "auth.validated": "Validado",
    "auth.nick": "Nick",
    "auth.nickAfterValidate": "Será preenchido após validar",
    "auth.createPassword": "Crie uma senha",
    "auth.confirmSignup": "Confirmar cadastro",
    "auth.hasAccount": "Já tem conta?",
    "auth.fillSignupFields": "Preencha email, senha, tag do clã e tag do jogador.",
    "auth.validateBeforeSignup": "Valide sua tag antes de confirmar o cadastro.",
    "auth.creatingSignup": "Criando cadastro...",
    "auth.enterTagToValidate": "Digite uma tag para validar.",
    "auth.enterClanTagFirst": "Digite a tag do clã antes de validar.",
    "auth.checkingPreRegistration": "Verificando pré-cadastro...",
    "auth.validationNotLoaded": "Validação do sistema ainda não carregou. Tente novamente.",
    "auth.tagNotPreRegistered": "Sua tag não está pré-cadastrada neste clã.",
    "auth.tagValidatedApi": "Tag validada na API e pré-cadastro encontrado.",
    "auth.tagValidatedPre": "Tag pré-cadastrada encontrada. Cadastro liberado.",
    "auth.tagValidationError": "Erro ao validar a tag. Tente novamente.",
    "auth.sheet.clanFound": "CLÃ ENCONTRADO",
    "auth.sheet.clanRegistered": "CLÃ JÁ CADASTRADO",
    "auth.sheet.notReleased": "ASSINATURA NÃO LIBERADA",
    "auth.sheet.apiUnavailable": "API INDISPONÍVEL",
    "auth.sheet.clanNotFound": "CLÃ NÃO ENCONTRADO",
    "auth.sheet.membersCount": "{{count}} membros",
    "auth.sheet.registeredTitle": "Clã já cadastrado",
    "auth.sheet.notReleasedTitle": "Clã sem liberação",
    "auth.sheet.apiErrorTitle": "Erro na API",
    "auth.sheet.notFoundTitle": "Clã não encontrado",
    "auth.sheet.registeredText": "Faça login ou solicite acesso ao administrador.",
    "auth.sheet.notReleasedText": "Assine agora ou fale com o suporte para liberar o teste.",
    "auth.sheet.apiErrorText": "O servidor não respondeu. Verifique o tunnel/API e tente novamente.",
    "auth.sheet.notFoundText": "Confira a tag e tente novamente.",
    "onboarding.title": "Onboarding",
    "onboarding.search": "Buscar",
    "onboarding.confirm": "Confirmar",
    "onboarding.import": "Importar",
    "onboarding.admin": "Admin",
    "onboarding.finish": "Concluir",
    "onboarding.clanFoundTitle": "Clã encontrado!",
    "onboarding.members": "Membros",
    "onboarding.trophies": "Troféus",
    "onboarding.country": "País",
    "onboarding.correctClan": "Este é o clã correto?",
    "onboarding.correctClanText": "Confira os dados acima e confirme para continuar.",
    "onboarding.searchAnotherClan": "Buscar outro clã",
    "onboarding.importingMembers": "Importando membros",
    "onboarding.importingMembersText": "Estamos buscando os membros do seu clã na API do Clash Royale.",
    "onboarding.importedSuccess": "Importados com sucesso",
    "onboarding.importingMembersProgress": "Importando membros...",
    "onboarding.doNotClose": "Não feche o app durante a importação.",
    "onboarding.createAdminTitle": "Criar conta admin",
    "onboarding.createAdminText": "Você será o administrador principal deste clã.",
    "onboarding.createAdminButton": "Criar conta e iniciar clã",
    "onboarding.successTitle": "Clã configurado!",
    "onboarding.successText": "O ambiente do seu clã está pronto para começar.",
    "onboarding.enterSystem": "Entrar no sistema",
    "settings.plan": "Plano",
    "settings.planSubtitle": "Assinatura, Add-On e pagamentos"
  },
  "en-US": {
    "auth.alreadyMember": "Already a member?",
    "auth.login": "Log in",
    "auth.or": "or",
    "auth.signup": "Sign up",
    "auth.searching": "Searching...",
    "auth.tryAgain": "Try again",
    "auth.email": "Email",
    "auth.emailPlaceholder": "you@email.com",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "Your password",
    "auth.enter": "Log in",
    "auth.loginTitle": "Access system",
    "auth.loginText": "Use your email and password to continue.",
    "auth.forgotPassword": "Forgot password",
    "auth.noAccount": "No account yet?",
    "auth.invalidLogin": "Incorrect email or password",
    "auth.entering": "Signing in...",
    "auth.enterEmailPassword": "Enter email and password.",
    "auth.signupTitle": "Create account",
    "auth.signupText": "Validate your tag to link your profile to the clan.",
    "auth.name": "Name",
    "auth.namePlaceholder": "Your name",
    "auth.playerTag": "Player tag",
    "auth.validate": "Validate",
    "auth.validating": "Validating...",
    "auth.validated": "Validated",
    "auth.nick": "Nick",
    "auth.nickAfterValidate": "Filled after validation",
    "auth.createPassword": "Create a password",
    "auth.confirmSignup": "Confirm account",
    "auth.hasAccount": "Already have an account?",
    "auth.fillSignupFields": "Fill email, password, clan tag, and player tag.",
    "auth.validateBeforeSignup": "Validate your tag before confirming the account.",
    "auth.creatingSignup": "Creating account...",
    "auth.enterTagToValidate": "Enter a tag to validate.",
    "auth.enterClanTagFirst": "Enter the clan tag before validating.",
    "auth.checkingPreRegistration": "Checking pre-registration...",
    "auth.validationNotLoaded": "System validation has not loaded yet. Try again.",
    "auth.tagNotPreRegistered": "Your tag is not pre-registered in this clan.",
    "auth.tagValidatedApi": "Tag validated in the API and pre-registration found.",
    "auth.tagValidatedPre": "Pre-registered tag found. Account creation enabled.",
    "auth.tagValidationError": "Could not validate the tag. Try again.",
    "auth.sheet.clanFound": "CLAN FOUND",
    "auth.sheet.clanRegistered": "CLAN ALREADY REGISTERED",
    "auth.sheet.notReleased": "SUBSCRIPTION NOT RELEASED",
    "auth.sheet.apiUnavailable": "API UNAVAILABLE",
    "auth.sheet.clanNotFound": "CLAN NOT FOUND",
    "auth.sheet.membersCount": "{{count}} members",
    "auth.sheet.registeredTitle": "Clan already registered",
    "auth.sheet.notReleasedTitle": "Clan not released",
    "auth.sheet.apiErrorTitle": "API error",
    "auth.sheet.notFoundTitle": "Clan not found",
    "auth.sheet.registeredText": "Log in or request access from the administrator.",
    "auth.sheet.notReleasedText": "Subscribe now or contact support to release the trial.",
    "auth.sheet.apiErrorText": "The server did not respond. Check the tunnel/API and try again.",
    "auth.sheet.notFoundText": "Check the tag and try again.",
    "onboarding.title": "Onboarding",
    "onboarding.search": "Search",
    "onboarding.confirm": "Confirm",
    "onboarding.import": "Import",
    "onboarding.admin": "Admin",
    "onboarding.finish": "Finish",
    "onboarding.clanFoundTitle": "Clan found!",
    "onboarding.members": "Members",
    "onboarding.trophies": "Trophies",
    "onboarding.country": "Country",
    "onboarding.correctClan": "Is this the correct clan?",
    "onboarding.correctClanText": "Review the details above and confirm to continue.",
    "onboarding.searchAnotherClan": "Search another clan",
    "onboarding.importingMembers": "Importing members",
    "onboarding.importingMembersText": "We are fetching your clan members from the Clash Royale API.",
    "onboarding.importedSuccess": "Imported successfully",
    "onboarding.importingMembersProgress": "Importing members...",
    "onboarding.doNotClose": "Do not close the app during import.",
    "onboarding.createAdminTitle": "Create admin account",
    "onboarding.createAdminText": "You will be the main administrator for this clan.",
    "onboarding.createAdminButton": "Create account and start clan",
    "onboarding.successTitle": "Clan configured!",
    "onboarding.successText": "Your clan environment is ready to start.",
    "onboarding.enterSystem": "Enter system",
    "settings.plan": "Plan",
    "settings.planSubtitle": "Subscription, add-on and payments"
  },
  "es-ES": {
    "auth.alreadyMember": "¿Ya eres miembro?",
    "auth.login": "Iniciar sesión",
    "auth.or": "o",
    "auth.signup": "Regístrate",
    "auth.searching": "Buscando...",
    "auth.tryAgain": "Intentar de nuevo",
    "auth.email": "Email",
    "auth.emailPlaceholder": "tu@email.com",
    "auth.password": "Contraseña",
    "auth.passwordPlaceholder": "Tu contraseña",
    "auth.enter": "Entrar",
    "auth.loginTitle": "Acceder al sistema",
    "auth.loginText": "Usa tu email y contraseña para continuar.",
    "auth.forgotPassword": "Olvidé mi contraseña",
    "auth.noAccount": "¿Aún no tienes cuenta?",
    "auth.invalidLogin": "Email o contraseña incorrectos",
    "auth.entering": "Entrando...",
    "auth.enterEmailPassword": "Ingresa email y contraseña.",
    "auth.signupTitle": "Crear cuenta",
    "auth.signupText": "Valida tu etiqueta para vincular tu perfil al clan.",
    "auth.name": "Nombre",
    "auth.namePlaceholder": "Tu nombre",
    "auth.playerTag": "Etiqueta del jugador",
    "auth.validate": "Validar",
    "auth.validating": "Validando...",
    "auth.validated": "Validado",
    "auth.nick": "Nick",
    "auth.nickAfterValidate": "Se completa después de validar",
    "auth.createPassword": "Crea una contraseña",
    "auth.confirmSignup": "Confirmar cuenta",
    "auth.hasAccount": "¿Ya tienes cuenta?",
    "auth.fillSignupFields": "Completa email, contraseña, etiqueta del clan y etiqueta del jugador.",
    "auth.validateBeforeSignup": "Valida tu etiqueta antes de confirmar la cuenta.",
    "auth.creatingSignup": "Creando cuenta...",
    "auth.enterTagToValidate": "Ingresa una etiqueta para validar.",
    "auth.enterClanTagFirst": "Ingresa la etiqueta del clan antes de validar.",
    "auth.checkingPreRegistration": "Verificando pre-registro...",
    "auth.validationNotLoaded": "La validación del sistema aún no cargó. Intenta de nuevo.",
    "auth.tagNotPreRegistered": "Tu etiqueta no está pre-registrada en este clan.",
    "auth.tagValidatedApi": "Etiqueta validada en la API y pre-registro encontrado.",
    "auth.tagValidatedPre": "Etiqueta pre-registrada encontrada. Registro liberado.",
    "auth.tagValidationError": "Error al validar la etiqueta. Intenta de nuevo.",
    "auth.sheet.clanFound": "CLAN ENCONTRADO",
    "auth.sheet.clanRegistered": "CLAN YA REGISTRADO",
    "auth.sheet.notReleased": "SUSCRIPCIÓN NO LIBERADA",
    "auth.sheet.apiUnavailable": "API NO DISPONIBLE",
    "auth.sheet.clanNotFound": "CLAN NO ENCONTRADO",
    "auth.sheet.membersCount": "{{count}} miembros",
    "auth.sheet.registeredTitle": "Clan ya registrado",
    "auth.sheet.notReleasedTitle": "Clan sin liberación",
    "auth.sheet.apiErrorTitle": "Error en la API",
    "auth.sheet.notFoundTitle": "Clan no encontrado",
    "auth.sheet.registeredText": "Inicia sesión o solicita acceso al administrador.",
    "auth.sheet.notReleasedText": "Suscríbete ahora o habla con soporte para liberar la prueba.",
    "auth.sheet.apiErrorText": "El servidor no respondió. Verifica el tunnel/API e intenta de nuevo.",
    "auth.sheet.notFoundText": "Revisa la etiqueta e intenta de nuevo.",
    "onboarding.title": "Onboarding",
    "onboarding.search": "Buscar",
    "onboarding.confirm": "Confirmar",
    "onboarding.import": "Importar",
    "onboarding.admin": "Admin",
    "onboarding.finish": "Finalizar",
    "onboarding.clanFoundTitle": "¡Clan encontrado!",
    "onboarding.members": "Miembros",
    "onboarding.trophies": "Trofeos",
    "onboarding.country": "País",
    "onboarding.correctClan": "¿Este es el clan correcto?",
    "onboarding.correctClanText": "Revisa los datos de arriba y confirma para continuar.",
    "onboarding.searchAnotherClan": "Buscar otro clan",
    "onboarding.importingMembers": "Importando miembros",
    "onboarding.importingMembersText": "Estamos buscando los miembros de tu clan en la API de Clash Royale.",
    "onboarding.importedSuccess": "Importados con éxito",
    "onboarding.importingMembersProgress": "Importando miembros...",
    "onboarding.doNotClose": "No cierres la app durante la importación.",
    "onboarding.createAdminTitle": "Crear cuenta admin",
    "onboarding.createAdminText": "Serás el administrador principal de este clan.",
    "onboarding.createAdminButton": "Crear cuenta e iniciar clan",
    "onboarding.successTitle": "¡Clan configurado!",
    "onboarding.successText": "El entorno de tu clan está listo para comenzar.",
    "onboarding.enterSystem": "Entrar al sistema",
    "settings.plan": "Plan",
    "settings.planSubtitle": "Suscripción, add-on y pagos"
  }
};
for (const [lang, values] of Object.entries(I18N_STAGE2_ONBOARDING_KEYS)) { INLINE_I18N[lang] = {...(INLINE_I18N[lang] || {}), ...values}; }

const I18N_STAGE2_SETTINGS_PATCH = {"pt-BR": {"settings.clan": "Clã"}, "en-US": {"settings.clan": "Clan"}, "es-ES": {"settings.clan": "Clan"}};
for (const [lang, values] of Object.entries(I18N_STAGE2_SETTINGS_PATCH)) { INLINE_I18N[lang] = {...(INLINE_I18N[lang] || {}), ...values}; }

const I18N_STAGE4_EXTRA = {
  'pt-BR': {
    'avatar.eyebrow':'Perfil','avatar.title':'Escolher avatar','avatar.text':'Selecione uma imagem para o seu perfil ou faça UPGRADE de seu plano para liberar todos os avatares e fundos.','avatar.customization':'Personalização','avatar.background':'Fundo do perfil',
    'settings.userDetailEyebrow':'Cadastro','settings.userDetailTitle':'Dados do membro','settings.userDetailText':'Informações de cadastro vinculadas ao membro do clã.','settings.loadingUsers':'Carregando usuários...','settings.noUsers':'Nenhum cadastro encontrado neste clã.','settings.usersLoadError':'Não foi possível carregar usuários agora.',
    'settings.clashRole':'Cargo Clash','settings.permission':'Permissão','settings.linkedAt':'Vinculado em','settings.device':'Dispositivo','settings.ended':'encerrada','settings.endSession':'Encerrar','settings.local':'local',
    'settings.passwordTooShort':'A senha precisa ter pelo menos 6 caracteres.','settings.passwordMismatch':'As senhas não conferem.','settings.passwordChanged':'Senha alterada com sucesso.','settings.passwordSaveError':'Não foi possível alterar a senha agora. Faça login novamente e tente de novo.',
    'settings.clanPremiumActive':'Clã Premium ativo','settings.clanPremiumActiveText':'Todos os membros já têm avatares e fundos liberados. Add-On individual desabilitado.','settings.noAddonActive':'Nenhum Add-On ativo','settings.noAddonActiveText':'Você pode solicitar Add-On Plus ou Premium para liberar personalizações no seu perfil.','settings.addonActive':'Add-On {{plan}} ativo','settings.addonPremiumText':'Todos os recursos de perfil liberados.','settings.addonPlusText':'Avatares e fundos Plus liberados.',
    'settings.addonPlusTextLong':'Selo exclusivo Plus, avatares liberados e fundos simples do perfil. Novidades Plus futuras entram aqui.','settings.addonPremiumTextLong':'Selo Premium, todos os avatares, todos os fundos premium estilo Clash Royale e futuras novidades Premium.','settings.requestAddonPlus':'Solicitar Add-On Plus','settings.requestAddonPremium':'Solicitar Add-On Premium','settings.releasedByClanPremium':'Liberado pelo Premium do clã','settings.premiumAlreadyActive':'Premium já ativo','settings.waitingSaasRelease':'Aguardando liberação do {{plan}} no SaaS','settings.pending':'Pendente',
    'settings.benefit.trial1':'Acesso de teste','settings.benefit.trial2':'2 avatares liberados','settings.benefit.trial3':'Emblemas limitados','settings.benefit.basic1':'Acesso básico ao sistema','settings.benefit.basic2':'2 avatares liberados','settings.benefit.basic3':'Add-On individual disponível','settings.benefit.plus1':'Fundos simples liberados','settings.benefit.plus2':'Avatares liberados','settings.benefit.plus3':'Add-On Premium disponível por membro','settings.benefit.premium1':'Tudo liberado para todos os membros','settings.benefit.premium2':'Add-On individual desabilitado','settings.benefit.premium3':'Fundos premium inclusos',
    'common.loadingMembers':'Carregando membros...','common.loadingRealData':'Carregando dados reais...'
  },
  'en-US': {
    'avatar.eyebrow':'Profile','avatar.title':'Choose avatar','avatar.text':'Select an image for your profile or UPGRADE your plan to unlock all avatars and backgrounds.','avatar.customization':'Customization','avatar.background':'Profile background',
    'settings.userDetailEyebrow':'Registration','settings.userDetailTitle':'Member data','settings.userDetailText':'Registration information linked to the clan member.','settings.loadingUsers':'Loading users...','settings.noUsers':'No registered users found in this clan.','settings.usersLoadError':'Could not load users right now.',
    'settings.clashRole':'Clash role','settings.permission':'Permission','settings.linkedAt':'Linked on','settings.device':'Device','settings.ended':'ended','settings.endSession':'End','settings.local':'local',
    'settings.passwordTooShort':'The password must have at least 6 characters.','settings.passwordMismatch':'The passwords do not match.','settings.passwordChanged':'Password changed successfully.','settings.passwordSaveError':'Could not change the password right now. Sign in again and try again.',
    'settings.clanPremiumActive':'Clan Premium active','settings.clanPremiumActiveText':'All members already have avatars and backgrounds unlocked. Individual Add-On disabled.','settings.noAddonActive':'No active Add-On','settings.noAddonActiveText':'You can request Add-On Plus or Premium to unlock profile customization.','settings.addonActive':'Add-On {{plan}} active','settings.addonPremiumText':'All profile resources unlocked.','settings.addonPlusText':'Plus avatars and backgrounds unlocked.',
    'settings.addonPlusTextLong':'Exclusive Plus badge, unlocked avatars, and simple profile backgrounds. Future Plus updates go here.','settings.addonPremiumTextLong':'Premium badge, all avatars, all Clash Royale-style premium backgrounds, and future Premium updates.','settings.requestAddonPlus':'Request Add-On Plus','settings.requestAddonPremium':'Request Add-On Premium','settings.releasedByClanPremium':'Unlocked by clan Premium','settings.premiumAlreadyActive':'Premium already active','settings.waitingSaasRelease':'Waiting for {{plan}} release in SaaS','settings.pending':'Pending',
    'settings.benefit.trial1':'Trial access','settings.benefit.trial2':'2 avatars unlocked','settings.benefit.trial3':'Limited badges','settings.benefit.basic1':'Basic system access','settings.benefit.basic2':'2 avatars unlocked','settings.benefit.basic3':'Individual Add-On available','settings.benefit.plus1':'Simple backgrounds unlocked','settings.benefit.plus2':'Avatars unlocked','settings.benefit.plus3':'Premium Add-On available per member','settings.benefit.premium1':'Everything unlocked for all members','settings.benefit.premium2':'Individual Add-On disabled','settings.benefit.premium3':'Premium backgrounds included',
    'common.loadingMembers':'Loading members...','common.loadingRealData':'Loading real data...'
  },
  'es-ES': {
    'avatar.eyebrow':'Perfil','avatar.title':'Elegir avatar','avatar.text':'Selecciona una imagen para tu perfil o mejora tu plan para liberar todos los avatares y fondos.','avatar.customization':'Personalización','avatar.background':'Fondo del perfil',
    'settings.userDetailEyebrow':'Registro','settings.userDetailTitle':'Datos del miembro','settings.userDetailText':'Información de registro vinculada al miembro del clan.','settings.loadingUsers':'Cargando usuarios...','settings.noUsers':'No se encontraron registros en este clan.','settings.usersLoadError':'No se pudieron cargar los usuarios ahora.',
    'settings.clashRole':'Cargo Clash','settings.permission':'Permiso','settings.linkedAt':'Vinculado el','settings.device':'Dispositivo','settings.ended':'cerrada','settings.endSession':'Cerrar','settings.local':'local',
    'settings.passwordTooShort':'La contraseña debe tener al menos 6 caracteres.','settings.passwordMismatch':'Las contraseñas no coinciden.','settings.passwordChanged':'Contraseña cambiada con éxito.','settings.passwordSaveError':'No se pudo cambiar la contraseña ahora. Inicia sesión de nuevo e inténtalo otra vez.',
    'settings.clanPremiumActive':'Clan Premium activo','settings.clanPremiumActiveText':'Todos los miembros ya tienen avatares y fondos liberados. Add-On individual deshabilitado.','settings.noAddonActive':'Ningún Add-On activo','settings.noAddonActiveText':'Puedes solicitar Add-On Plus o Premium para liberar personalizaciones en tu perfil.','settings.addonActive':'Add-On {{plan}} activo','settings.addonPremiumText':'Todos los recursos del perfil liberados.','settings.addonPlusText':'Avatares y fondos Plus liberados.',
    'settings.addonPlusTextLong':'Sello exclusivo Plus, avatares liberados y fondos simples del perfil. Las futuras novedades Plus entran aquí.','settings.addonPremiumTextLong':'Sello Premium, todos los avatares, todos los fondos premium estilo Clash Royale y futuras novedades Premium.','settings.requestAddonPlus':'Solicitar Add-On Plus','settings.requestAddonPremium':'Solicitar Add-On Premium','settings.releasedByClanPremium':'Liberado por el Premium del clan','settings.premiumAlreadyActive':'Premium ya activo','settings.waitingSaasRelease':'Esperando liberación de {{plan}} en SaaS','settings.pending':'Pendiente',
    'settings.benefit.trial1':'Acceso de prueba','settings.benefit.trial2':'2 avatares liberados','settings.benefit.trial3':'Emblemas limitados','settings.benefit.basic1':'Acceso básico al sistema','settings.benefit.basic2':'2 avatares liberados','settings.benefit.basic3':'Add-On individual disponible','settings.benefit.plus1':'Fondos simples liberados','settings.benefit.plus2':'Avatares liberados','settings.benefit.plus3':'Add-On Premium disponible por miembro','settings.benefit.premium1':'Todo liberado para todos los miembros','settings.benefit.premium2':'Add-On individual deshabilitado','settings.benefit.premium3':'Fondos premium incluidos',
    'common.loadingMembers':'Cargando miembros...','common.loadingRealData':'Cargando datos reales...'
  }
};
Object.entries(I18N_STAGE4_EXTRA).forEach(([language, values])=>{ INLINE_I18N[language] = {...(INLINE_I18N[language] || {}), ...values}; });



function normalizeLanguage(language){
  const value = String(language || '').trim();
  if(SUPPORTED_LANGUAGES.includes(value)) return value;
  const lower = value.toLowerCase();
  if(lower.startsWith('en')) return 'en-US';
  if(lower.startsWith('es')) return 'es-ES';
  if(lower.startsWith('pt')) return 'pt-BR';
  return 'pt-BR';
}

function getInitialLanguage(){
  return normalizeLanguage(localStorage.getItem(TOPBRS_LANG_KEY) || navigator.language || 'pt-BR');
}

async function fetchDictionary(language){
  const fallback = INLINE_I18N[language] || INLINE_I18N['pt-BR'] || {};
  try{
    const response = await fetch(`assets/i18n/${language}.json?v=i18n-stage2-onboarding`, {cache:'no-store'});
    if(!response.ok) throw new Error(`i18n ${language} ${response.status}`);
    const remote = await response.json();
    return {...fallback, ...remote};
  }catch(error){
    if(language !== 'pt-BR' && !INLINE_I18N[language]) return fetchDictionary('pt-BR');
    console.warn('Falha ao carregar idioma externo; usando dicionário embutido:', error);
    return fallback;
  }
}

function formatTemplate(text, values = {}){
  return String(text || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key)=> values[key] ?? '');
}

function translate(key, values){
  return formatTemplate(currentDictionary[key] || key, values);
}

function setTextPreservingBreaks(element, text){
  const parts = String(text || '').split('\n');
  element.textContent = '';
  parts.forEach((part, index)=>{
    if(index) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(part));
  });
}

function applyTranslations(root = document){
  root.querySelectorAll('[data-i18n]').forEach(element=>{
    setTextPreservingBreaks(element, translate(element.dataset.i18n));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element=>{
    element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(element=>{
    element.setAttribute('title', translate(element.dataset.i18nTitle));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach(element=>{
    element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
  });
  root.querySelectorAll('[data-i18n-current-language]').forEach(element=>{
    element.textContent = LANGUAGE_LABELS[currentLanguage] || LANGUAGE_LABELS['pt-BR'];
  });
  root.querySelectorAll('[data-language-option]').forEach(button=>{
    const active = button.dataset.languageOption === currentLanguage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.documentElement.lang = currentLanguage || 'pt-BR';
}

async function setLanguage(language, options = {}){
  currentLanguage = normalizeLanguage(language);
  currentDictionary = await fetchDictionary(currentLanguage);
  localStorage.setItem(TOPBRS_LANG_KEY, currentLanguage);
  applyTranslations();
  window.dispatchEvent(new CustomEvent('topbrs:languagechange', {detail:{language:currentLanguage}}));
  if(options.closePopup){
    document.querySelector('#settingsLanguageOverlay')?.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
  return currentLanguage;
}

function bindLanguageControls(){
  document.addEventListener('click', event=>{
    const languageButton = event.target.closest('[data-language-option]');
    if(languageButton){
      event.preventDefault();
      setLanguage(languageButton.dataset.languageOption, {closePopup: true});
      return;
    }
    if(event.target.closest('#openLanguagePopup')){
      event.preventDefault();
      const overlay = document.querySelector('#settingsLanguageOverlay');
      overlay?.classList.add('show');
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      applyTranslations();
      return;
    }
    if(event.target.closest('[data-close-language-popup]') || event.target.id === 'settingsLanguageOverlay'){
      document.querySelector('#settingsLanguageOverlay')?.classList.remove('show');
      if(!document.querySelector('.settings-popup-overlay.show,.avatar-picker-overlay.show,.plan-manager-overlay.show')){
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    }
  });
}

window.TopBRSI18n = {
  setLanguage,
  getLanguage: ()=>currentLanguage,
  t: translate,
  apply: applyTranslations,
  supported: SUPPORTED_LANGUAGES,
  labels: LANGUAGE_LABELS
};

bindLanguageControls();
setLanguage(getInitialLanguage());


/* ===== Stage 4 final patch: fallback for dynamic/runtime texts ===== */
const TOPBRS_RUNTIME_I18N = {
  'pt-BR': {
    'common.noData':'Sem dados','common.noHistory':'Sem histórico para este período.','common.loadingMembers':'Carregando membros...','common.loadingRealData':'Carregando dados reais...','common.loading':'Carregando...','common.close':'Fechar','common.cancel':'Cancelar','common.save':'Salvar','common.you':'VOCÊ','common.attacks':'ataques','common.pointsSuffix':'PTS',
    'auth.alreadyMember':'Já é membro?','auth.login':'Entrar','auth.or':'ou','auth.signup':'Cadastrar','auth.accessSystem':'Acessar sistema','auth.accessText':'Use seu e-mail e senha para continuar.','auth.email':'E-mail','auth.password':'Senha','auth.emailPlaceholder':'voce@email.com','auth.passwordPlaceholder':'Sua senha','auth.forgotPassword':'Esqueci a senha','auth.noAccountYet':'Ainda não tem conta?',
    'dashboard.latestNotifications':'ÚLTIMAS NOTIFICAÇÕES','dashboard.notifications':'Notificações','dashboard.notificationsText':'Últimas mensagens do seu clã','dashboard.noNotifications':'Nenhuma notificação recente.','dashboard.viewAll':'Ver todas',
    'war.title':'Guerra','war.subtitle':'Acompanhe o desempenho do clã na guerra semanal','war.current':'GUERRA ATUAL','war.outside':'FORA DA JANELA','war.inProgress':'EM ANDAMENTO','war.finished':'FINALIZADO','war.future':'FUTURO','war.week':'Semana','war.day':'Dia','war.member':'MEMBRO','war.fame':'FAME','war.attacks':'ATAQUES','war.usedAttacks':'Ataques usados','war.calendar':'Calendário','war.calendarSubtitleWeek':'Semana atual da guerra','war.calendarSubtitleDay':'{{day}} da janela de guerra',
    'classification.title':'Classificação','classification.subtitle':'Confira os rankings do clã','classification.general':'Geral','classification.tournament':'Torneio','classification.donations':'Doações','classification.pos':'POS','classification.member':'MEMBRO','classification.points':'PONTOS','classification.sent':'ENV','classification.received':'REC','classification.calendarSubtitle':'Mês e semana da classificação','classification.totalMonth':'Total do mês','classification.monthScore':'Pontuação semanal do mês vigente','classification.periodScore':'Pontuação do período selecionado',
    'members.title':'Membros','members.subtitle':'Lista de membros do clã.','members.count':'{{count}} membros','members.search':'Buscar membro...','members.filter':'Filtro','members.filterTitle':'Filtrar membros','members.all':'Todos','members.admin':'Líder','members.leader':'Líder','members.coLeader':'Co-líder','members.elder':'Ancião','members.member':'Membro','members.noMembers':'Nenhum membro encontrado','members.loadError':'Erro ao carregar membros reais.','members.sync':'Sincronizar membros',
    'settings.apiTitle':'Status da conexão','settings.apiText':'Informações reais da sincronização do clã, membros e guerra.','settings.status':'Status','settings.clan':'Clã','settings.yourLink':'Seu vínculo','settings.members':'Membros','settings.lastUpdate':'Última atualização','settings.server':'Servidor','settings.mode':'Modo','settings.refreshData':'Atualizar dados','settings.securityTitle':'Senha e sessões','settings.securityText':'Troque a senha e confira os dispositivos com sessão registrada.','settings.sessions':'Sessões ativas','settings.sessionsControl':'Controle simples via Firestore','settings.thisDevice':'Este dispositivo','settings.device':'Dispositivo','settings.local':'local','settings.active':'ativa','settings.ended':'encerrada','settings.endSession':'Encerrar','settings.passwordTooShort':'A senha precisa ter no mínimo 6 caracteres.','settings.passwordMismatch':'As senhas não conferem.','settings.passwordChanged':'Senha alterada com sucesso.','settings.passwordSaveError':'Não foi possível salvar a senha agora.','settings.noUsers':'Nenhum cadastro encontrado neste clã.','settings.loadingUsers':'Carregando usuários...','settings.usersLoadError':'Não foi possível carregar usuários agora.'
  },
  'en-US': {
    'common.noData':'No data','common.noHistory':'No history for this period.','common.loadingMembers':'Loading members...','common.loadingRealData':'Loading real data...','common.loading':'Loading...','common.close':'Close','common.cancel':'Cancel','common.save':'Save','common.you':'YOU','common.attacks':'attacks','common.pointsSuffix':'PTS',
    'auth.alreadyMember':'Already a member?','auth.login':'Log in','auth.or':'or','auth.signup':'Sign up','auth.accessSystem':'Access system','auth.accessText':'Use your email and password to continue.','auth.email':'Email','auth.password':'Password','auth.emailPlaceholder':'you@email.com','auth.passwordPlaceholder':'Your password','auth.forgotPassword':'Forgot password','auth.noAccountYet':'No account yet?',
    'dashboard.latestNotifications':'LATEST NOTIFICATIONS','dashboard.notifications':'Notifications','dashboard.notificationsText':'Latest clan messages','dashboard.noNotifications':'No recent notifications.','dashboard.viewAll':'View all',
    'war.title':'War','war.subtitle':'Track your clan performance in weekly war','war.current':'CURRENT WAR','war.outside':'OUTSIDE WINDOW','war.inProgress':'IN PROGRESS','war.finished':'FINISHED','war.future':'FUTURE','war.week':'Week','war.day':'Day','war.member':'MEMBER','war.fame':'FAME','war.attacks':'ATTACKS','war.usedAttacks':'Attacks used','war.calendar':'Calendar','war.calendarSubtitleWeek':'Current war week','war.calendarSubtitleDay':'{{day}} war window',
    'classification.title':'Ranking','classification.subtitle':'Check your clan rankings','classification.general':'General','classification.tournament':'Tourney','classification.donations':'Donations','classification.pos':'POS','classification.member':'MEMBER','classification.points':'POINTS','classification.sent':'SENT','classification.received':'RCV','classification.calendarSubtitle':'Ranking month and week','classification.totalMonth':'Month total','classification.monthScore':'Weekly score for the current month','classification.periodScore':'Selected period score',
    'members.title':'Members','members.subtitle':'Clan member list.','members.count':'{{count}} members','members.search':'Search member...','members.filter':'Filter','members.filterTitle':'Filter members','members.all':'All','members.admin':'Leader','members.leader':'Leader','members.coLeader':'Co-leader','members.elder':'Elder','members.member':'Member','members.noMembers':'No members found','members.loadError':'Error loading real members.','members.sync':'Sync members',
    'settings.apiTitle':'Connection status','settings.apiText':'Real sync information for clan, members, and war.','settings.status':'Status','settings.clan':'Clan','settings.yourLink':'Your link','settings.members':'Members','settings.lastUpdate':'Last update','settings.server':'Server','settings.mode':'Mode','settings.refreshData':'Refresh data','settings.securityTitle':'Password and sessions','settings.securityText':'Change your password and review devices with registered sessions.','settings.sessions':'Active sessions','settings.sessionsControl':'Simple control via Firestore','settings.thisDevice':'This device','settings.device':'Device','settings.local':'local','settings.active':'active','settings.ended':'ended','settings.endSession':'End','settings.passwordTooShort':'Password must be at least 6 characters.','settings.passwordMismatch':'Passwords do not match.','settings.passwordChanged':'Password changed successfully.','settings.passwordSaveError':'Could not save the password right now.','settings.noUsers':'No registered users found in this clan.','settings.loadingUsers':'Loading users...','settings.usersLoadError':'Could not load users right now.'
  },
  'es-ES': {
    'common.noData':'Sin datos','common.noHistory':'Sin historial para este período.','common.loadingMembers':'Cargando miembros...','common.loadingRealData':'Cargando datos reales...','common.loading':'Cargando...','common.close':'Cerrar','common.cancel':'Cancelar','common.save':'Guardar','common.you':'TÚ','common.attacks':'ataques','common.pointsSuffix':'PTS',
    'auth.alreadyMember':'¿Ya eres miembro?','auth.login':'Iniciar sesión','auth.or':'o','auth.signup':'Regístrate','auth.accessSystem':'Acceder al sistema','auth.accessText':'Usa tu e-mail y contraseña para continuar.','auth.email':'E-mail','auth.password':'Contraseña','auth.emailPlaceholder':'tu@email.com','auth.passwordPlaceholder':'Tu contraseña','auth.forgotPassword':'Olvidé mi contraseña','auth.noAccountYet':'¿Aún no tienes cuenta?',
    'dashboard.latestNotifications':'ÚLTIMAS NOTIFICACIONES','dashboard.notifications':'Notificaciones','dashboard.notificationsText':'Últimos mensajes de tu clan','dashboard.noNotifications':'Sin notificaciones recientes.','dashboard.viewAll':'Ver todas',
    'war.title':'Guerra','war.subtitle':'Acompaña el rendimiento del clan en la guerra semanal','war.current':'GUERRA ACTUAL','war.outside':'FUERA DE LA VENTANA','war.inProgress':'EN CURSO','war.finished':'FINALIZADO','war.future':'FUTURO','war.week':'Semana','war.day':'Día','war.member':'MIEMBRO','war.fame':'FAMA','war.attacks':'ATAQUES','war.usedAttacks':'Ataques usados','war.calendar':'Calendario','war.calendarSubtitleWeek':'Semana actual de guerra','war.calendarSubtitleDay':'{{day}} de la ventana de guerra',
    'classification.title':'Clasificación','classification.subtitle':'Consulta los rankings del clan','classification.general':'General','classification.tournament':'Torneo','classification.donations':'Donaciones','classification.pos':'POS','classification.member':'MIEMBRO','classification.points':'PUNTOS','classification.sent':'ENV','classification.received':'REC','classification.calendarSubtitle':'Mes y semana de la clasificación','classification.totalMonth':'Total del mes','classification.monthScore':'Puntuación semanal del mes actual','classification.periodScore':'Puntuación del período seleccionado',
    'members.title':'Miembros','members.subtitle':'Lista de miembros del clan.','members.count':'{{count}} miembros','members.search':'Buscar miembro...','members.filter':'Filtro','members.filterTitle':'Filtrar miembros','members.all':'Todos','members.admin':'Líder','members.leader':'Líder','members.coLeader':'Co-líder','members.elder':'Veterano','members.member':'Miembro','members.noMembers':'No se encontraron miembros','members.loadError':'Error al cargar miembros reales.','members.sync':'Sincronizar miembros',
    'settings.apiTitle':'Estado de conexión','settings.apiText':'Información real de sincronización del clan, miembros y guerra.','settings.status':'Estado','settings.clan':'Clan','settings.yourLink':'Tu vínculo','settings.members':'Miembros','settings.lastUpdate':'Última actualización','settings.server':'Servidor','settings.mode':'Modo','settings.refreshData':'Actualizar datos','settings.securityTitle':'Contraseña y sesiones','settings.securityText':'Cambia la contraseña y revisa los dispositivos con sesión registrada.','settings.sessions':'Sesiones activas','settings.sessionsControl':'Control simple vía Firestore','settings.thisDevice':'Este dispositivo','settings.device':'Dispositivo','settings.local':'local','settings.active':'activa','settings.ended':'cerrada','settings.endSession':'Cerrar','settings.passwordTooShort':'La contraseña debe tener al menos 6 caracteres.','settings.passwordMismatch':'Las contraseñas no coinciden.','settings.passwordChanged':'Contraseña cambiada correctamente.','settings.passwordSaveError':'No fue posible guardar la contraseña ahora.','settings.noUsers':'No se encontraron registros en este clan.','settings.loadingUsers':'Cargando usuarios...','settings.usersLoadError':'No se pudieron cargar los usuarios ahora.'
  }
};
const __topbrsBaseT = window.TopBRSI18n.t;
window.TopBRSI18n.t = function(key, values = {}){
  let value = __topbrsBaseT(key, values);
  if(value === key){
    value = TOPBRS_RUNTIME_I18N[currentLanguage]?.[key] || TOPBRS_RUNTIME_I18N['pt-BR']?.[key] || key;
    Object.entries(values || {}).forEach(([k,v])=>{ value = String(value).replaceAll(`{{${k}}}`, v); });
  }
  return value;
};
