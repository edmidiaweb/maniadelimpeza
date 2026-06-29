let listaProdutosOriginal = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let categoriaAtiva = localStorage.getItem('categoriaAtiva') || 'Todos';
let filtroAte10 = localStorage.getItem('filtroAte10') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    configurarFiltroPesquisa();
    configurarBuscaMobile();
    atualizarInterfaceCarrinho();
    
    // Atalho Tecla Esc para fechar menu de categorias
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fecharMenuCategorias();
    });
});

async function carregarProdutos() {
    try {
        const resposta = await fetch('produtos.json');
        if (!resposta.ok) throw new Error('Falha ao ler arquivo de produtos.');
        listaProdutosOriginal = await resposta.json();
        
        gerarMenuCategorias();
        atualizarBotaoFiltroPrecoUI();
        aplicarFiltros(document.getElementById('searchBarDesktop').value || '');
    } catch (erro) {
        console.error(erro);
        document.getElementById('gridProdutos').innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Erro ao carregar o catálogo. Certifique-se de usar um servidor local (Live Server).</p>
            </div>
        `;
    }
}

// Geração Inteligente e Dinâmica do Menu de Categorias
function gerarMenuCategorias() {
    const contagem = {};
    let totalGeral = 0;
    
    listaProdutosOriginal.forEach(p => {
        if (p.Categoria) {
            contagem[p.Categoria] = (contagem[p.Categoria] || 0) + 1;
            totalGeral++;
        }
    });
    
    const categoriesOrdenadas = Object.keys(contagem).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const container = document.getElementById('listaCategoriasContainer');
    if (!container) return;
    
    let html = `
        <button onclick="selecionarCategoria('Todos')" class="item-categoria-btn w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition ${categoriaAtiva === 'Todos' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}" data-nome-cat="Todos">
            <span><i class="fas fa-th-large mr-2 opacity-70"></i> Todos</span>
            <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">${totalGeral}</span>
        </button>
    `;
    
    categoriesOrdenadas.forEach(cat => {
        if (contagem[cat] > 0) {
            const ativa = categoriaAtiva === cat;
            html += `
                <button onclick="selecionarCategoria('${cat}')" class="item-categoria-btn w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex justify-between items-center transition ${ativa ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}" data-nome-cat="${cat}">
                    <span class="truncate">${cat}</span>
                    <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">${contagem[cat]}</span>
                </button>
            `;
        }
    });
    
    container.innerHTML = html;
    document.getElementById('txtCategoriaAtiva').innerText = categoriaAtiva;
}

// Filtragem instantânea da lista de categorias dentro do dropdown
function filtrarListaCategorias() {
    const termo = normalizarTexto(document.getElementById('buscaCategoriaInput').value);
    const botoes = document.querySelectorAll('.item-categoria-btn');
    
    botoes.forEach(btn => {
        const nomeCat = normalizarTexto(btn.getAttribute('data-nome-cat'));
        if (nomeCat === 'todos' || nomeCat.includes(termo)) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
}

// Gerenciamento de Abertura/Fechamento com Animações CSS controladas via JS
function toggleMenuCategorias() {
    const modal = document.getElementById('modalCategorias');
    if (modal.classList.contains('hidden')) {
        abrirMenuCategorias();
    } else {
        fecharMenuCategorias();
    }
}

function abrirMenuCategorias() {
    const modal = document.getElementById('modalCategorias');
    const painel = document.getElementById('painelCategorias');
    document.getElementById('buscaCategoriaInput').value = '';
    filtrarListaCategorias();
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        painel.classList.remove('scale-95');
        painel.classList.add('scale-100');
    }, 10);
}

function fecharMenuCategorias() {
    const modal = document.getElementById('modalCategorias');
    const painel = document.getElementById('painelCategorias');
    if (!modal || modal.classList.contains('hidden')) return;
    
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    painel.classList.remove('scale-100');
    painel.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function selecionarCategoria(categoria) {
    categoriaAtiva = categoria;
    localStorage.setItem('categoriaAtiva', categoria);
    
    gerarMenuCategorias();
    fecharMenuCategorias();
    
    const termo = document.getElementById('searchBarDesktop').value || '';
    aplicarFiltros(termo);
}

// Gerenciamento e persistência do filtro cumulativo "Até R$ 10"
function toggleFiltroPreco() {
    filtroAte10 = !filtroAte10;
    localStorage.setItem('filtroAte10', filtroAte10);
    atualizarBotaoFiltroPrecoUI();
    
    const termo = document.getElementById('searchBarDesktop').value || '';
    aplicarFiltros(termo);
}

function atualizarBotaoFiltroPrecoUI() {
    const btn = document.getElementById('btnFiltroPreco');
    if (!btn) return;
    if (filtroAte10) {
        btn.classList.remove('bg-white', 'border-gray-200', 'text-gray-700', 'hover:bg-gray-50');
        btn.classList.add('bg-indigo-100', 'border-indigo-300', 'text-indigo-800', 'font-bold');
    } else {
        btn.classList.remove('bg-indigo-100', 'border-indigo-300', 'text-indigo-800', 'font-bold');
        btn.classList.add('bg-white', 'border-gray-200', 'text-gray-700', 'hover:bg-gray-50');
    }
}

function obterPreco(item) {
    const precoRaw = item["Valor de venda (R$)"] !== undefined ? item["Valor de venda (R$)"] : item["Valor de venda"];
    const precoNum = parseFloat(precoRaw);
    return isNaN(precoNum) ? 0 : precoNum;
}

function normalizarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterProdutosBase() {
    let produtos = listaProdutosOriginal;
    
    if (categoriaAtiva !== 'Todos') {
        produtos = produtos.filter(p => p.Categoria === categoriaAtiva);
    }
    
    if (filtroAte10) {
        produtos = produtos.filter(p => obterPreco(p) <= 10.00);
    }
    
    return produtos;
}

function obterCamposPesquisa() {
    return Array.from(document.querySelectorAll('[data-search-input]'));
}

function obterBotoesLimpar() {
    return Array.from(document.querySelectorAll('[data-clear-search]'));
}

function sincronizarCamposPesquisa(valor, campoOrigem = null) {
    obterCamposPesquisa().forEach(input => {
        if (input !== campoOrigem) {
            input.value = valor;
        }
    });
}

function atualizarBotoesLimpar(valor) {
    const deveExibir = valor.trim().length > 0;
    obterBotoesLimpar().forEach(botao => {
        botao.classList.toggle('hidden', !deveExibir);
    });
}

function abrirBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.remove('hidden');
    toggle.classList.remove('bg-white', 'border', 'border-indigo-100', 'text-indigo-900', 'hover:bg-indigo-50');
    toggle.classList.add('bg-indigo-600', 'text-white');
    setTimeout(() => mobileInput.focus(), 50);
}

function fecharBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.add('hidden');
    toggle.classList.remove('bg-indigo-600', 'text-white');
    toggle.classList.add('bg-white', 'border', 'border-indigo-100', 'text-indigo-900', 'hover:bg-indigo-50');
    mobileInput.blur();
}

function alternarBuscaMobile() {
    const container = document.getElementById('mobileSearchContainer');
    if (!container) return;
    if (container.classList.contains('hidden')) {
        abrirBuscaMobile();
    } else {
        fecharBuscaMobile();
    }
}

function aplicarFiltros(termo = '') {
    const termoBuscado = normalizarTexto(termo.trim());
    let produtosFiltrados = obterProdutosBase();

    if (!termoBuscado) {
        renderizarProdutos(produtosFiltrados);
        return;
    }

    produtosFiltrados = produtosFiltrados.filter(item => {
        const nomeProduto = normalizarTexto(item.Produto);
        return nomeProduto.includes(termoBuscado);
    });

    produtosFiltrados.sort((a, b) => {
        const nomeA = normalizarTexto(a.Produto);
        const nomeB = normalizarTexto(b.Produto);
        const aComeca = nomeA.startsWith(termoBuscado) ? 1 : 0;
        const bComeca = nomeB.startsWith(termoBuscado) ? 1 : 0;
        return bComeca - aComeca;
    });

    renderizarProdutos(produtosFiltrados);
}

function limparPesquisa(inputIdParaFoco = 'searchBarDesktop') {
    sincronizarCamposPesquisa('');
    atualizarBotoesLimpar('');
    aplicarFiltros('');
    const input = document.getElementById(inputIdParaFoco);
    if (input && !input.closest('.hidden')) {
        input.focus();
    }
}

function renderizarProdutos(produtos) {
    const grid = document.getElementById('gridProdutos');
    grid.innerHTML = '';

    if (produtos.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-search text-3xl mb-2"></i>
                <p>Nenhum produto encontrado para os filtros selecionados.</p>
            </div>
        `;
        return;
    }

    produtos.forEach(item => {
        const preco = obterPreco(item);
        const itemNoCarrinho = carrinho.find(c => c.nome === item.Produto);
        const qtd = itemNoCarrinho ? itemNoCarrinho.qtd : 0;

        const idImagem = `img-${btoa(encodeURIComponent(item.Produto)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
        const termoBusca = item.Produto.toLowerCase();

        const card = document.createElement('div');
        card.className = "bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition duration-200";

        // Bloco de imagem: tenta carrinho local → Unsplash → fallback ícone+nome
        const wrapId = `wrap-${idImagem}`;
        card.innerHTML = `
            <div>
                <div id="${wrapId}" class="w-full h-32 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center">
                    <i class="fas fa-spinner fa-spin text-indigo-300 text-xl"></i>
                </div>
                <h3 class="text-xs font-bold text-gray-700 mt-2 line-clamp-2 uppercase h-8">${item.Produto}</h3>
            </div>
            <div class="mt-2">
                <p class="text-indigo-900 font-extrabold text-base">R$ ${preco.toFixed(2).replace('.', ',')}</p>
                <div class="mt-2" id="btn-container-${btoa(encodeURIComponent(item.Produto)).replace(/=/g, '')}">
                    ${renderizarBotaoAcao(item.Produto, preco, qtd)}
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Carrega imagem: tenta arquivo local primeiro, senão busca no Unsplash
        carregarImagemCard(wrapId, item.imagem || null, termoBusca, item.Produto);
    });
}

