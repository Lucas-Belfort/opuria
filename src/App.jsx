import { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import './App.css';
import { db } from './firebase'; 
import { collection, addDoc, getDocs } from 'firebase/firestore';

// --- INICIALIZAÇÃO DO MERCADO PAGO ---
initMercadoPago('APP_USR-c713c26a-d6e9-4d5e-944e-cbc429d4fe82', { locale: 'pt-BR' });

function App() {
  // Estados da Loja
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carrinho, setCarrinho] = useState([]);
  
  // Estados do Modal e Checkout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passo, setPasso] = useState(1);
  const [preferenceId, setPreferenceId] = useState(null);
  
  // Dados do Cliente
  const [cliente, setCliente] = useState({ 
    nome: '', whatsapp: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', uf: '' 
  });

  // --- ESTADOS DO PAINEL DA JÚLIA (100% GRATUITO) ---
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: '', preco: '', descricao: '', imagemUrl: '' });
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  // --- 1. BUSCAR PRODUTOS DO FIREBASE ---
  const carregarLoja = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "produtos"));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(lista);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarLoja();
  }, []);

  // --- 2. LÓGICA DO CARRINHO ---
  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
    setPreferenceId(null);
  };

  const removerDoCarrinho = (indexParaRemover) => {
    const novo = carrinho.filter((_, i) => i !== indexParaRemover);
    setCarrinho(novo);
    if (novo.length === 0) setIsModalOpen(false);
  };

  const calcularTotal = () => {
    return carrinho.reduce((acc, item) => acc + parseFloat(item.preco), 0).toFixed(2);
  };

  // --- 3. INTEGRAÇÃO VIACEP ---
  const buscarCEP = async (valor) => {
    const cep = valor.replace(/\D/g, '');
    setCliente({ ...cliente, cep: valor });

    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCliente(prev => ({
            ...prev, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf
          }));
        }
      } catch (err) {
        console.error("Erro no CEP");
      }
    }
  };

  // --- 4. PAGAMENTO E FIREBASE ---
  const finalizarPedido = async () => {
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente, itens: carrinho, total: calcularTotal(), data: new Date().toISOString(), status: "Pendente"
      });
      setPasso(3); 
      const res = await fetch('https://opuria-backend-x8z9.onrender.com/criar-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: carrinho }),
      });
      const data = await res.json();
      setPreferenceId(data.id);
    } catch (err) {
      alert("Erro ao processar pedido. Tente novamente.");
    }
  };

  // --- 5. FUNÇÃO DA JÚLIA: SALVAR NOVO PRODUTO VIA LINK ---
  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    if (!novoProduto.imagemUrl || !novoProduto.nome || !novoProduto.preco) {
      alert("Preencha todos os campos e cole o link da foto!");
      return;
    }
    setSalvandoProduto(true);

    try {
      // Salva direto no banco usando o link colado
      await addDoc(collection(db, "produtos"), {
        nome: novoProduto.nome,
        preco: novoProduto.preco.replace(',', '.'), 
        descricao: novoProduto.descricao,
        imagem: novoProduto.imagemUrl
      });

      alert("Produto cadastrado com sucesso na Vitrine!");
      setIsAdminOpen(false); 
      setNovoProduto({ nome: '', preco: '', descricao: '', imagemUrl: '' }); 
      carregarLoja(); 
      
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      alert("Erro ao subir o produto. Tente novamente.");
    } finally {
      setSalvandoProduto(false);
    }
  };

  return (
    <div className="container">
      <header className="header" id="home">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo Opuria" className="logo-img" />
          <h1>Opuria Cerâmicas</h1>
        </div>
        <nav>
          <ul>
            <li><a href="#home">Início</a></li>
            <li><a href="#sobre">Sobre Nós</a></li>
            <li><a href="#galeria">Galeria</a></li>
          </ul>
        </nav>
      </header>

      {/* --- BANNER CAROUSEL --- */}
      <section className="banner-carousel">
        <div className="slide-container">
          <div className="slide slide-1">
            <img src="/b1.jpeg" alt="Vaso artesanal Opuria" />
            <div className="slide-text">
              <h2>Textura Única</h2>
              <p>Peças moldadas com carinho e alma.</p>
            </div>
          </div>
          <div className="slide slide-2">
            <img src="/fpt.png" alt="Conjunto de cerâmica na mesa" />
            <div className="slide-text">
              <h2>PROMOÇÃO DE COLECIONADOR DIA DAS BRUXAS </h2>
              <p>HAHAHAHAHAHAHAHAHA</p>
            </div>
          </div>
          <div className="slide slide-3">
            <img src="/b2.jpeg" alt="Processo de queima artesanal" />
            <div className="slide-text">
              <h2>Coleção de gay lgbt</h2>
              <p>opuria é tudo todo e todes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VITRINE DINÂMICA */}
      <main className="main-content" id="galeria">
        <h2>Nossas Peças</h2>
        <p className="subtitle">Feitas à mão, com tempo e carinho.</p>
        
        {carregando ? (
          <p className="loading-text">Carregando peças artesanais...</p>
        ) : (
          <div className="product-grid">
            {produtos.map((p) => (
              <div key={p.id} className="product-card">
                <img src={p.imagem} alt={p.nome} />
                <div className="product-info">
                  <h3>{p.nome}</h3>
                  <p className="desc">{p.descricao}</p>
                  <p className="price">R$ {p.preco.replace('.', ',')}</p>
                  <button className="buy-btn" onClick={() => adicionarAoCarrinho(p)}>
                    Adicionar ao Carrinho
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BARRA DO CARRINHO */}
      {carrinho.length > 0 && (
        <div className="cart-bar">
          <div className="cart-info">
            <span>🛒 {carrinho.length} item(s) no carrinho</span>
            <span className="cart-total">Total: R$ {calcularTotal().replace('.', ',')}</span>
          </div>
          <button className="checkout-btn" onClick={() => setIsModalOpen(true)}>
            Ver Pedido
          </button>
        </div>
      )}

      {/* MODAL DE CHECKOUT */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
             <div className="modal-header">
              <h2>{passo === 1 ? "Seu Carrinho" : passo === 2 ? "Dados de Entrega" : "Pagamento Seguro"}</h2>
              <button className="close-btn" onClick={() => { setIsModalOpen(false); setPasso(1); }}>✖</button>
            </div>
            
            {passo === 1 && (
              <>
                <ul className="cart-items-list">
                  {carrinho.map((item, index) => (
                    <li key={index} className="cart-item">
                      <img src={item.imagem} alt={item.nome} className="cart-item-img" />
                      <div className="cart-item-info">
                        <h4>{item.nome}</h4>
                        <p>R$ {item.preco.replace('.', ',')}</p>
                      </div>
                      <button className="remove-btn" onClick={() => removerDoCarrinho(index)}>Remover</button>
                    </li>
                  ))}
                </ul>
                <div className="modal-footer">
                  <h3>Total: R$ {calcularTotal().replace('.', ',')}</h3>
                  <button className="pay-btn" onClick={() => setPasso(2)}>Continuar para Entrega ➔</button>
                </div>
              </>
            )}

            {passo === 2 && (
              <>
                <div className="checkout-form">
                  <p className="security-badge">🔒 Seus dados estão criptografados e seguros.</p>
                  <input type="text" placeholder="Nome Completo" value={cliente.nome} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} />
                  <input type="text" placeholder="WhatsApp (Ex: 11 99999-9999)" value={cliente.whatsapp} onChange={(e) => setCliente({ ...cliente, whatsapp: e.target.value })} />
                  <h4 className="form-subtitle">Endereço de Envio</h4>
                  <div className="address-grid">
                    <input type="text" placeholder="CEP" value={cliente.cep} maxLength="9" onChange={(e) => buscarCEP(e.target.value)} />
                    <input type="text" placeholder="Rua" value={cliente.rua} onChange={(e) => setCliente({ ...cliente, rua: e.target.value })} />
                    <input type="text" placeholder="Número" value={cliente.numero} onChange={(e) => setCliente({ ...cliente, numero: e.target.value })} />
                    <input type="text" placeholder="Bairro" value={cliente.bairro} onChange={(e) => setCliente({ ...cliente, bairro: e.target.value })} />
                    <input type="text" placeholder="Cidade / UF" value={`${cliente.cidade} ${cliente.uf ? '- ' + cliente.uf : ''}`} disabled />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="back-btn" onClick={() => setPasso(1)}>⬅ Voltar</button>
                  <button className="pay-btn" onClick={() => {
                    if (!cliente.nome || !cliente.cep || !cliente.numero) {
                      alert("Preencha os campos obrigatórios!");
                      return;
                    }
                    finalizarPedido(); 
                  }}>Ir para Pagamento ➔</button>
                </div>
              </>
            )}

            {passo === 3 && (
              <div className="payment-step">
                <p className="payment-resume">Valor a pagar: <strong>R$ {calcularTotal().replace('.', ',')}</strong></p>
                <div className="modal-footer">
                  <button className="back-btn" onClick={() => setPasso(2)}>⬅ Voltar aos Dados</button>
                  {preferenceId ? (
                    <Wallet initialization={{ preferenceId: preferenceId }} customization={{ texts:{ valueProp: 'smart_option'}}} />
                  ) : (
                    <p className="loading-text">Carregando ambiente seguro do Mercado Pago...</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PAINEL ADMINISTRATIVO DA JÚLIA --- */}
      {isAdminOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ border: '3px solid #b76e79' }}>
            <div className="modal-header">
              <h2>✏️ Adicionar à Vitrine</h2>
              <button className="close-btn" onClick={() => setIsAdminOpen(false)}>✖</button>
            </div>
            <form className="checkout-form" onSubmit={handleSalvarProduto}>
              <p style={{textAlign: 'center', marginBottom: '15px', fontSize: '14px'}}>
                1. Suba a foto no <strong>postimages.org</strong><br/>2. Copie o "Link Direto"<br/>3. Cole abaixo.
              </p>
              
              <input 
                type="text" placeholder="Cole o Link Direto da Foto aqui..." 
                value={novoProduto.imagemUrl} onChange={(e) => setNovoProduto({...novoProduto, imagemUrl: e.target.value})} 
                style={{ border: '2px solid #b76e79', backgroundColor: '#fff9fa' }}
              />
              <input 
                type="text" placeholder="Nome da Peça (ex: Vaso Lua)" 
                value={novoProduto.nome} onChange={(e) => setNovoProduto({...novoProduto, nome: e.target.value})} 
              />
              <input 
                type="number" step="0.01" placeholder="Preço (ex: 150.00)" 
                value={novoProduto.preco} onChange={(e) => setNovoProduto({...novoProduto, preco: e.target.value})} 
              />
              <input 
                type="text" placeholder="Breve Descrição" 
                value={novoProduto.descricao} onChange={(e) => setNovoProduto({...novoProduto, descricao: e.target.value})} 
              />
              <button type="submit" className="pay-btn" disabled={salvandoProduto} style={{ width: '100%', marginTop: '15px' }}>
                {salvandoProduto ? "Salvando..." : "Salvar Produto na Loja ➔"}
              </button>
            </form>
          </div>
        </div>
      )}

      <section className="about-section" id="sobre">
        <div className="about-content">
          <div className="about-image">
            <img src="/quemsomos.jpeg" alt="Nossa oficina" />
          </div>
          <div className="about-text">
            <h2>Quem Somos</h2>
            <p>
              Muito prazer sou a Julia, Dona e fundadora da opuria. Comecei a fazer cerâmica em 2019, durante a faculdade, e desde então nunca mais parei. O que começou como aprendizado logo se transformou em paixão — e hoje também é o meu trabalho. Nas minhas peças, busco expressar a forma como vejo o mundo: belo, místico e ritualístico. Cada objeto nasce das minhas mãos carregando intenção, sensibilidade e a singularidade do processo artesanal.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer" id="contato">
        <p>© 2026 Opuria Cerâmicas. 
          <button 
            onClick={() => setIsAdminOpen(true)} 
            style={{background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', marginLeft: '10px'}}
          >
            Área da Júlia
          </button>
        </p>
      </footer>
    </div>
  );
}

export default App;