import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ItemDetails from "./pages/ItemDetails";
import Compare from "./pages/Compare";
import Stats from "./pages/Stats";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/item/:id" element={<ItemDetails />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/stats" element={<Stats />} />
    </Routes>
  );
}

export default App;