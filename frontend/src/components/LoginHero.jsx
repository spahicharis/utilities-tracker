function LoginHero() {
  return (
    <article className="slide-up order-2 flex flex-col justify-between p-8 sm:p-10 lg:order-1 lg:w-1/2 lg:p-14">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Utilities Tracker</p>
        <h1 className="mt-4 font-['Manrope',sans-serif] text-4xl font-bold leading-tight text-white sm:text-5xl">
          Welcome back.
        </h1>
        <p className="mt-5 max-w-md text-sm text-slate-300 sm:text-base">
          Sign in to monitor your dashboards, alerts, and reports in one place.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-300 sm:text-sm">
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Real-time analytics</span>
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Fast performance</span>
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Secure access</span>
      </div>
    </article>
  );
}

export default LoginHero;
