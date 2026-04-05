import { useState } from 'react';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import './App.css';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

// --- INICIALIZE O MERCADO PAGO AQUI ---
initMercadoPago('APP_USR-c713c26a-d6e9-4d5e-944e-cbc429d4fe82', { locale: 'pt-BR' });

const produtos = [
  {
    id: 1,
    nome: "Vaso Terracota",
    preco: "120.00",
    imagem: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400&q=80",
    descricao: "Vaso artesanal com textura natural."
  },
  {
    id: 2,
    nome: "Caneca Rústica Azul",
    preco: "65.00",
    imagem: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80",
    descricao: "Caneca perfeita para o café da manhã."
  },
  {
    id: 3,
    nome: "Prato Decorativo",
    preco: "90.00",
    imagem: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=400&q=80",
    descricao: "Prato fundo com esmalte brilhante."
  }
];

function App() {
  const [carrinho, setCarrinho] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);
  
  // NOVA MEMÓRIA: Passos e Dados de Endereço
  const [passo, setPasso] = useState(1);
  const [cliente, setCliente] = useState({ 
    nome: '', whatsapp: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', uf: '' 
  });

  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
    setPreferenceId(null);
  };

  const removerDoCarrinho = (indexParaRemover) => {
    const novoCarrinho = carrinho.filter((_, index) => index !== indexParaRemover);
    setCarrinho(novoCarrinho);
    setPreferenceId(null);
    if (novoCarrinho.length === 0) {
      setIsModalOpen(false);
      setPasso(1); // Reseta o passo se esvaziar
    }
  };

  const calcularTotal = () => {
    let total = 0;
    carrinho.forEach(item => {
      total += parseFloat(item.preco);
    });
    return total.toFixed(2);
  };

  // BUSCA AUTOMÁTICA DE CEP (ViaCEP)
  const buscarCEP = async (cepDigitado) => {
    const cepLimpo = cepDigitado.replace(/\D/g, ''); 
    setCliente(prev => ({ ...prev, cep: cepDigitado })); 

    if (cepLimpo.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setCliente(prev => ({ 
            ...prev, 
            rua: data.logradouro, 
            bairro: data.bairro, 
            cidade: data.localidade, 
            uf: data.uf 
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar o CEP");
      }
    }
  };

  const handleBuy = async () => {
    const response = await fetch('http://localhost:3000/criar-preferencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: carrinho }),
    });
    const data = await response.json();
    setPreferenceId(data.id);
  };

  // FUNÇÃO QUE SALVA NO BANCO DE DADOS
  const salvarPedido = async () => {
    try {
      // 1. Salva no Firebase
      const docRef = await addDoc(collection(db, "pedidos"), {
        dadosCliente: cliente,
        itensComprados: carrinho,
        valorTotal: calcularTotal(),
        dataDoPedido: new Date().toISOString(),
        status: "Aguardando Pagamento"
      });
      console.log("Pedido salvo com sucesso! ID: ", docRef.id);
      
      // 2. Avança para a tela do Mercado Pago
      setPasso(3);
      handleBuy(); 

    } catch (error) {
      console.error("Erro ao salvar pedido no Firebase: ", error);
      alert("Houve um erro ao processar seu pedido. Tente novamente.");
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{passo === 1 ? "Seu Carrinho" : passo === 2 ? "Dados de Entrega" : "Pagamento Seguro"}</h2>
              <button className="close-btn" onClick={() => { setIsModalOpen(false); setPasso(1); }}>✖</button>
            </div>
            
            {/* --- PASSO 1: CARRINHO --- */}
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

{/* --- PASSO 2: DADOS DE ENTREGA --- */}
            {passo === 2 && (
              <>
                <div className="checkout-form">
                  <p className="security-badge">🔒 Seus dados estão criptografados e seguros.</p>
                  <input 
                    type="text" placeholder="Nome Completo" value={cliente.nome}
                    onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                  />
                  <input 
                    type="text" placeholder="WhatsApp (Ex: 11 99999-9999)" value={cliente.whatsapp}
                    onChange={(e) => setCliente({ ...cliente, whatsapp: e.target.value })}
                  />
                  
                  <h4 className="form-subtitle">Endereço de Envio</h4>
                  <div className="address-grid">
                    <input 
                      type="text" placeholder="CEP" value={cliente.cep} maxLength="9"
                      onChange={(e) => buscarCEP(e.target.value)}
                    />
                    <input 
                      type="text" placeholder="Rua" value={cliente.rua}
                      onChange={(e) => setCliente({ ...cliente, rua: e.target.value })}
                    />
                    <input 
                      type="text" placeholder="Número" value={cliente.numero}
                      onChange={(e) => setCliente({ ...cliente, numero: e.target.value })}
                    />
                    <input 
                      type="text" placeholder="Bairro" value={cliente.bairro}
                      onChange={(e) => setCliente({ ...cliente, bairro: e.target.value })}
                    />
                    <input 
                      type="text" placeholder="Cidade / UF" value={`${cliente.cidade} ${cliente.uf ? '- ' + cliente.uf : ''}`} disabled
                    />
                  </div>
                </div>

                {/* Agora o footer está do lado de fora do checkout-form! */}
                <div className="modal-footer">
                  <button className="back-btn" onClick={() => setPasso(1)}>⬅ Voltar</button>
                  <button className="pay-btn" onClick={() => {
                    if (!cliente.nome || !cliente.cep || !cliente.numero) {
                      alert("Preencha os campos obrigatórios (Nome, CEP e Número) para entrega!");
                      return;
                    }
                  salvarPedido(); 
                  }}>Ir para Pagamento ➔</button>
                </div>
              </>
            )}

            {/* --- PASSO 3: PAGAMENTO --- */}
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

      <main className="main-content" id="galeria">
        <h2>Nossas Peças</h2>
        <p className="subtitle">Feitas à mão, com tempo e carinho.</p>
        
        <div className="product-grid">
          {produtos.map((produto) => (
            <div key={produto.id} className="product-card">
              <img src={produto.imagem} alt={produto.nome} />
              <div className="product-info">
                <h3>{produto.nome}</h3>
                <p className="desc">{produto.descricao}</p>
                <p className="price">R$ {produto.preco.replace('.', ',')}</p>
                <button className="buy-btn" onClick={() => adicionarAoCarrinho(produto)}>
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="footer" id="contato">
        <p>© 2026 Opuria Cerâmicas.</p>
      </footer>
    </div>
  );
}

export default App;