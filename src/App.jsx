import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Forum from './pages/Forum.jsx';
import Confession from './pages/Confession.jsx';
import { Login, Register } from './pages/Auth.jsx';
import { PostDetail, QuestionDetail } from './pages/Detail.jsx';
import Admin from './pages/Admin.jsx';

function themeInit() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [theme, setTheme] = useState(themeInit);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar theme={theme} onTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/questions/:id" element={<QuestionDetail />} />
            <Route path="/confession" element={<Confession />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