// Cache para evitar buscas repetidas da mesma query
const _cacheUnsplash = {};

async function carregarImagemCard(wrapId, srcLocal, termoBusca, nomeProduto) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    // 1. Tenta imagem local
    if (srcLocal) {
        const ok = await testarImagem(srcLocal);
        if (ok) {
            wrap.innerHTML = `<img src="${srcLocal}" alt="${nomeProduto}" class="w-full h-32 object-contain p-2 bg-gray-50 rounded-xl">`;
            return;
        }
    }

    // 2. Busca no Unsplash Source (sem chave de API, via source.unsplash.com)
    try {
        // Traduz termos muito específicos em português para melhor resultado
        const query = encodeURIComponent(traduzirTermo(termoBusca));
        const url = `https://source.unsplash.com/200x200/?${query}`;

        // source.unsplash.com redireciona para a imagem real — apenas injetamos a img
        wrap.innerHTML = `<img src="${url}" alt="${nomeProduto}"
            class="w-full h-32 object-cover rounded-xl"
            onerror="this.parentNode.innerHTML=obterFallbackNome('${nomeProduto.replace(/'/g,"\\'")}')">`;
    } catch(e) {
        wrap.innerHTML = obterFallbackNome(nomeProduto);
    }
}

function testarImagem(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
}

