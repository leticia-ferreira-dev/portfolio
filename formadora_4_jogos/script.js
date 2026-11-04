// A chave da API NÃO fica mais escrita aqui. Ela vem do arquivo config.js,
// que não é enviado para o GitHub (veja .gitignore e config.example.js).
const API_KEY = window.RAWG_API_KEY || '';

const btnCarregar = document.getElementById('btn-carregar');
const inputBusca = document.getElementById('input-busca');
const containerJogos = document.getElementById('container-jogos');

// Slug da plataforma PS2 na RAWG
const PLATAFORMA_PS2_SLUG = 'playstation2';

// Jogos de exemplo usados no MODO DEMONSTRAÇÃO (quando não há chave da API).
// Só os nomes: notas e capas vêm da API de verdade quando a chave é configurada.
const JOGOS_DEMO = [
    "God of War II", "Shadow of the Colossus", "Gran Turismo 4", "Metal Gear Solid 3: Snake Eater",
    "Final Fantasy X", "Kingdom Hearts", "Resident Evil 4", "Grand Theft Auto: San Andreas",
    "Okami", "Silent Hill 2", "Tekken 5", "Devil May Cry 3"
].map(name => ({ name }));

// 1. Função principal: busca jogos (filtrados por nome ou os mais bem avaliados)
async function buscarJogosPS2() {
    const termoBusca = inputBusca.value.trim();

    // Sem chave da API: usa a lista de demonstração (sem internet e sem cadastro)
    if (!API_KEY || API_KEY === 'COLE_SUA_CHAVE_AQUI') {
        const filtrados = JOGOS_DEMO.filter(j => j.name.toLowerCase().includes(termoBusca.toLowerCase()));
        renderizarJogos(filtrados, true);
        return;
    }

    containerJogos.innerHTML = "<p>Buscando no catálogo do PS2...</p>";

    try {
        let urlRAWG = `https://api.rawg.io/api/games?key=${API_KEY}&platforms.slug=${PLATAFORMA_PS2_SLUG}&page_size=12`;

        if (termoBusca !== "") {
            // Se o usuário digitou algo: pesquisa por texto E filtra pela plataforma PS2
            urlRAWG += `&search=${encodeURIComponent(termoBusca)}`;
        } else {
            // Se o campo estiver vazio: traz os mais bem avaliados por padrão
            urlRAWG += `&ordering=-rating`;
        }

        const resposta = await fetch(urlRAWG);

        if (!resposta.ok) {
            throw new Error(`Erro na API: ${resposta.status}`);
        }

        const dados = await resposta.json();
        renderizarJogos(dados.results || []);

    } catch (erro) {
        console.error("Erro ao consumir a API:", erro);
        containerJogos.innerHTML = "<p style='color: #ff5555;'>Erro ao carregar dados. Verifique sua chave da API no arquivo config.js.</p>";
    }
}

// Evita que nomes com símbolos (< > &) quebrem o HTML da página
function escapar(texto) {
    return String(texto)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Imagem de reserva (o site via.placeholder.com saiu do ar)
const SEM_IMAGEM = "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#333'/><text x='50%' y='50%' fill='#aaa' font-family='sans-serif' font-size='20' text-anchor='middle'>Sem imagem</text></svg>");

// 2. Função para desenhar os cards na tela
function renderizarJogos(jogos, modoDemo = false) {
    containerJogos.innerHTML = "";

    if (modoDemo) {
        const aviso = document.createElement('p');
        aviso.style.cssText = 'grid-column: 1 / -1; color: #f0c040;';
        aviso.textContent = 'Modo demonstração: lista de exemplo, sem capas e sem notas. Configure a chave da API (config.js) para ver os dados reais.';
        containerJogos.appendChild(aviso);
    }

    if (jogos.length === 0) {
        containerJogos.innerHTML = "<p>Nenhum jogo de PS2 encontrado com esse nome.</p>";
        return;
    }

    jogos.forEach(jogo => {
        const capaUrl = jogo.background_image || SEM_IMAGEM;
        const resumo = jogo.rating ? `⭐ Nota: ${jogo.rating} / 5` : "Sem avaliação cadastrada para este título.";

        const card = document.createElement('div');
        card.classList.add('card-jogo');
        card.innerHTML = `
            <img src="${capaUrl}" alt="Capa do jogo ${escapar(jogo.name)}">
            <div class="card-info">
                <h3>${escapar(jogo.name)}</h3>
                <p>${resumo}</p>
            </div>
        `;
        containerJogos.appendChild(card);
    });
}

// Evento de clique no botão buscar
btnCarregar.addEventListener('click', buscarJogosPS2);

// Permite buscar também ao apertar a tecla "Enter" dentro do input
inputBusca.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        buscarJogosPS2();
    }
});

// Carrega os jogos mais populares automaticamente assim que a página abre
buscarJogosPS2();
