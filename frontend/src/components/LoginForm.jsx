import { useState } from "react";

function LoginForm({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isDisabled = submitting || !email.trim() || !password.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isDisabled) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onLogin({ email: email.trim(), password });
    } catch (loginError) {
      setError(loginError?.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="slide-up-delayed order-2 bg-white p-7 text-slate-900 sm:p-10 lg:order-2 lg:w-1/2 lg:p-14">
      <div className="mx-auto w-full max-w-md">
        <h2 className="font-['Manrope',sans-serif] text-2xl font-bold sm:text-3xl">Sign In</h2>
        <p className="mt-2 text-sm text-slate-600">Use your work account credentials to continue.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-cyan-300 transition focus:border-cyan-400 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm outline-none ring-cyan-300 transition focus:border-cyan-400 focus:ring-4"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <a href="#" className="font-medium text-cyan-600 hover:text-cyan-500">
            Sign up
          </a>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          <p>Authentication powered by Supabase. </p>
        </div>

      </div>
    </article>
  );
}

export default LoginForm;