// Mapa de tradução dos termos mais comuns do catálogo
function traduzirTermo(termo) {
    const mapa = {
        'vassoura': 'broom', 'vassoura piaçava': 'broom', 'vassoura piassava': 'broom',
        'rodo': 'floor squeegee', 'balde': 'bucket', 'bacia': 'washbasin',
        'esponja': 'sponge', 'esfregão': 'mop sponge', 'mop': 'mop floor',
        'desinfetante': 'disinfectant cleaner', 'alvejante': 'bleach bottle',
        'agua sanitaria': 'bleach bottle', 'cloro': 'chlorine bleach',
        'sabão': 'soap', 'sabao': 'soap', 'detergente': 'dish soap liquid',
        'lava roupa': 'laundry detergent', 'amaciante': 'fabric softener',
        'papel higienico': 'toilet paper', 'papel toalha': 'paper towel',
        'saco lixo': 'trash bag', 'lixeira': 'trash bin',
        'luva': 'cleaning gloves', 'pano': 'cleaning cloth',
        'esponja de aço': 'steel wool', 'palha de aço': 'steel wool',
        'bola': 'ball', 'bola futebol': 'soccer ball', 'bola volei': 'volleyball',
        'baralho': 'playing cards', 'domino': 'dominoes game',
        'avental': 'apron kitchen', 'tapete': 'rug mat',
        'escova': 'scrub brush', 'escova sanitaria': 'toilet brush',
        'pá lixo': 'dustpan', 'pa lixo': 'dustpan',
        'silicone': 'silicone gel', 'cera': 'floor wax',
        'espanador': 'feather duster', 'creolina': 'disinfectant cleaner',
        'limpa vidro': 'glass cleaner', 'multiuso': 'multipurpose cleaner',
    };
    const termoNorm = termo.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    for (const [pt, en] of Object.entries(mapa)) {
        if (termoNorm.includes(pt)) return en;
    }
    // Fallback: envia o próprio termo (Unsplash lida bem com português)
    return termo;
}

