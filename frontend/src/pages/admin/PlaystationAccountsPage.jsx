import PlaystationAccountManager from "../../components/PlaystationAccountManager";

function PlaystationAccountsPage() {
  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Accounts</p>
        <h1 className="mt-1 font-['Manrope',sans-serif] text-3xl font-bold">PlayStation Accounts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Keep PlayStation emails and passwords attached to your user account so they stay available across properties.
        </p>
      </div>

      <PlaystationAccountManager />
    </>
  );
}

export default PlaystationAccountsPage;
