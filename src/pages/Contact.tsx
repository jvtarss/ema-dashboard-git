import { Mail, Github, ExternalLink } from 'lucide-react';

export default function Contact() {
  return (
    <div className="container" style={{ maxWidth: '48rem' }}>
      <div className="d-flex flex-column gap-4">
        <div className="text-center">
          <h1 className="h2 fw-bold">Contact</h1>
          <p className="text-muted mt-1">
            Comments and suggestions are welcomed!
          </p>
        </div>

        <div className="card border shadow-sm rounded-4">
          <div className="card-body p-4">
            <div className="d-flex flex-column gap-4">
              <div className="d-flex align-items-start gap-3">
                <Mail size={24} className="text-success mt-1" />
                <div>
                  <h3 className="h5 fw-semibold">Email</h3>
                  <p className="text-muted mt-1 mb-2">
                    For questions, feedback, or collaboration inquiries:
                  </p>
                  <a
                    href="mailto:contact@example.com"
                    className="text-success text-decoration-none"
                  >
                    contact@example.com
                  </a>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <Github size={24} className="text-success mt-1" />
                <div>
                  <h3 className="h5 fw-semibold">GitHub</h3>
                  <p className="text-muted mt-1 mb-2">
                    Report issues or contribute to the project:
                  </p>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-success text-decoration-none d-inline-flex align-items-center"
                  >
                    View on GitHub <ExternalLink size={16} className="ms-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-success border border-success rounded-4 p-4">
          <h3 className="h5 fw-semibold mb-2">
            Bug reports and feature requests are welcomed!
          </h3>
          <p className="mb-0">
            Found a bug or have a suggestion? We'd love to hear from you!
            Please use our GitHub issue tracker or send us an email.
          </p>
        </div>
      </div>
    </div>
  );
}