function obterFallbackNome(nome) {
    return `<div class="w-full h-32 bg-indigo-50 flex flex-col items-center justify-center gap-2 rounded-xl px-2">
        <i class="fas fa-box text-indigo-300 text-2xl"></i>
        <span class="text-indigo-400 text-[10px] font-semibold text-center leading-tight uppercase">${nome}</span>
    </div>`;
}

function obterFallbackIcone() {
    return `<div class="w-full h-32 bg-indigo-50 flex items-center justify-center text-indigo-400 rounded-xl"><i class="fas fa-box text-3xl"></i></div>`;
}

function renderizarBotaoAcao(nome, preco, qtd) {
    if (qtd > 0) {
        return `
            <div class="flex items-center justify-between bg-indigo-50 rounded-xl p-1 border border-indigo-200">
                <button onclick="alterarQuantidade('${nome}', ${preco}, -1)" aria-label="Diminuir quantidade" class="w-8 h-8 flex items-center justify-center bg-white text-indigo-900 rounded-lg shadow-xs hover:bg-indigo-100 font-bold transition">-</button>
                <span class="font-bold text-sm text-indigo-950">${qtd}</span>
                <button onclick="alterarQuantidade('${nome}', ${preco}, 1)" aria-label="Aumentar quantidade" class="w-8 h-8 flex items-center justify-center bg-white text-indigo-900 rounded-lg shadow-xs hover:bg-indigo-100 font-bold transition">+</button>
            </div>
        `;
    } else {
        return `
            <button onclick="alterarQuantidade('${nome}', ${preco}, 1)" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs">
                <i class="fas fa-plus text-[10px]"></i> Adicionar
            </button>
        `;
    }
}

function configurarFiltroPesquisa() {
    const searchInputs = obterCamposPesquisa();
    searchInputs.forEach(searchBar => {
        searchBar.addEventListener('input', (e) => {
            const valor = e.target.value;
            sincronizarCamposPesquisa(valor, e.target);
            atualizarBotoesLimpar(valor);
            aplicarFiltros(valor);
        });
    });

    obterBotoesLimpar().forEach(botao => {
        botao.addEventListener('click', () => {
            limparPesquisa(botao.getAttribute('data-target-input'));
        });
    });
}

function configurarBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    if (!toggle) return;
    toggle.addEventListener('click', alternarBuscaMobile);
}

function alterarQuantidade(nome, preco, alterar) {
    const index = carrinho.findIndex(item => item.nome === nome);
    if (index > -1) {
        carrinho[index].qtd += alterar;
        if (carrinho[index].qtd <= 0) {
            carrinho.splice(index, 1);
        }
    } else if (alterar > 0) {
        carrinho.push({ nome, preco, qtd: 1 });
    }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    
    const idSeguro = btoa(encodeURIComponent(nome)).replace(/=/g, '');
    const container = document.getElementById(`btn-container-${idSeguro}`);
    const itemAtualizado = carrinho.find(item => item.nome === nome);
    const novaQtd = itemAtualizado ? itemAtualizado.qtd : 0;
    
    if (container) {
        container.innerHTML = renderizarBotaoAcao(nome, preco, novaQtd);
    }
    atualizarInterfaceCarrinho();
}

function atualizarInterfaceCarrinho() {
    const badge = document.getElementById('badgeCarrinho');
    const barraMobile = document.getElementById('barraFixaMobile');
    const labelQtdMobile = document.getElementById('qtdItensMobile');
    const totalInferior = document.getElementById('totalFixInferior');
    
    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const valorTotal = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco), 0);

    if (totalItens > 0) {
        badge.innerText = totalItens;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (barraMobile && labelQtdMobile && totalInferior) {
        if (totalItens > 0) {
            labelQtdMobile.innerText = totalItens;
            totalInferior.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
            barraMobile.classList.remove('hidden');
        } else {
            barraMobile.classList.add('hidden');
        }
    }
}
