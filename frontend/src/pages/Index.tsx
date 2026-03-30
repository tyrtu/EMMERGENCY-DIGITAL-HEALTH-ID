import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, QrCode, Activity, Heart, Users, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: QrCode,
    title: "QR-Powered Access",
    description: "Instant access to critical health data via encrypted QR code scan. No apps, no delays.",
  },
  {
    icon: Shield,
    title: "Military-Grade Security",
    description: "AES-256 encryption, HIPAA-compliant data handling, and rotating tokens for maximum protection.",
  },
  {
    icon: Activity,
    title: "AI Triage Engine",
    description: "AI-powered triage summaries highlight drug interactions, allergies, and recommend first steps.",
  },
  {
    icon: Heart,
    title: "Emergency Vitals",
    description: "Blood type, allergies, conditions, and emergency contacts — all above the fold in seconds.",
  },
  {
    icon: Users,
    title: "Role-Based Workflows",
    description: "Tailored experiences for patients, medics, and administrators with strict access control.",
  },
  {
    icon: Zap,
    title: "Real-Time Alerts",
    description: "Instant notifications when your QR is scanned, with full audit trail and location data.",
  },
];

const stats = [
  { value: "< 2s", label: "Emergency Data Access" },
  { value: "256-bit", label: "AES Encryption" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "HIPAA", label: "Fully Compliant" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: '#16a085' }}>
              <Heart className="h-5 w-5" style={{ color: '#fff' }} />
            </div>
            <span className="text-lg font-bold text-foreground">Emergency Health ID</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" style={{ background: '#16a085', color: '#fff', border: 'none' }}>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e8f6f3] via-transparent to-[#f5f5f5]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]" style={{ background: '#e8f6f3', borderRadius: '9999px', filter: 'blur(48px)' }} />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{
                display: 'inline-block',
                background: '#f4f4f4',
                color: '#222',
                borderRadius: '6px',
                padding: '6px 18px',
                fontSize: '1rem',
                fontWeight: 500,
                letterSpacing: '0.01em',
                boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)',
                border: '1px solid #e0e0e0',
                marginBottom: '1.5rem',
              }}>
                HIPAA Compliant · AES-256 Encrypted
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Your Medical Identity,{" "}
              <span style={{ color: '#16a085', fontWeight: 700 }}>Instantly Accessible</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              A QR-powered medical identity platform that gives first responders instant, 
              secure access to your critical health information — eliminating dangerous delays 
              when every second counts.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/register">
                <Button size="lg" className="gap-2 px-8" style={{ background: '#16a085', color: '#fff', border: 'none' }}>
                  Create Your Health ID <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-8">
                  Medic Portal
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="card-medical text-center">
                <div className="text-2xl font-bold" style={{ color: '#16a085' }}>{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="info" className="mb-4">Platform Features</Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Built for Life-Critical Moments
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Every feature is designed with emergency scenarios in mind — speed, clarity, and security above all.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card-medical group hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-4" style={{ background: '#e8f6f3' }}>
                  <feature.icon className="h-5 w-5" style={{ color: '#16a085' }} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-muted/50">
        <div className="container">
          <div className="text-center mb-16">
            <Badge variant="info" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Three Steps to Safety
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Create Your Profile", desc: "Sign up and complete your medical profile — conditions, allergies, medications, emergency contacts, and vitals." },
              { step: "02", title: "Get Your Health ID", desc: "Generate your encrypted QR code and download your CR80-standard Health ID card as a printable PDF." },
              { step: "03", title: "Instant Emergency Access", desc: "First responders scan your QR to instantly view your critical health data with AI-powered triage recommendations." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold mb-4" style={{ background: '#16a085', color: '#fff' }}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-20 lg:py-28">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center max-w-5xl mx-auto">
            <div>
              <Badge variant="info" className="mb-4" style={{ background: '#e8f6f3', color: '#16a085' }}>Security First</Badge>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Your Health Data, Fortified
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Emergency Health ID is built with security at its core. Every piece of patient data 
                is encrypted, access-controlled, and fully audited.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "AES-256-GCM encryption for all QR payloads",
                  "Rotating tokens with 24-hour expiry",
                  "HIPAA & GDPR compliant data handling",
                  "Complete audit trail of all data access",
                  "Role-based access control (Patient / Medic / Admin)",
                  "Rate limiting on all sensitive endpoints",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-safe mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="card-medical p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: '#e8f6f3' }}>
                    <Shield className="h-5 w-5" style={{ color: '#16a085' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Security Status</div>
                    <div className="text-xs text-muted-foreground">All systems operational</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Encryption", status: "AES-256 Active", variant: "safe" as const },
                    { label: "Token Rotation", status: "Every 24h", variant: "safe" as const },
                    { label: "Audit Logging", status: "Enabled", variant: "safe" as const },
                    { label: "Rate Limiting", status: "Active", variant: "info" as const },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <Badge variant={item.variant}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl p-10 sm:p-16 text-center" style={{ background: '#16a085' }}>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to Protect What Matters Most?
              </h2>
              <p className="mt-4 text-white/80 max-w-xl mx-auto">
                Create your Emergency Health ID today and ensure your critical medical information 
                is always accessible when it matters most.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button size="lg" variant="secondary" className="gap-2 px-8" style={{ background: '#fff', color: '#16a085', border: 'none' }}>
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: '#16a085' }}>
                <Heart className="h-4 w-4" style={{ color: '#fff' }} />
              </div>
              <span className="font-semibold text-foreground">Emergency Health ID</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Emergency Health ID. All rights reserved. HIPAA Compliant.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
