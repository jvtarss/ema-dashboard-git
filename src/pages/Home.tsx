import { useQuery } from '@tanstack/react-query';
import { miRNAApi } from '../services/api';
import { Database, Target, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: miRNAApi.getStats,
  });

  return (
    <div className="d-flex flex-column gap-5 pb-5">

      {/* Hero Section */}
      <section 
        className="text-center position-relative py-5 d-flex flex-column align-items-center rounded-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('hero-background.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '450px',
          justifyContent: 'center'
        }}
      >
        {/* Badge da Versão */}
        <span className="badge rounded-pill mb-4 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)' }}>
          <span className="small fw-bold text-uppercase letter-spacing-wider">Version 1.0.0</span>
        </span>

        {/* LOGO */}
        <img
          src="logo-branca.svg"
          alt="Eucalyptus microRNA Archive"
          style={{ height: '14rem', width: 'auto', objectFit: 'contain', background: 'transparent' }}
        />

        {/* Descrição */}
        <p className="fs-5 text-white mx-auto lh-base mb-5 fw-medium" style={{ maxWidth: '42rem' }}>
          A curated database of microRNAs in <em>Eucalyptus grandis</em>, integrating
          cross-study discovery evidence, expression profiling, and computationally predicted targets.
        </p>

        {/* Botões de Ação */}
        <div className="d-flex justify-content-center gap-3">
          <Link to="/browser" className="btn btn-primary btn-lg px-5 rounded-3 fw-bold d-flex align-items-center border-0" style={{ backgroundColor: '#219B74' }}>
            Start browsing
          </Link>
          <Link to="/documentation" className="btn btn-outline-light btn-lg px-5 rounded-3 fw-bold d-flex align-items-center backdrop-blur" style={{ backdropFilter: 'blur(4px)' }}>
            Documentation
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="font-display h2 text-ema-text">Database stats</h2>
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-4">
          {/* Card 1: Total miRNAs */}
          <div className="col">
            <div className="card border rounded-4 position-relative overflow-hidden h-100">
              <div className="position-absolute top-0 end-0 p-4 opacity-10">
                <Database size={96} className="text-primary" />
              </div>
              <div className="card-body p-4 position-relative">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="p-2 bg-success-subtle rounded-3 text-success">
                    <Database size={20} />
                  </div>
                  <span className="small fw-semibold text-ema-muted text-uppercase">Total miRNAs</span>
                </div>
                <h2 className="display-4 fw-bold text-ema-text my-2">{isLoading ? '...' : (stats?.total_mirnas || 0).toLocaleString('en-US')}</h2>
                <p className="small text-ema-muted fw-medium mb-0">
                  {isLoading
                    ? 'Syncing...'
                    : `${(stats?.known_mirnas || 0).toLocaleString('en-US')} known • ${(stats?.novel_mirnas || 0).toLocaleString('en-US')} novel`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Families */}
          <div className="col">
            <div className="card border rounded-4 position-relative overflow-hidden h-100">
              <div className="position-absolute top-0 end-0 p-4 opacity-10">
                <Layers size={96} className="text-info" />
              </div>
              <div className="card-body p-4 position-relative">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="p-2 bg-info-subtle rounded-3 text-info">
                    <Layers size={20} />
                  </div>
                  <span className="small fw-semibold text-ema-muted text-uppercase">Families</span>
                </div>
                <h2 className="display-4 fw-bold text-ema-text my-2">{isLoading ? '...' : (stats?.distinct_families || 0).toLocaleString('en-US')}</h2>
                <p className="small text-ema-muted fw-medium mb-0">Distinct family groups</p>
              </div>
            </div>
          </div>

          {/* Card 3: Targets */}
          <div className="col">
            <div className="card border rounded-4 position-relative overflow-hidden h-100">
              <div className="position-absolute top-0 end-0 p-4 opacity-10">
                <Target size={96} className="text-purple" />
              </div>
              <div className="card-body p-4 position-relative">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-subtle rounded-3 text-purple">
                    <Target size={20} />
                  </div>
                  <span className="small fw-semibold text-ema-muted text-uppercase">Targets</span>
                </div>
                <h2 className="display-4 fw-bold text-ema-text my-2">{isLoading ? '...' : (stats?.total_targets || 0).toLocaleString('en-US')}</h2>
                <p className="small text-ema-muted fw-medium mb-0">Predicted interactions</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navegação Principal */}
      <section>
        <h2 className="font-display h2 text-ema-text mb-4">Explore data</h2>

        <Link to="/browser" className="card border rounded-4 text-decoration-none p-4">
          <div className="card-body p-3 d-flex align-items-center justify-content-between">
            <div>
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="p-3 bg-white rounded-circle text-primary">
                  <Database size={24} />
                </div>
                <h3 className="h3 fw-bold text-ema-text mb-0">Entries browser</h3>
              </div>
              <p className="text-ema-muted fs-5 mb-0" style={{ maxWidth: '42rem' }}>
                Access the full catalog with advanced filters for tissues, conditions, families, and inhibition types.
              </p>
            </div>
            <div className="bg-white p-3 rounded-circle">
              <ArrowRight size={24} className="text-primary" />
            </div>
          </div>
        </Link>
      </section>

      {/* Update Log */}
      <section className="mt-4">
        <h2 className="font-display h2 text-ema-text mb-4">Update log</h2>
        <div className="card border rounded-4 p-4">
          <div className="d-flex flex-column gap-4">
            <div className="d-flex gap-3 align-items-start border-start border-3 border-ema-primary ps-3">
              <div>
                <span className="small fw-bold text-ema-primary d-block">July 8, 2026</span>
                <p className="text-ema-text mb-0">EMA online and version 1.0 released.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}