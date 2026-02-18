// =============================
// CONFIG SUPABASE
// =============================
const SUPABASE_URL = "https://lergjqrwzdzxvuxfqiss.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlcmdqcXJ3emR6eHZ1eGZxaXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQyNDQsImV4cCI6MjA4NjM4MDI0NH0.GdnCgSuyRoa7Ea6t5ps7YfK7H6JHd1EPp9p6Y0geQYQ";

if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

var supabase = window.supabaseClient;

// =============================
// CACHE GLOBAL (PERFORMANCE)
// =============================
let cacheProdutos = null;


// =============================
// MODAL NOTIFICAÇÃO
// =============================
function mostrarModal(texto, cor = "#2196f3") {
    let modal = document.getElementById("modalAviso");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modalAviso";
        modal.innerHTML = `<button onclick="fecharModal()">×</button><span id="modalTexto"></span>`;
        modal.style = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 250px;
        max-width: 350px;
        background: #fff;
        border-left: 5px solid ${cor};
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        padding: 15px 20px;
        z-index: 9999;
        font-family: sans-serif;
        display: none;
        border-radius: 5px;
        color: #333;
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = "block";
    modal.querySelector("button").style.cursor = "pointer";
    modal.querySelector("span").innerHTML = texto;

    setTimeout(() => {
        modal.style.display = "none";
    }, 3000);
}

// =============================
// LOADING GLOBAL
// =============================
function showLoading(texto = "Carregando...") {
    let loader = document.getElementById("globalLoader");

    if (!loader) {
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.innerHTML = `
        <div class="loaderBox">
        <div class="spinner"></div>
        <div class="loaderText">${texto}</div>
        </div>`;

        const style = document.createElement("style");
        style.innerHTML = `
        #globalLoader{
        position:fixed;
        top: 14rem;
        left: 0;
        right: 0;
        bottom: 0;
        background:rgba(255,255,255,0.7);
        backdrop-filter: blur(3px);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:99999;
        font-family:sans-serif;
        }
        .loaderBox{text-align:center;}
        .spinner{
        width:45px;
        height:45px;
        border:5px solid #ddd;
        border-top:5px solid #2196f3;
        border-radius:50%;
        animation:spin .8s linear infinite;
        margin:0 auto 10px;
        }
        @keyframes spin{
        from{transform:rotate(0deg);}
        to{transform:rotate(360deg);}
        }`;
        document.head.appendChild(style);
        document.body.appendChild(loader);
    } else {
        loader.querySelector(".loaderText").innerHTML = texto;
        loader.style.display = "flex";
    }
}

function hideLoading() {
    const loader = document.getElementById("globalLoader");
    if (loader) loader.style.display = "none";
}

// =============================
// FUNÇÃO MODAL DE CONFIRMAÇÃO
// =============================
function mostrarConfirmacao(texto, callback) {
    let modal = document.createElement("div");
    modal.style = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: sans-serif;
    `;

    modal.innerHTML = `
    <div style="background:#fff; padding:20px 30px; border-radius:8px; max-width:400px; text-align:center;">
    <p style="margin-bottom:20px;">${texto}</p>
    <button id="modalOk" style="margin-right:10px; padding:8px 16px; background:#4caf50; color:#fff; border:none; border-radius:4px; cursor:pointer;">OK</button>
    <button id="modalCancelar" style="padding:8px 16px; background:#e53935; color:#fff; border:none; border-radius:4px; cursor:pointer;">Cancelar</button>
    </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#modalOk").onclick = () => {
        callback(true);
        modal.remove();
    };

    modal.querySelector("#modalCancelar").onclick = () => {
        callback(false);
        modal.remove();
    };
}

