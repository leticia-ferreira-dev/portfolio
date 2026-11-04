// array vazio para guardar as anotações
let minhasNotas = [];

// Transforma caracteres especiais em texto seguro, para que uma nota como
// <b>oi</b> apareça escrita na tela em vez de virar HTML de verdade
function escapar(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// função chamada quando clico no botão "Adicionar"
function adicionarNota() {
    // separo o campo aonde o usuario digita
    let campo = document.getElementById('campo-nota');
    // Aqui eu pego so o valor do id campo (que é oque o usuario escreveu)
    let textoNota = campo.value;

    // Verifico se o campo não está vazio ou só com espaços
    // usei o .trim para não deixar o usuario mandar so espaços, já que ele serve para limpar espaços vazios
    if (textoNota.trim() === "") {
        alert("Opa! Digite alguma coisa antes de salvar.");
        return; // Para a função aqui (se estiver vazio)
    }

    // O .push serve para adicionar a nota que o usuario esvreveu no array
    minhasNotas.push(textoNota);

    // Limpo o campo de texto 
    campo.value = "";

    // Chamo a função que desenha as notas na tela
    mostrarNotas();
}

// Essa função limpa a lista na tela e desenha tudo de novo do zero
function mostrarNotas() {
    let lista = document.getElementById('lista-anotacoes');
    
    // Começo a lista vazia para não duplicar o que já tem
    lista.innerHTML = "";

    // Uso um loop (for) para passar por cada nota do array e mostrar elas na tela
    for (let i = 0; i < minhasNotas.length; i++) {
        // Aqui uso o .lenght para o for saber quantos itens tem na minha lista e parar o loop quando passar deles (o .lenght serve para contar quantos itens existem)

       

        // Esse += serve para adicionar a proxima anotação sem apagar as anteriores que foram adicionadas
        lista.innerHTML += `
            <div class="item-nota">
                <span>${escapar(minhasNotas[i])}</span>
                <button class="btn-remover" onclick="removerNota(${i})">Remover</button>
            </div>
        `;
        // A parte do span é aonde a anotação entra o i ali serve para o for pegar as anotações em ordem, fazendo assim as anotações ficarem "marcadas" facilitando na hora de remover

        // O button esta ali para que quando a anotação for adicionada na tela ela ja venha com a opção remover junta

        // O $ serve para concatenar e as ` que permitem ele ser usado assim, facilita a criação do cod
    }
}

// Essa função remove a nota baseada na posição dela no array

//Quando eu defino a função com a palavra posicao entre parênteses, eu estou criando um espaço reservado, o navegador entende automaticamente que o valor que eu enviei lá no onclick do botão deve ser atribuído a esse nome posicao.
function removerNota(posicao) {
    // O splice serve para remover itens do array, ele precisa so saber em qual posição começar a remover e quantos remover, no caso eu coloque pra ele começar no parametro posição que sempre vai ser oque eu clicar na hora e remover apenas um, fazendo sair apenas o escolhido 
    minhasNotas.splice(posicao, 1);

    // Atualizo a tela para mostrar a lista sem a nota removida
    mostrarNotas();
}
