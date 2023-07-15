// simulate getting products from DataBase
const products = [
  { id: 1, name: "Apples_:", country: "Italy", cost: 3, instock: 10 },
  { id: 2, name: "Oranges:", country: "Spain", cost: 4, instock: 3 },
  { id: 3, name: "Beans__:", country: "USA", cost: 2, instock: 5 },
  { id: 4, name: "Cabbage:", country: "USA", cost: 1, instock: 8 },
];

//=========Cart=============
const Cart = (props) => {
  const { Card, Accordion, Button } = ReactBootstrap;
  // Get the data from the props or use the default products array
  let data = props.location.data ? props.location.data : products;
  console.log(`data:${JSON.stringify(data)}`);

  return <Accordion defaultActiveKey="0">{list}</Accordion>;
};

// Custom hook for fetching data from an API
const useDataApi = (initialUrl, initialData) => {
  const { useState, useEffect, useReducer } = React;
  const [url, setUrl] = useState(initialUrl);

  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: initialData,
  });
  console.log(`useDataApi called`);

  useEffect(() => {
    console.log("useEffect Called");
    let didCancel = false;

    const fetchData = async () => {
      dispatch({ type: "FETCH_INIT" });
      try {
        const result = await axios(url);
        console.log("FETCH FROM URL");
        if (!didCancel) {
          dispatch({ type: "FETCH_SUCCESS", payload: result.data });
        }
      } catch (error) {
        if (!didCancel) {
          dispatch({ type: "FETCH_FAILURE" });
        }
      }
    };

    fetchData();

    return () => {
      didCancel = true;
    };
  }, [url]);

  return [state, setUrl];
};

// Reducer for managing the state of data fetching
const dataFetchReducer = (state, action) => {
  switch (action.type) {
    case "FETCH_INIT":
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case "FETCH_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload,
      };
    case "FETCH_FAILURE":
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      throw new Error();
  }
};

// Component for displaying products and managing the cart
const Products = (props) => {
  const [items, setItems] = React.useState(products); // State for storing the products
  const [cart, setCart] = React.useState([]); // State for storing the cart items
  const [total, setTotal] = React.useState(0); // State for storing the total cost of items in the cart

  const {
    Card,
    Accordion,
    Button,
    Container,
    Row,
    Col,
    Image,
    Input,
  } = ReactBootstrap;

  const [query, setQuery] = React.useState(
    "http://localhost:1337/api/products"
  ); // State for storing the API query URL
  const [{ data, isLoading, isError }, doFetch] = useDataApi(
    "http://localhost:1337/api/products",
    { data: [] }
  ); // Custom hook for fetching data from the API

  console.log(`Rendering Products ${JSON.stringify(data)}`);

  // Function to add an item to the cart
  const addToCart = (e) => {
    let name = e.target.name;
    let item = items.find((item) => item.name === name);

    // Check if the item already exists in the cart
    let existingItem = cart.find((cartItem) => cartItem.name === item.name);

    if (existingItem) {
      // Check if the maximum quantity has been reached
      if (existingItem.quantity < existingItem.instock) {
        // Increase the quantity of the existing item
        let updatedCart = cart.map((cartItem) => {
          if (cartItem.name === existingItem.name) {
            return { ...cartItem, quantity: cartItem.quantity + 1 };
          }
          return cartItem;
        });

        setCart(updatedCart);
      } else {
        console.log("Keine weiteren Produkte verfügbar");
      }
    } else {
      // Check if the item is in stock
      if (item.instock > 0) {
        // Add the item to the cart with quantity 1
        let newItem = { ...item, quantity: 1 };
        setCart([...cart, newItem]);
      } else {
        console.log("Keine weiteren Produkte verfügbar");
      }
    }

    // Decrease the stock count of the added item
    setItems((prevItems) =>
      prevItems.map((prevItem) => {
        if (prevItem.name === name) {
          return { ...prevItem, instock: prevItem.instock - 1 };
        }
        return prevItem;
      })
    );
  };

  // Function to delete an item from the cart
  const deleteCartItem = (index) => {
    let updatedCart = [...cart];
    updatedCart[index].quantity -= 1;

    if (updatedCart[index].quantity === 0) {
      updatedCart.splice(index, 1);
    }

    setCart(updatedCart);

    // Increase the stock count of the deleted item
    setItems((prevItems) =>
      prevItems.map((prevItem) => {
        if (prevItem.name === cart[index].name) {
          return { ...prevItem, instock: prevItem.instock + 1 };
        }
        return prevItem;
      })
    );
  };

  const photos = ["apple.png", "orange.png", "beans.png", "cabbage.png"];

  // Generate the list of products
  let list = items.map((item, index) => (
    <li key={index}>
      <Image src={photos[index % 4]} width={70} roundedCircle />
      <Button variant="primary" size="large">
        {item.name}:{item.cost}
      </Button>
      <input name={item.name} type="submit" onClick={addToCart} disabled={item.instock === 0} />
    </li>
  ));

  // Generate the list of cart items
  let cartList = cart.map((item, index) => (
    <Accordion.Item key={1 + index} eventkey={1 + index}>
      <Accordion.Header>{item.quantity}x {item.name}</Accordion.Header>
      <Accordion.Body eventkey={1 + index}>
        <div>$ {item.cost} from {item.country}</div>
        <Button variant="danger" onClick={() => deleteCartItem(index)}>Delete</Button>
      </Accordion.Body>
    </Accordion.Item>
  ));

  // Function to handle the checkout process
  const checkOut = () => {
    let costs = cart.map((item) => item.cost * item.quantity);
    const reducer = (accum, current) => accum + current;
    let newTotal = costs.reduce(reducer, 0);
    console.log(`total updated to ${newTotal}`);
    
    if (newTotal > 0) {
      setCart([]); // delete all products
    }
    
    return newTotal;
  };

  // Function to restock products from the API
  const restockProducts = async (url) => {
    try {
      const response = await axios.get(url);
      const updatedProducts = response.data.data.map((item) => {
        const { id, name, country, cost, instock } = item.attributes;
        return { id, name, country, cost, instock };
      });
      setItems([...items, ...updatedProducts]);
    } catch (error) {
      console.error('Error restocking products:', error);
    }
  };

  // Helper function to render the final list
  const renderFinalList = () => {
    let total = checkOut();
    let final = cart.map((item, index) => (
      <div key={index} index={index}>
        {item.quantity}x {item.name}
      </div>
    ));
    return { final, total };
  };

  return (
    <Container>
      <Row>
        <Col>
          <h1>Product List</h1>
          <ul style={{ listStyleType: "none" }}>{list}</ul>
        </Col>
        <Col>
          <h1>Cart Contents</h1>
          <Accordion defaultActiveKey="0">{cartList}</Accordion>
        </Col>
        <Col>
          <h1>CheckOut </h1>
          <Button onClick={() => setTotal(checkOut())}>CheckOut $ {total}</Button>
          <div> {total > 0 && renderFinalList().final} </div>
        </Col>
      </Row>
      <Row>
        <form
          onSubmit={(event) => {
            restockProducts(`http://localhost:1337/api/products`);
            console.log(`Restock called on ${query}`);
            event.preventDefault();
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">ReStock Products</button>
        </form>
      </Row>
    </Container>
  );
};

ReactDOM.render(<Products />, document.getElementById("root"));