// =============================
// LIMPAR PRODUTOS COM MODAL
// =============================
async function limparProdutosBanco() {
    mostrarConfirmacao("Tem certeza que deseja apagar TODOS os produtos?", async (res) => {
        if (!res) return;

        const {
            error
        } = await supabase.from("produtos").delete().not("id", "is", null);
        if (error) {
            console.error(error);
            mostrarModal("Erro ao limpar produtos", "#e53935");
            return;
        }

        mostrarModal("Produtos removidos com sucesso!", "#4caf50");
        renderAdminGrid();
    });
}

function fecharModal() {
    const modal = document.getElementById("modalAviso");
    if (modal) modal.style.display = "none";
}

// =============================
// NORMALIZADOR DE NCE
// =============================
function normalizarNCE(valor) {
    if (!valor) return null;
    const numeros = String(valor).match(/\d+/g);
    if (!numeros) return null;
    return numeros[numeros.length - 1].replace(/^0+/, "");
}

// =============================
// CONTROLE PAGINA
// =============================
let page = "home";

async function setPage(p) {
    if (p === "admin" && !(await isAdminLogado())) {
        page = "login";
    } else {
        page = p;
    }
    render();
}

// =============================
// AUTH ADMIN
// =============================
async function loginAdmin(email, senha) {
    const {
        error
    } = await supabase.auth.signInWithPassword({
            email, password: senha
        });
    if (error) return mostrarModal(error.message, "#e53935");
    setPage("admin");
}

async function logoutAdmin() {
    await supabase.auth.signOut();
    setPage("home");
}

async function isAdminLogado() {
    const {
        data
    } = await supabase.auth.getSession();
    return !!data.session;
}

// =============================
// DINHEIRO BR
// =============================
function dinheiroBR(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
        style: "currency", currency: "BRL"
    });
}

// =============================
// BUSCAR PRODUTOS OTIMIZADO (COM CACHE)
// =============================
async function getProdutosBanco(force = false) {

    // usa cache se existir
    if (cacheProdutos && !force) return cacheProdutos;

    const {
        data: produtos,
        error
    } = await supabase
    .from("produtos")
    .select("*")
    .order("descricao", {
        ascending: true
    });

    if (error) {
        console.log(error);
        return [];
    }

    const {
        data: imagens
    } = await supabase
    .from("produto_imagens")
    .select("produto_id,nce,url,id");

    // MAPA DE IMAGENS (muito mais rápido que filter)
    const mapa = {};

    for (const img of imagens || []) {
        const chave = img.produto_id || normalizarNCE(img.nce);

        if (!mapa[chave]) mapa[chave] = [];
        mapa[chave].push(img);
    }

    for (const p of produtos) {
        const chave = normalizarNCE(p.nce);
        p.produto_imagens = mapa[p.id] || mapa[chave] || [];
    }

    cacheProdutos = produtos;

    return produtos;
}


// =============================
// SALVAR PRODUTOS
// =============================
async function salvarProdutosBanco(produtos) {
    if (!produtos.length) return;

    const dados = produtos.map(p => ({
        nce: normalizarNCE(p.nce),
        descricao: p.descricao?.trim() || "",
        saldo: Number(p.saldo) || 0,
        preco: Number(p.preco) || 0
    })).filter(p => p.nce);

    const tamanhoLote = 500;

    for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);
        const {
            error
        } = await supabase.from("produtos").insert(lote);
        if (error) {
            console.error(error); mostrarModal("Erro ao salvar produtos — veja console", "#e53935"); return;
        }
    }

    mostrarModal("Importação finalizada!", "#4caf50");
}

