import { useState, useEffect } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import './App.css';
import { db } from './firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// --- INICIALIZAÇÃO ---
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

  // --- 1. BUSCAR PRODUTOS DO FIREBASE ---
  useEffect(() => {
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
            ...prev,
            rua: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
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
      // Salva no banco primeiro
      const pedidoRef = await addDoc(collection(db, "pedidos"), {
        cliente,
        itens: carrinho,
        total: calcularTotal(),
        data: new Date().toISOString(),
        status: "Pendente"
      });

      setPasso(3); // Vai para tela de pagamento

      // Chama seu servidor na Render
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

  return (
    <div className="container">
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="Opuria" className="logo-img" />
          <h1>Opuria Cerâmicas</h1>
        </div>
      </header>

      {/* VITRINE DINÂMICA */}
      <main className="main-content">
        <h2>Nossas Peças</h2>
        {carregando ? (
          <p>Carregando peças artesanais...</p>
        ) : (
          <div className="product-grid">
            {produtos.map((p) => (
              <div key={p.id} className="product-card">
                <img src={p.imagem} alt={p.nome} />
                <div className="product-info">
                  <h3>{p.nome}</h3>
                  <p className="price">R$ {p.preco.replace('.', ',')}</p>
                  <button className="buy-btn" onClick={() => adicionarAoCarrinho(p)}>
                    Adicionar
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
          <span>🛒 {carrinho.length} item(s) - R$ {calcularTotal().replace('.', ',')}</span>
          <button className="checkout-btn" onClick={() => setIsModalOpen(true)}>Finalizar</button>
        </div>
      )}

      {/* MODAL DE CHECKOUT 3 PASSOS */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>✖</button>
            
            {passo === 1 && (
              <div className="step">
                <h3>Seu Carrinho</h3>
                {carrinho.map((item, i) => (
                  <div key={i} className="cart-item-row">
                    <span>{item.nome}</span>
                    <button onClick={() => removerDoCarrinho(i)}>remover</button>
                  </div>
                ))}
                <button className="pay-btn" onClick={() => setPasso(2)}>Próximo: Entrega</button>
              </div>
            )}

            {passo === 2 && (
              <div className="step checkout-form">
                <h3>Entrega</h3>
                <input placeholder="Nome" onChange={e => setCliente({...cliente, nome: e.target.value})} />
                <input placeholder="CEP" maxLength="9" onChange={e => buscarCEP(e.target.value)} />
                <input placeholder="Rua" value={cliente.rua} readOnly />
                <input placeholder="Número" onChange={e => setCliente({...cliente, numero: e.target.value})} />
                <button className="pay-btn" onClick={finalizarPedido}>Ir para Pagamento</button>
              </div>
            )}

            {passo === 3 && (
              <div className="step">
                <h3>Pagamento</h3>
                {preferenceId ? (
                  <Wallet initialization={{ preferenceId }} />
                ) : (
                  <p>Gerando PIX/Cartão...</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;