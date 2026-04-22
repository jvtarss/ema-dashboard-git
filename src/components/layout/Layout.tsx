import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, FileText, Home as HomeIcon } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/browser', label: 'Browser', icon: Database },
    { path: '/documentation', label: 'Docs', icon: FileText },
    // { path: '/contact', label: 'Contact', icon: Mail }, // Opcional se já tem no footer
  ];

  return (
    <div className="min-vh-100 d-flex flex-column text-ema-text">

      {/* --- NAVBAR --- */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top border-bottom shadow-sm">
        <div className="container-xxl">
          <div className="d-flex justify-content-between align-items-center w-100 py-3">

            {/* Logo da Navbar */}
            <Link to="/" className="d-flex align-items-center gap-3 text-decoration-none">
              <img
                src="favicon.svg"
                alt="EMA Icon"
                className="transition-transform"
                style={{ height: '2.5rem', width: 'auto', objectFit: 'contain' }}
              />
              <div className="d-flex flex-column">
                <span className="font-display fw-bold fs-4 lh-1 text-ema-primary">EMA</span>
                <span style={{ fontSize: '0.625rem' }} className="text-uppercase letter-spacing-wider text-ema-muted fw-bold">Eucalyptus MicroRNA Archive</span>
              </div>
            </Link>

            {/* Menu Desktop */}
            <div className="d-none d-md-flex gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link d-flex align-items-center px-4 py-2 rounded-3 fw-bold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow'
                        : 'text-muted hover-accent'
                    }`}
                  >
                    <Icon size={16} className={`me-2 ${isActive ? 'text-white' : 'text-muted'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="flex-grow-1 px-4 px-sm-5 px-lg-4 pb-5 mx-auto w-100 animate-fade-in" style={{ paddingTop: '6rem', maxWidth: '90rem' }}>
        {children}
      </main>

      {/* --- RODAPÉ (LAGEMF STYLE) --- */}
      <footer className="border-top bg-white text-ema-text py-5 mt-auto">
        <div className="container d-flex flex-column align-items-center text-center gap-4" style={{ maxWidth: '60rem' }}>

            {/* 1. Logo do Laboratório */}
            <div className="mb-2">
                <img
                    src="logo-lagemf.png"
                    alt="LAGEMF Logo"
                    className="opacity-90 transition-opacity"
                    style={{ height: '5rem', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply' }}
                />
            </div>

            {/* 2. Copyright e Nome do Lab */}
            <div className="d-flex flex-column gap-1">
                <p className="fw-bold small mb-0">
                    Copyright © {new Date().getFullYear()} LAGEMF - Laboratório de Genética Molecular e Funcional
                </p>
                <p className="small text-ema-muted text-uppercase letter-spacing-wide fw-semibold mb-0">
                    Universidade Federal do Tocantins (UFT) - All rights reserved
                </p>
            </div>

            {/* 3. Endereço */}
            <div className="small text-secondary lh-base border-top border-bottom border-1 py-4 w-100" style={{ maxWidth: '48rem' }}>
                <p className="mb-0">
                    <strong>LAGEMF, Sala 9, HABITE</strong> (Incubadora de Empresas de Base Tecnológica)<br/>
                    Universidade Federal do Tocantins (UFT), campus Gurupi<br/>
                    Chácara 69-72, Rua Badejos, Lote 7, Jardim Sevilha, Gurupi, State of Tocantins, 77410-530
                </p>
            </div>

            {/* 4. Contato */}
            <div className="small fw-medium">
                Contact us: <a href="mailto:lagemf@uft.edu.br" className="text-ema-primary text-decoration-none">lagemf@uft.edu.br</a>
            </div>

        </div>
      </footer>
    </div>
  );
};

export default Layout;