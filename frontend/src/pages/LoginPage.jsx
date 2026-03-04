import AppFooter from "../components/AppFooter";
import LoginForm from "../components/LoginForm";
import LoginHero from "../components/LoginHero";

function LoginPage({ onLogin }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex-1 overflow-hidden bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
        <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

        <section className="relative mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-900/60 backdrop-blur-xl lg:min-h-[720px] lg:flex-row">
          <LoginHero />
          <LoginForm onLogin={onLogin} />
        </section>
      </main>
      <AppFooter />
    </div>
  );
}

export default LoginPage;