// =============================
// PARSER TXT
// =============================
function parseTxt(text) {
    const linhas = text.split(/\r?\n/);
    const produtos = [];

    linhas.forEach(linha => {
        const clean = linha.trim();
        if (!clean.startsWith("*")) return;

        const conteudo = clean.replace(/^\*/, "").trim();
        const partes = conteudo.split(/\s+/);

        if (partes.length < 5) return;

        // =============================
        // PROCURA O PRIMEIRO NÚMERO GRANDE (>=5 dígitos)
        // =============================
        let nce = null;
        let indexNCE = -1;

        for (let i = 0; i < partes.length; i++) {
            if (/^\d{5,}$/.test(partes[i])) {
                nce = normalizarNCE(partes[i]);
                indexNCE = i;
                break;
            }
        }

        if (!nce) return;

        // =============================
        // SALDO E PREÇO NO FINAL
        // =============================
        const precoRaw = partes[partes.length - 1];
        const saldoRaw = partes[partes.length - 3];

        const preco = parseFloat((precoRaw || "").replace(",", "."));
        const saldo = parseFloat((saldoRaw || "").replace(",", "."));

        // =============================
        // DESCRIÇÃO = depois do NCE até o saldo
        // =============================
        const descricao = partes.slice(indexNCE + 1, partes.length - 3).join(" ").trim();

        console.log("NCE CERTO =>", nce);

        produtos.push({
            nce,
            descricao,
            saldo: isNaN(saldo) ? 0: saldo,
            preco: isNaN(preco) ? 0: preco
        });
    });

    return produtos;
}

// =============================
// ATUALIZAR BASE
// =============================
async function atualizarBase() {
    cacheProdutos = null; // limpa cache

    document.getElementById("duplicadosView").innerHTML = "";
    await renderAdminGrid();

    mostrarModal("Base atualizada!",
        "#4caf50");
}

// =============================
// UPLOAD IMAGEM
// =============================
async function uploadImagemProduto(produtoId, input) {
    const files = input.files;
    if (!files || !files.length) return;

    if (!produtoId) {
        mostrarModal("Produto inválido!", "#e53935");
        return;
    }

    showLoading("Enviando imagem(s)...");

    try {
        // 🔎 Busca NCE do produto
        const { data: produto, error: produtoError } = await supabase
            .from("produtos")
            .select("id,nce")
            .eq("id", produtoId)
            .single();

        if (produtoError || !produto) {
            console.error(produtoError);
            hideLoading();
            mostrarModal("Produto não encontrado!", "#e53935");
            return;
        }

        for (const file of files) {

            const nomeArquivo = `${produtoId}_${Date.now()}_${file.name}`;

            // 🔼 Upload
            const { error: uploadError } = await supabase
                .storage
                .from("produtos")
                .upload(nomeArquivo, file);

            if (uploadError) {
                console.error(uploadError);
                continue; // continua para próxima imagem
            }

            // 🔗 URL pública
            const { data } = supabase
                .storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);

            const url = data?.publicUrl;

            if (!url) {
                console.error("URL inválida");
                continue;
            }

            // 🚫 DUPLICIDADE (opcional mas recomendado)
            const { data: jaExiste } = await supabase
                .from("produto_imagens")
                .select("id")
                .eq("url", url)
                .maybeSingle();

            if (jaExiste) continue;

            // 💾 INSERT SEGURO
            const { error: insertError } = await supabase
                .from("produto_imagens")
                .insert({
                    produto_id: produto.id,   // 🔥 FORÇA ID CORRETO
                    nce: produto.nce,
                    url: url
                });

            if (insertError) {
                console.error(insertError);
                continue;
            }
        }

        mostrarModal("Imagem(s) enviada(s)!", "#4caf50");

    } catch (err) {
        console.error(err);
        mostrarModal("Erro inesperado no upload", "#e53935");
    }

    hideLoading();
    cacheProdutos = null;
    await renderAdminGrid();
}




// =============================
// DELETAR IMAGEM
// =============================
async function deletarImagem(id, produtoId) {
    if (!confirm("Excluir imagem?")) return;

    await supabase.from("produto_imagens").delete().eq("id", id);

    mostrarModal("Imagem removida!", "#e53935");

    cacheProdutos = null;
    await renderAdminGrid();
  
}

