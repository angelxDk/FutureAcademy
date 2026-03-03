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
    normalizeFirebaseUser
} from '../firebase';
import { useAppStore } from './useAppStore';
import { useSyncStore } from './useSyncStore';
import { useUserStore } from './useUserStore';
import { FIREBASE_ERROR_MESSAGES } from '../utils/constants';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        authUser: null,
        authLoading: true,  // layout/nav — resolve em ~50ms (token em cache)
        dataLoading: false, // conteúdo de dados — resolve após hydratação do Firestore
        authEmail: '',
        authPassword: '',
        _currentUid: '',
        _authUnsubscribe: null
    }),

    actions: {
        _getFirebaseErrorMessage(error) {
            return FIREBASE_ERROR_MESSAGES[error?.code] || error?.message || 'Erro desconhecido. Tente novamente.';
        },

        initAuth() {
            const appStore = useAppStore();
            const syncStore = useSyncStore();
            const userStore = useUserStore();

            this._authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    this.authUser = normalizeFirebaseUser(firebaseUser);
                    this._currentUid = firebaseUser.uid;

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
                        await syncStore.loadStateFromFirestore(firebaseUser.uid);
                    } catch { /* silencioso — loadStateFromFirestore tem fallback interno */ }
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
            const appStore = useAppStore();
            this.authLoading = true;
            try {
                const result = await signInWithPopup(auth, googleProvider);
                this.authUser = normalizeFirebaseUser(result.user);
                appStore.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    appStore.showToast(this._getFirebaseErrorMessage(error));
                }
            } finally {
                this.authLoading = false;
            }
        },

        async loginWithFacebook() {
            const appStore = useAppStore();
            this.authLoading = true;
            try {
                const result = await signInWithPopup(auth, facebookProvider);
                this.authUser = normalizeFirebaseUser(result.user);
                appStore.showToast(`Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    appStore.showToast(this._getFirebaseErrorMessage(error));
                }
            } finally {
                this.authLoading = false;
            }
        },

        async loginWithEmail(mode, displayName, passwordConfirm) {
            const appStore = useAppStore();
            if (!this.authEmail || !this.authPassword) {
                appStore.showToast('Preencha e-mail e senha.');
                return;
            }
            if (mode === 'register' && this.authPassword !== passwordConfirm) {
                appStore.showToast('As senhas não coincidem.');
                return;
            }
            this.authLoading = true;
            try {
                let result;
                if (mode === 'register') {
                    result = await createUserWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                    if (displayName) {
                        await updateProfile(result.user, { displayName });
                    }
                } else {
                    result = await signInWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                }
                this.authUser = normalizeFirebaseUser(result.user);
                if (displayName && mode === 'register') {
                    this.authUser.name = displayName;
                }
                this.authEmail = '';
                this.authPassword = '';
                appStore.showToast(mode === 'register' ? `Conta criada! Bem-vindo(a), ${this.authUser.name}!` : `Bem-vindo(a), ${this.authUser.name}!`);
            } catch (error) {
                appStore.showToast(this._getFirebaseErrorMessage(error));
            } finally {
                this.authLoading = false;
            }
        },

        async logout() {
            const appStore = useAppStore();
            const syncStore = useSyncStore();

            syncStore.persistState();

            try { await signOut(auth); } catch { /* ignore */ }

            this.authUser = null;
            this._currentUid = '';
            syncStore.resetToDefault();
            appStore.showToast('Até logo! Sessão encerrada.');
        }
    }
});
