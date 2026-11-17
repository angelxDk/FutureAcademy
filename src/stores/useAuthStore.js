import { defineStore } from 'pinia';
import {
    auth,
    googleProvider,
    facebookProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    onAuthStateChanged,
    normalizeUser,
    sendPasswordResetEmail,
    sendEmailVerification,
    resendSignupConfirmation
} from '../auth';
import { useAppStore } from './useAppStore';
import { useSyncStore } from './useSyncStore';
import { useUserStore } from './useUserStore';
import { AUTH_ERROR_MESSAGES } from '../utils/constants';

const emailValue = value => typeof value === 'string' ? value.trim() : '';
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const recoveryMessage = 'Se houver uma conta elegível, você receberá um e-mail para redefinir a senha. Abra o link recebido ou use o código na página Redefinir senha.';
const confirmationMessage = 'Se houver um cadastro aguardando confirmação, você receberá um novo e-mail. Confira também a pasta de spam.';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        authUser: null,
        authBusy: false,
        authLoading: true,  // layout/nav — resolve em ~50ms (token em cache)
        dataLoading: false, // conteúdo de dados — resolve após hydratação do nuvem
        authEmail: '',
        authPassword: '',
        authFeedback: '',
        authFeedbackType: 'info',
        authCanResendConfirmation: false,
        authConfirmationEmail: '',
        authRecoveryRequested: false,
        _currentUid: '',
        _authUnsubscribe: null
    }),

    actions: {
        _getAuthErrorMessage(error) {
            if (['invalid_credentials', 'auth/invalid-credential', 'auth/wrong-password'].includes(error?.code)) {
                return 'E-mail ou senha incorretos. Se não lembrar a senha, use Esqueci minha senha.';
            }
            return AUTH_ERROR_MESSAGES[error?.code] || error?.message || 'Erro desconhecido. Tente novamente.';
        },

        clearAuthFeedback() {
            this.authFeedback = '';
            this.authFeedbackType = 'info';
            this.authCanResendConfirmation = false;
            this.authConfirmationEmail = '';
            this.authRecoveryRequested = false;
        },

        _setAuthFeedback(message, type = 'error') {
            this.authFeedback = message;
            this.authFeedbackType = type;
            useAppStore().showToast(message);
        },

        initAuth() {
            const appStore = useAppStore();
            const syncStore = useSyncStore();
            const userStore = useUserStore();

            this._authUnsubscribe = onAuthStateChanged(auth, async (sessionUser) => {
                if (sessionUser) {
                    const sameAccount = this._currentUid === sessionUser.uid;
                    this.authUser = normalizeUser(sessionUser);
                    // Supabase emits SIGNED_IN/USER_UPDATED again on refresh and
                    // profile updates. Only one hydration may own this account;
                    // overlapping loads could restore an old workspace over navigation.
                    if (sameAccount) { this.authLoading = false; return; }
                    this._currentUid = sessionUser.uid;

                    const theme = userStore.settings?.theme === 'light' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', theme);

                    // Layout e nav aparecem imediatamente — auth já confirmada
                    this.authLoading = false;

                    // Prefetch do chunk do Dashboard em background (sem bloquear)
                    // Garante que o chunk já está em cache quando o router navegar para /
                    import('../sections/DashboardSection.vue');

                    // Dados aguardam a hidratação — conteúdo exibe skeleton enquanto isso
                    this.dataLoading = true;
                    try {
                        await syncStore.loadStateFromCloud(sessionUser.uid);
                    } catch { /* silencioso — loadStateFromCloud tem fallback interno */ }
                    this.dataLoading = false;
                } else {
                    this.authUser = null;
                    this._currentUid = '';
                    syncStore.resetToDefault();
                    this.authLoading = false;
                    this.dataLoading = false;
                }
            });
        },

        cleanup() {
            if (this._authUnsubscribe) {
                this._authUnsubscribe();
            }
        },

        async loginWithGoogle() {
            if (this.authBusy) return;
            const appStore = useAppStore();
            this.clearAuthFeedback();
            this.authBusy = true;
            try {
                const result = await signInWithPopup(auth, googleProvider);
                if (result.redirected) return;
                this.authUser = normalizeUser(result.user);
                appStore.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    this._setAuthFeedback(this._getAuthErrorMessage(error));
                }
            } finally {
                this.authBusy = false;
            }
        },

        async loginWithFacebook() {
            if (this.authBusy) return;
            const appStore = useAppStore();
            this.clearAuthFeedback();
            this.authBusy = true;
            try {
                const result = await signInWithPopup(auth, facebookProvider);
                if (result.redirected) return;
                this.authUser = normalizeUser(result.user);
                appStore.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    this._setAuthFeedback(this._getAuthErrorMessage(error));
                }
            } finally {
                this.authBusy = false;
            }
        },

        async loginWithEmail(mode, displayName, passwordConfirm) {
            if (this.authBusy) return;
            const appStore = useAppStore();
            const attemptedEmail = emailValue(this.authEmail);
            const attemptedPassword = this.authPassword;
            this.clearAuthFeedback();
            if (!attemptedEmail || !attemptedPassword) {
                this._setAuthFeedback('Preencha e-mail e senha.');
                return;
            }
            if (!validEmail(attemptedEmail)) {
                this._setAuthFeedback('Informe um e-mail válido.');
                return;
            }
            if (mode === 'register' && attemptedPassword !== passwordConfirm) {
                this._setAuthFeedback('As senhas não coincidem.');
                return;
            }
            this.authEmail = attemptedEmail;
            this.authBusy = true;
            try {
                let result;
                if (mode === 'register') {
                    result = await createUserWithEmailAndPassword(auth, attemptedEmail, attemptedPassword, displayName);
                    if (result.needsConfirmation) {
                        this.authPassword = '';
                        this.authCanResendConfirmation = true;
                        this.authConfirmationEmail = attemptedEmail;
                        this._setAuthFeedback('Confira seu e-mail, incluindo a pasta de spam, para confirmar o cadastro. Depois entre com sua senha. Se o e-mail não chegar, você pode reenviar a confirmação. Se já tiver uma conta, entre ou recupere a senha.', 'info');
                        return;
                    }
                    if (displayName) {
                        await updateProfile(result.user, { displayName });
                    }
                } else {
                    result = await signInWithEmailAndPassword(auth, attemptedEmail, attemptedPassword);
                }
                this.authUser = normalizeUser(result.user);
                if (displayName && mode === 'register') {
                    this.authUser.name = displayName;
                }
                this.authEmail = '';
                this.authPassword = '';
                appStore.showToast(mode === 'register' ? `Conta criada! Bem-vindo(a), ${this.authUser.name}!` : `Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                if (error.code === 'email_not_confirmed') {
                    this.authCanResendConfirmation = true;
                    this.authConfirmationEmail = attemptedEmail;
                }
                this._setAuthFeedback(this._getAuthErrorMessage(error));
            } finally {
                this.authBusy = false;
            }
        },

        async resetPassword(email) {
            if (this.authBusy) return;
            const target = emailValue(email);
            this.clearAuthFeedback();
            if (!validEmail(target)) { this._setAuthFeedback('Informe um e-mail válido.'); return; }
            this.authBusy = true;
            try {
                await sendPasswordResetEmail(auth, target);
                this.authRecoveryRequested = true;
                this._setAuthFeedback(recoveryMessage, 'info');
            } catch (error) {
                if (['auth/user-not-found', 'user_not_found'].includes(error.code)) {
                    this.authRecoveryRequested = true;
                    this._setAuthFeedback(recoveryMessage, 'info');
                } else this._setAuthFeedback(this._getAuthErrorMessage(error));
            }
            finally { this.authBusy = false; }
        },

        async resendConfirmation(email) {
            if (this.authBusy) return;
            const target = emailValue(email);
            const confirmedTarget = this.authConfirmationEmail;
            const allowed = this.authCanResendConfirmation;
            this.clearAuthFeedback();
            if (!validEmail(target)) { this._setAuthFeedback('Informe um e-mail válido.'); return; }
            if (!allowed || target.toLowerCase() !== confirmedTarget.toLowerCase()) {
                this._setAuthFeedback('O e-mail foi alterado. Tente entrar ou cadastrar-se com esse endereço antes de reenviar a confirmação.');
                return;
            }
            this.authBusy = true;
            this.authCanResendConfirmation = true;
            this.authConfirmationEmail = target;
            try {
                await resendSignupConfirmation(target);
                this._setAuthFeedback(confirmationMessage, 'info');
            } catch (error) {
                if (['auth/user-not-found', 'user_not_found'].includes(error.code)) this._setAuthFeedback(confirmationMessage, 'info');
                else this._setAuthFeedback(this._getAuthErrorMessage(error));
            } finally { this.authBusy = false; }
        },
        async verifyEmail() {
            try { await sendEmailVerification(auth.currentUser); useAppStore().showToast('Verificação enviada. Confira seu e-mail.'); }
            catch (error) { useAppStore().showToast(this._getAuthErrorMessage(error)); }
        },
        async logout() {
            const appStore = useAppStore();
            const syncStore = useSyncStore();

            syncStore.persistState();
            await syncStore.flushPersist();

            try { await signOut(auth); } catch { appStore.showToast('Não foi possível encerrar a sessão. Tente novamente.'); return; }

            this.authUser = null;
            this._currentUid = '';
            syncStore.resetToDefault();
            appStore.showToast('Até logo! Sessão encerrada.');
        }
    }
});