// =============================
// CARROSSEL GLOBAL
// =============================
const carouselIndex = {};
function nextImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]+1) % lista.length;
    const el = document.getElementById("img-"+produtoId); if (el) el.src = lista[carouselIndex[produtoId]].url;
}
function prevImg(produtoId) {
    const lista = window.carouselData[produtoId]; if (!lista?.length) return;
    if (carouselIndex[produtoId] == null) carouselIndex[produtoId] = 0;
    carouselIndex[produtoId] = (carouselIndex[produtoId]-1+lista.length)%lista.length;
    const el = document.getElementById("img-"+produtoId); if (el) el.src = lista[carouselIndex[produtoId]].url;
}

// =============================
// RENDER CARROSSEL
// =============================
function renderCarousel(imagens, produto) {

    if (!window.carouselData) window.carouselData = {};
    window.carouselData[produto.id] = {
        imagens: imagens || [],
        produto: produto
    };

    if (!imagens || !imagens.length) return `
    <div class="carousel" style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;color:#999;margin-bottom:10px;">
        Sem imagem
    </div>
    `;

    return `
    <div class="carousel" style="display:flex;align-items:center;justify-content:center;">
        <button onclick="prevImg('${produto.id}')">◀</button>
        <img id="img-${produto.id}" 
             src="${imagens[0].url}" 
             onclick="openZoom('${produto.id}')" 
             style="width:150px;height:150px;object-fit:cover;margin:0 10px;cursor:pointer;">
        <button onclick="nextImg('${produto.id}')">▶</button>
    </div>
    `;
}


// =============================
// ZOOM COM CARROSSEL (FIX UI)
// + BOTÃO WHATSAPP
// =============================
function openZoom(produtoId, index = 0) {

    const data = (window.carouselData || {})[produtoId];
    if (!data || !data.imagens.length) return;

    const imagens = data.imagens;
    const produto = data.produto;

    let atual = index;

    const modal = document.createElement("div");
    modal.style = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.95);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:99999;
    font-family:sans-serif;
    `;

    modal.innerHTML = `
    <button id="zoomClose" style="
    position:absolute;
    top:60px;
    right:50px;
    background:rgba(143, 143, 143, 0.55);
    color:#fff;
    border:2px solid #fff;
    width:100px;
    height:100px;
    border-radius:20px;
    font-size:25px;
    cursor:pointer;
    z-index:100000;
    ">X</button>

    <button id="zoomPrev" style="
    display:flex;
    align-items:center;
    justify-content:center;
    position:absolute;
    left:20px;
    top:50%;
    transform:translateY(-50%);
    font-size:45px;
    background:rgba(143, 143, 143, 0.97);
    color:black;
    border:none;
    width:70px;
    height:70px;
    border-radius:8px;
    cursor:pointer;
    z-index:100000;
    ">◀</button>

    <img id="zoomImg" src="${imagens[atual].url}"
    style="
    max-width:60%;
    max-height:60%;
    border-radius:25px;
    object-fit:contain;
    z-index:-1;
    ">

    <button id="zoomNext" style="
    display:flex;
    align-items:center;
    justify-content:center;
    position:absolute;
    right:20px;
    top:50%;
    transform:translateY(-50%);
    font-size:45px;
    background:rgba(143, 143, 143, 0.97);
    color:black;
    border:none;
    width:70px;
    height:70px;
    border-radius:8px;
    cursor:pointer;
    z-index:100000;
    ">▶</button>

    <!-- BOTÃO WHATSAPP -->
    <button id="zoomShare" style="
    position:absolute;
    bottom:40px;
    background:#25D366;
    color:#fff;
    border:none;
    padding:15px 30px;
    border-radius:40px;
    font-size:18px;
    font-weight:bold;
    cursor:pointer;
    box-shadow:0 5px 15px rgba(0,0,0,0.5);
    z-index:100000;
    ">
    🟢 Compartilhar Produto
    </button>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#zoomClose").onclick = () => modal.remove();

    modal.querySelector("#zoomNext").onclick = () => {
        atual = (atual + 1) % imagens.length;
        modal.querySelector("#zoomImg").src = imagens[atual].url;
    };

    modal.querySelector("#zoomPrev").onclick = () => {
        atual = (atual - 1 + imagens.length) % imagens.length;
        modal.querySelector("#zoomImg").src = imagens[atual].url;
    };

    // WHATSAPP
    modal.querySelector("#zoomShare").onclick = () => {

        const fotos = imagens.map(img => img.url).join("\n");

        const mensagem =
`🛍️ *${produto.descricao}*

💰 *Preço:* ${dinheiroBR(produto.preco)}

📷 *Fotos:*
${fotos}

📲 Gostaria de comprar!`;

        const link = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
        window.open(link, "_blank");
    };
}            
    
