import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Cria uma nova variável com os itens no carrinho
      const updateCart = [...cart];
      // Faz a verificação se o produto realmente existe no carrinho
      const productExists = updateCart.find(
        product => product.id === productId
      );

      // Pega os dados do produto no estoque
      const stock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      // Verifica a quantidade de produtos atual no carrinho
      const currentAmount = productExists ? productExists.amount : 0;
      // Quantidade desejada para ser adicionada ao carrinho
      const amount = currentAmount + 1;

      // Verifica se a quantidade desejada é maior do que há no estoque
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        // Atualizando a quantidade de produtos no carrinho
        productExists.amount = amount;
      } else {
        // Pega os dados do produto na api
        const product = await api.get<Product>(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        }

        // Adiciona o novo produto ao carrinho
        updateCart.push(newProduct);
      }

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Localizando o produto no carrinho
      const productExists = cart.some(
        product => product.id === productId
      );

      // Verificando se o produto existe
      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      // Removendo o produto do carrinho
      const updateCart = cart.filter(cartItem => cartItem.id !== productId);
      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // Verificando se a quantidade solicitada é igual ou menos que 0
      if (amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      // Pegando o produto no estoque
      const response = await api.get(`/stock/${productId}`)
      const productsAmount = response.data.amount;

      // Verificando se a quantidade solicitada é maior que a do estoque
      if (amount > productsAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productExists = cart.some(
        cartProduct => cartProduct.id === productId
      );

      if (!productExists) {
        toast.error('Erro na alteração de quantidade do produto')
      }

      // Alterando quantidade do produto
      const updatedCart = cart.map(cartItem => {
        return cartItem.id === productId ? {
          ...cartItem,
          amount: amount
        } : cartItem;
      });

      // Salvando nova quantidade
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
