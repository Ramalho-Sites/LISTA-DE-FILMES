import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = document.getElementById("email");
  const passInput  = document.getElementById("password");
  const loginBtn   = document.getElementById("loginBtn");
  const googleBtn  = document.getElementById("googleBtn");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");

  /* =========================
     Botões — estado loading
  ========================= */
  function setButtonsLoading(isLoading) {
    if (isLoading) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Carregando...";
      googleBtn.disabled = true;
      googleBtn.textContent = "Carregando...";
    } else {
      loginBtn.disabled = false;
      loginBtn.textContent = "Entrar / Criar Conta";
      googleBtn.disabled = false;
      googleBtn.textContent = "Entrar com Google";
    }
  }

  /* =========================
     Toast
  ========================= */
  function showToast(message, type = "info") {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }

    // Remove classes anteriores, aplica as novas
    toast.className = "";
    toast.textContent = message;

    // Força reflow para reiniciar a animação se o toast já estiver visível
    void toast.offsetWidth;

    toast.className = `toast toast-${type} show`;

    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.className = `toast toast-${type}`;
    }, 3000);
  }

  /* =========================
     Tratamento de Erros
  ========================= */
  function tratarErroFirebase(code) {
    const erros = {
      "auth/invalid-credential":        "Email ou senha incorretos.",
      "auth/user-not-found":            "Usuário não encontrado.",
      "auth/wrong-password":            "Senha incorreta.",
      "auth/email-already-in-use":      "Esse email já está em uso.",
      "auth/weak-password":             "A senha precisa ter no mínimo 6 caracteres.",
      "auth/invalid-email":             "Email inválido.",
      "auth/popup-closed-by-user":      "Popup fechado antes de concluir.",
      "auth/cancelled-popup-request":   "Popup cancelado.",
      "auth/popup-blocked":             "O navegador bloqueou o popup. Permita popups.",
      "auth/too-many-requests":         "Muitas tentativas. Aguarde alguns minutos.",
      "auth/network-request-failed":    "Sem conexão. Verifique sua internet.",
    };
    return erros[code] || `Erro inesperado (${code}). Tente novamente.`;
  }

  /* =========================
     Login / Criação Automática
  ========================= */
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const senha = passInput.value.trim();

    if (!email || !senha) {
      showToast("Preencha todos os campos.", "warning");
      return;
    }

    setButtonsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      showToast("Login realizado!", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 700);

    } catch (err) {
      // Tenta criar conta se usuário não existe
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          await createUserWithEmailAndPassword(auth, email, senha);
          showToast("Conta criada com sucesso!", "success");
          setTimeout(() => { window.location.href = "index.html"; }, 700);
        } catch (e2) {
          showToast(tratarErroFirebase(e2.code), "error");
          setButtonsLoading(false);
        }
      } else {
        showToast(tratarErroFirebase(err.code), "error");
        setButtonsLoading(false);
      }
    }
  });

  /* =========================
     Login com Google
  ========================= */
  googleBtn.addEventListener("click", async () => {
    setButtonsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Login com Google realizado!", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 700);
    } catch (err) {
      showToast(tratarErroFirebase(err.code), "error");
      setButtonsLoading(false);
    }
  });

  /* =========================
     Esqueci minha senha
  ========================= */
  forgotPasswordLink.addEventListener("click", async () => {
    const email = prompt("Digite seu email para redefinir a senha:");
    if (!email) return;

    setButtonsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("Email enviado! Verifique sua caixa de entrada.", "success");
    } catch (err) {
      showToast(tratarErroFirebase(err.code), "error");
    } finally {
      setButtonsLoading(false);
    }
  });
});