// =============================
// DEBOUNCE (EVITA TRAVAMENTOS)
// =============================
function debounce(fn, delay = 300) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// =============================
// VIEWS
// =============================
function renderLogin() {
    return `
    <div class="container" style="max-width:400px">
    <h2>Login Admin</h2>
    <input class="input" id="emailAdmin" placeholder="Email"><br><br>
    <input class="input" id="senhaAdmin" type="password" placeholder="Senha"><br><br>
    <button onclick="loginAdmin(document.getElementById('emailAdmin').value,document.getElementById('senhaAdmin').value)">Entrar</button>
    </div>
    `;
}

function renderHome() {
    return `
    <div class="container">
    <h2>Catálago AUG</h2>
    <div id="totalCatalogo"></div>
    <div class="box-input" style="padding: 1rem 0;">
    <input class="input" placeholder="Buscar por NCE ou DESCRIÇÃO" id="filtro" style="
    width: 300px;

    ">
    </div id="box-catalago">
    <div class="grid" id="catalogGrid"></div>
    </div>
    `;
}

function renderAdmin() {
    return `
    <div class="container">
    <div id="box-config">
    <button onclick="logoutAdmin()" style="font-weight:bold;">Sair</button>
    <button onclick="atualizarBase()" style="background:#2196f3;font-weight:bold;color:#ffff;">Atualizar Base</button>
    <h2>Admin produtos</h2>
    <div id="totalAdmin"></div>
    <input type="file" id="txtUpload">
    <input class="input" placeholder="Buscar por NCE ou DESCRIÇÃO" id="filtro" style="width:300px;">
    <div id="importInfo"></div>
    <div id="duplicadosView"></div>
    <div style="padding:1rem 0;">
    <button onclick="limparProdutosBanco()" style="background:#e53935; color:#ffff; font-weight:bold;">Limpar Produtos</button>
    </div>
    </div>
    <div class="grid" id="adminGrid"></div>
    </div>
    `;
}

// =============================
// RENDER PRINCIPAL
// =============================
async function render() {
    const app = document.getElementById("app");
    if (page === "login") {
        app.innerHTML = renderLogin();
    } else if (page === "admin") {
        app.innerHTML = renderAdmin(); setupAdmin();
    } else {
        app.innerHTML = renderHome(); setupCatalogo();
    }
}

// =============================
// ADMIN
// =============================
function setupAdmin() {
    const upload = document.getElementById("txtUpload");
    const filtro = document.getElementById("filtro");

    upload.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
    showLoading("Importando arquivo...");

    try {
        const novos = parseTxt(reader.result);

        await salvarProdutosBanco(novos);

        cacheProdutos = null;

        mostrarModal("Importação concluída!", "#4caf50");

        setTimeout(() => {
            window.location.reload(); // 🔥 atualização real
        }, 300);

    } catch (e) {
        console.error(e);
        mostrarModal("Erro durante importação.", "#e53935");
    }
};
        reader.readAsText(file);
    };

    filtro.oninput = debounce(renderAdminGrid, 300);
    renderAdminGrid();
}

