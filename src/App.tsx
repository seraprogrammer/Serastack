import { Routes, Route, useParams, A } from "@/Serastack/react-router";

function Home() {
  return (
    <>
      <h1>Hello world this is Home</h1>
    </>
  );
}

// A component that uses the parameters from the URL
function UserProfile() {
  // Extract the 'userId' parameter from the URL
  const params = useParams();

  return (
    <div>
      <h1>User Profile</h1>
      <p>Viewing user with ID: {params.userId}</p>
    </div>
  );
}

// Another example with multiple parameters
function ProductDetails() {
  const { categoryId, productId } = useParams();

  return (
    <div>
      <h2>Product Details</h2>
      <p>Category: {categoryId}</p>
      <p>Product: {productId}</p>
    </div>
  );
}

function NotFound() {
  return <h1 className="text-red-500">Not Found</h1>;
}

// App component with routes
function App() {
  return (
    <div>
      <h1>My App</h1>
      <nav>
        <A activeClassName="active" to="/">
          Home
        </A>
        <A to="/users/123" activeClassName="active">
          Users
        </A>
        <A to="/category/5/product/1263" activeClassName="active">
          Product
        </A>
      </nav>
      <Routes>
        <Route path="/users/:userId" element={<UserProfile />} />
        <Route
          path="/category/:categoryId/product/:productId"
          element={<ProductDetails />}
        />
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
