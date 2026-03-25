import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import Compare from "./pages/Compare";
import Stats from "./pages/Stats";
import Import from "./pages/Import";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/item/:id" element={<ItemDetails />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/import" element={<Import />} />
    </Routes>
  );
}

export default App;