import { useState } from "react";

function LoginForm({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isDisabled = !email.trim() || !password.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isDisabled) {
      return;
    }
    onLogin(email);
  };

  return (
    <article className="slide-up-delayed order-1 bg-white p-7 text-slate-900 sm:p-10 lg:order-2 lg:w-1/2 lg:p-14">
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

          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-400" />
              Remember me
            </label>
            <a href="#" className="font-medium text-cyan-700 hover:text-cyan-600">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Sign In
          </button>
        </form>

      </div>
    </article>
  );
}

export default LoginForm;
