// ==========================================
// SCRIPT DE LOGIN - SELNET
// Organizado para o trabalho da Unisuam
// ==========================================

// --- PEGANDO OS ELEMENTOS DO HTML ---
let campoEmail = document.getElementById('iemail');
let campoSenha = document.getElementById('isenha');
let formularioLogin = document.querySelector('form');

// ==========================================
// 0. FUNÇÕES DO MODAL PERSONALIZADO
// ==========================================

function mostrarModal(titulo, mensagem, acaoAoFechar = null) {
    const modal = document.getElementById('meuModal');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalMensagem = document.getElementById('modal-mensagem');
    
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
    modal.style.display = 'none';
}

// ==========================================
// 1. VALIDAÇÃO E AUTENTICAÇÃO (LocalStorage)
// ==========================================

if (formularioLogin) {
    formularioLogin.addEventListener('submit', function(e) {
        e.preventDefault(); // Impede o envio real para o redirecionamento funcionar
        
        let s = campoSenha.value;

        // Trava de segurança: exatamente 8 caracteres
        if (s.length !== 8) {
            mostrarModal('Atenção', 'A senha deve ter exatamente 8 caracteres!');
            return;
        }
        
        // Trava de senha fraca (sequências ou repetidos)
        let seq = "12345678";
        let repetida = true;
        for(let i=1; i<8; i++) { 
            if(s[i] !== s[0]) repetida = false; 
        }
        
        if (s === seq || repetida) {
            mostrarModal('Acesso Negado', 'Essa senha é muito fraca!');
            return;
        }

        // Busco os dados do usuário no localStorage usando o e-mail digitado
        const usuarioSalvo = localStorage.getItem(campoEmail.value.trim().toLowerCase());

        // Se não encontrar nada, significa que o e-mail não está no "banco"
        if (!usuarioSalvo) {
            mostrarModal('Erro', 'Você ainda não está cadastrado!');
            return;
        }

        // Transformo o texto de volta em objeto para conferir a senha
        const dados = JSON.parse(usuarioSalvo);

        if (dados.senha === s) {
            // Se a senha bater, eu salvo quem é o usuário logado no momento
            localStorage.setItem('usuarioLogado', dados.nome);
            
            mostrarModal('Sucesso!', 'Login realizado com sucesso! Bem-vindo(a), ' + dados.nome, () => {
                // Redireciona para a página principal (Home)
                window.location.href = "../../telas/index.html";
            });
        } else {
            mostrarModal('Erro', 'E-mail ou senha incorretos!');
        }
    });
}

// ==========================================
// 2. PAINEL DE ACESSIBILIDADE
// ==========================================

const btnAcesso = document.getElementById('btn-acessibilidade');
const painelOpcoes = document.getElementById('opcoes-acessibilidade');

// Abre ou fecha o painel ao clicar no botão
btnAcesso.addEventListener('click', () => {
    if (painelOpcoes.style.display === 'none' || painelOpcoes.style.display === '') {
        painelOpcoes.style.display = 'block';
    } else {
        painelOpcoes.style.display = 'none';
    }
});

// Fecha o painel ao clicar fora dele
document.addEventListener('click', (e) => {
    if (!e.target.closest('#painel-acessibilidade')) {
        painelOpcoes.style.display = 'none';
    }
});

// --- Ajuste de tamanho de fonte ---
const tamanhos = [12, 14, 16, 18, 20, 22];
let indiceFonte = 2; // 16px padrão

function aplicarFonte() {
    document.documentElement.style.setProperty('--tamanho-base', tamanhos[indiceFonte] + 'px');
}

document.getElementById('fonte-aumentar').addEventListener('click', () => {
    if (indiceFonte < tamanhos.length - 1) {
        indiceFonte++;
        aplicarFonte();
    }
});

document.getElementById('fonte-resetar').addEventListener('click', () => {
    indiceFonte = 2;
    aplicarFonte();
});

// --- Ativar Alto Contraste ---
const btnContraste = document.getElementById('toggle-contraste');
btnContraste.addEventListener('click', () => {
    document.body.classList.toggle('alto-contraste');
});