async function renderAdminGrid() {
    showLoading("Carregando produtos...");

    const filtro = document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if (filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalAdmin").innerHTML = `Total produtos: ${produtos.length}`;

    document.getElementById("adminGrid").innerHTML = produtos.map(p => `
        <div class="card">
        <b>${p.descricao}</b>
        <div class="small">NCE ${p.nce} | Saldo ${p.saldo} | ${dinheiroBR(p.preco)}</div><br>
        <input type="file" multiple onchange="uploadImagemProduto('${p.id}', this)">
        <div style="margin-top:10px;">
        ${(p.produto_imagens || []).map(img => `
            <div style="display:inline-block;margin:5px;text-align:center;">
            <img loading="lazy" src="${img.url}" style="width:70px;height:70px;object-fit:cover;display:block;">
            <button style="background:#e53935;font-size:10px;padding:4px;" onclick="deletarImagem('${img.id}','${p.id}')">Excluir</button>
            </div>
            `).join("")}
        </div>
        <div class="small">${(p.produto_imagens || []).length} imagens</div>
        </div>
        `).join("");

    hideLoading();
}

// =============================
// CATALOGO
// =============================
function setupCatalogo() {
    document.getElementById("filtro").oninput = debounce(renderCatalogGrid, 300);
    renderCatalogGrid();
}


async function renderCatalogGrid() {
    showLoading("Carregando catálogo...");

    const filtro = document.getElementById("filtro").value.toLowerCase();
    let produtos = await getProdutosBanco();
    if (filtro) produtos = produtos.filter(p => (p.descricao+" "+p.nce).toLowerCase().includes(filtro));

    document.getElementById("totalCatalogo").innerHTML = `Total produtos: ${produtos.length}`;

    document.getElementById("catalogGrid").innerHTML = produtos.map(p => {
        const imagens = p.produto_imagens || [];
        return `<div class="card">${renderCarousel(imagens, p.id)}<b>${p.descricao}</b>
        <div class="small">NCE ${p.nce}<br>Saldo ${p.saldo}<br><b>${dinheiroBR(p.preco)}</b></div></div>`;
    }).join("");

    hideLoading();
}

// =============================
// LIMPAR PRODUTOS
// =============================
async function limparProdutosBanco() {
    mostrarConfirmacao("Tem certeza que deseja apagar TODOS os produtos?", async (res) => {
        if (!res) return;

        showLoading("Apagando produtos...");

        const {
            error
        } = await supabase
        .from("produtos")
        .delete()
        .not("id", "is", null);

        if (error) {
            console.error(error);
            mostrarModal("Erro ao limpar produtos", "#e53935");
            hideLoading();
            return;
        }

        mostrarModal("Produtos removidos com sucesso!", "#4caf50");

        setTimeout(() => {
            window.location.reload(); // 🔥 RECARREGA A PÁGINA
        }, 800);
    });
}


// =============================
// RELIGAR IMAGENS PELO NCE
// =============================
async function religarImagensPorNCE() {
    showLoading("Religando imagens...");

    const { data: produtos } = await supabase
        .from("produtos")
        .select("id,nce");

    const { data: imagens } = await supabase
        .from("produto_imagens")
        .select("id,nce,produto_id");

    if (!produtos || !imagens) {
        hideLoading();
        return;
    }

    // 🔎 Mapa NCE → produtoId
    const mapa = {};
    for (const p of produtos) {
        const chave = normalizarNCE(p.nce);
        if (!chave) continue;
        mapa[chave] = p.id; // um NCE = um produto
    }

    for (const img of imagens) {

        // só corrige se estiver null
        if (img.produto_id) continue;

        const chave = normalizarNCE(img.nce);
        if (!chave) continue;

        const novoId = mapa[chave];
        if (!novoId) continue;

        await supabase
            .from("produto_imagens")
            .update({ produto_id: novoId })
            .eq("id", img.id);
    }

    hideLoading();
    mostrarModal("Religação finalizada!", "#4caf50");

    cacheProdutos = null;
    await renderAdminGrid();
}

// =============================
// START
// =============================
setPage("home");
  
