export function BotaoNovo({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-[5.5rem] z-30 flex items-center gap-2 rounded-full bg-jade px-5 py-3.5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(19,102,80,.6)] hover:brightness-110 md:bottom-8"
    >
      <span className="text-xl leading-none">+</span> Novo lançamento
    </button>
  );
}
