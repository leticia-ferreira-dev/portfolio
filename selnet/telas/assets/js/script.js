// ==========================================
// SCRIPT DA HOME - SELNET
// Organizado para o trabalho da Unisuam
// ==========================================

// ==========================================
// 0. FUNÇÕES DO MODAL PERSONALIZADO
// ==========================================

function mostrarModal(titulo, mensagem, acaoAoFechar = null) {
    const modal = document.getElementById('meuModal');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensagem = document.getElementById('modal-mensagem');
    
    if (!modal) return; // Segurança caso o modal não exista na página

    modalTitulo.innerText = titulo;
    modalMensagem.innerText = mensagem;
    modal.style.display = 'block';
    
    // Armazena a ação de fechamento no botão
    const btnModal = modal.querySelector('.btn-modal');
    btnModal.onclick = function() {
        fecharModal();
        if (acaoAoFechar) acaoAoFechar();
    };
}

function fecharModal() {
    const modal = document.getElementById('meuModal');
    if (modal) modal.style.display = 'none';
}

// ==========================================
// 1. EFEITOS VISUAIS E NAVEGAÇÃO
// ==========================================

// Efeito de scroll na Navbar (muda a cor ao rolar)
const navbar = document.querySelector('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.style.background = 'linear-gradient(135deg, #CC5500 0%, #FF6A00 50%, #CC4400 100%)';
    navbar.style.boxShadow = '0 4px 30px rgba(255, 106, 0, 0.5)';
  } else {
    navbar.style.background = 'linear-gradient(135deg, #FF6A00 0%, #FF8C3A 50%, #E55A00 100%)';
    navbar.style.boxShadow = '0 2px 20px rgba(255, 106, 0, 0.4)';
  }
});

// Menu Hambúrguer (Mobile)
const btnHamburguer = document.getElementById('hamburguer');
const menu = document.querySelector('.menu');

if (btnHamburguer) {
    btnHamburguer.addEventListener('click', () => {
        menu.classList.toggle('ativo');
    });
}

// Scroll suave para os links internos
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ==========================================
// 2. ANIMAÇÕES DE ENTRADA (Fade-In)
// ==========================================

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Aplica o efeito de fade-in nos cards e seções
document.querySelectorAll('.card-plano, .item-dif').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// ==========================================
// 3. SISTEMA DE LOGIN (LocalStorage)
// ==========================================

// Função que verifica se tem alguém logado e troca o ícone pelo nome
function verificarLogin() {
    const nomeUsuario = localStorage.getItem('usuarioLogado');
    const linkLogin = document.getElementById('alogin');

    if (nomeUsuario && linkLogin) {
        // Se tiver alguém logado, eu troco o ícone pelo "Olá, Nome"
        // textContent (e não innerHTML) para o nome nunca ser interpretado como HTML
        const saudacao = document.createElement('span');
        saudacao.style.cssText = 'color: white; font-weight: 600; font-size: 0.9em; margin-right: 10px;';
        saudacao.textContent = 'Olá, ' + nomeUsuario.split(' ')[0];
        linkLogin.replaceChildren(saudacao);
        
        // Se clicar no nome, ele pergunta se deseja deslogar
        linkLogin.addEventListener('click', (e) => {
            e.preventDefault(); // Sempre cancela o link original
            
            mostrarModal('Sair da Conta', 'Deseja realmente sair da sua conta?', () => {
                localStorage.removeItem('usuarioLogado');
                window.location.reload(); // Recarrega para voltar o ícone original
            });
        });
    }
}

// Executa a verificação assim que a página termina de carregar
window.addEventListener('load', verificarLogin);

// ==========================================
// 4. PAINEL DE ACESSIBILIDADE
// ==========================================

const btnAcesso = document.getElementById('btn-acessibilidade');
const painelOpcoes = document.getElementById('opcoes-acessibilidade');

if (btnAcesso) {
    btnAcesso.addEventListener('click', () => {
        const aberto = !painelOpcoes.hidden;
        painelOpcoes.hidden = aberto;
        btnAcesso.setAttribute('aria-expanded', String(!aberto));
    });
}

// Fecha o painel ao clicar fora
document.addEventListener('click', (e) => {
    if (painelOpcoes && !e.target.closest('#painel-acessibilidade')) {
        painelOpcoes.hidden = true;
        if (btnAcesso) btnAcesso.setAttribute('aria-expanded', 'false');
    }
});

// Ajuste de fonte e contraste
const TAMANHOS = [12, 14, 16, 18, 20, 22];
let idxFonte = 2;

function aplicarFonte() {
    document.documentElement.style.setProperty('--tamanho-base', TAMANHOS[idxFonte] + 'px');
}

const btnAumentar = document.getElementById('fonte-aumentar');
const btnResetar = document.getElementById('fonte-resetar');

if (btnAumentar) {
    btnAumentar.addEventListener('click', () => {
        if (idxFonte < TAMANHOS.length - 1) { idxFonte++; aplicarFonte(); }
    });
}

if (btnResetar) {
    btnResetar.addEventListener('click', () => {
        idxFonte = 2; aplicarFonte();
    });
}

const btnContraste = document.getElementById('toggle-contraste');
if (btnContraste) {
    btnContraste.addEventListener('click', () => {
        document.body.classList.toggle('alto-contraste');
    });
}
