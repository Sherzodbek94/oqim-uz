import { Link } from "react-router";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-6 text-center">
      <SearchX className="h-16 w-16 text-ink-300" />
      <h1 className="mt-6 text-display-xl font-bold text-ink-900">404</h1>
      <p className="mt-2 text-h3 text-ink-600">Sahifa topilmadi</p>
      <p className="mt-4 max-w-md text-body text-ink-500">
        Siz qidirgan sahifa o'chirilgan, nomi o'zgartirilgan yoki vaqtinchalik mavjud emas.
      </p>
      <Link to="/" className="btn-primary mt-8 inline-flex items-center gap-2">
        <Home className="h-5 w-5" />
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
