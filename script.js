let listaProdutosOriginal = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let filtroAte10 = localStorage.getItem('filtroAte10') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    configurarFiltroPesquisa();
    configurarBuscaMobile();
    atualizarInterfaceCarrinho();
});

async function carregarProdutos() {
    try {
        const resposta = await fetch('produtos.json');
        if (!resposta.ok) throw new Error('Falha ao ler arquivo de produtos.');
        listaProdutosOriginal = await resposta.json();

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
    let produtos = [...listaProdutosOriginal];

    if (filtroAte10) {
        produtos = produtos.filter(p => obterPreco(p) <= 10.00);
    }

    // Ordem alfabética sempre
    produtos.sort((a, b) => a.Produto.localeCompare(b.Produto, 'pt-BR'));

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

        // Carrega imagem: tenta arquivo local primeiro, senão gera via Canvas
        carregarImagemCard(wrapId, item.imagem || null, item.Produto, item.Categoria || '');
    });
}

// ── Imagens ──────────────────────────────────────────────────────────────────
// Paleta por categoria — fundo, texto, emoji
const _catCfg = {
    'Automotivo e Pedras':        ['#1e3a5f','#a8c8f0','🚗'],
    'Desinfetantes e Alvejantes': ['#0d4f3c','#86efb8','🧴'],
    'Elétrica e Eletrônicos':     ['#3b1f6e','#c4b5fd','🔌'],
    'Higiene e Cuidados':         ['#6b2d6b','#f0abfc','🧼'],
    'Lavanderia e Louça':         ['#1a4f6e','#7dd3fc','🫧'],
    'Outros':                     ['#3d3d3d','#d1d5db','📦'],
    'Panos e Esponjas':           ['#4a3728','#fbbf80','🧽'],
    'Papelaria e Escritório':     ['#1e4a2e','#86efac','📝'],
    'Papéis':                     ['#555555','#e5e7eb','🧻'],
    'Sacos e Lixeiras':           ['#2d2d1f','#bef264','🗑️'],
    'Utensílios de Limpeza':      ['#1a3a5c','#93c5fd','🧹'],
    'Vestuário e Têxtil':         ['#5c1a3a','#fda4af','👕'],
};
const _catDefault = ['#374151','#d1d5db','🏷️'];

function gerarImagemCanvas(nome, categoria) {
    const [bg, fg, emoji] = _catCfg[categoria] || _catDefault;
    const W = 200, H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fundo
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Emoji centralizado
    ctx.font = '44px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, W / 2, H / 2 - 14);

    // Nome do produto (quebra automática)
    ctx.fillStyle = fg;
    ctx.font = 'bold 10px sans-serif';
    ctx.textBaseline = 'top';
    const maxW = W - 16;
    const palavras = nome.split(' ');
    let linha = '';
    const linhas = [];
    for (const p of palavras) {
        const teste = linha ? linha + ' ' + p : p;
        if (ctx.measureText(teste).width > maxW && linha) {
            linhas.push(linha);
            linha = p;
        } else {
            linha = teste;
        }
        if (linhas.length >= 2) break;
    }
    if (linha && linhas.length < 2) linhas.push(linha);

    linhas.forEach((l, i) => {
        ctx.fillText(l.toUpperCase(), W / 2, H - 30 + i * 13);
    });

    return canvas.toDataURL();
}

async function carregarImagemCard(wrapId, srcLocal, nomeProduto, categoria) {
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

    // 2. Gera imagem via Canvas (zero rede, zero API key)
    const dataUrl = gerarImagemCanvas(nomeProduto, categoria);
    wrap.innerHTML = `<img src="${dataUrl}" alt="${nomeProduto}" class="w-full h-32 object-cover rounded-xl">`;
}

function testarImagem(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
    });
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
