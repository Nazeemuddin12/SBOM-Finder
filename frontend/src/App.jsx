import { Routes, Route } from "react-router-dom";
import Header from "./ui_components/Header";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import Compare from "./pages/Compare";
import Stats from "./pages/Stats";
import Import from "./pages/Import";
import ReverseLookup from "./pages/ReverseLookup";
import TrackedProducts from "./pages/TrackedProducts";

function App() {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id" element={<ItemDetails />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/import" element={<Import />} />
        <Route path="/reverse-lookup" element={<ReverseLookup />} />
        <Route path="/tracked-products" element={<TrackedProducts />} />
      </Routes>
    </div>
  );
}

export default App;