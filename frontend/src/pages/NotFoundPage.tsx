import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { useLocation, useNavigate } from 'react-router-dom';

// Fallback untuk URL yang tidak cocok dengan route mana pun. Sebelum ini,
// URL asing merender halaman kosong tanpa penjelasan apa pun — pengguna tidak
// bisa membedakan "salah alamat" dari "aplikasi rusak".
export function NotFoundPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="flex align-items-center justify-content-center py-8">
      <Card title="Halaman tidak ditemukan" className="w-30rem text-center">
        <p className="text-color-secondary mb-2">
          Alamat <strong className="text-color">{pathname}</strong> tidak dikenali.
        </p>
        <p className="text-color-secondary mb-4">
          Tautannya mungkin salah ketik, atau halamannya sudah dipindahkan.
        </p>
        <div className="flex gap-2 justify-content-center">
          <Button
            label="Kembali"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            onClick={() => navigate(-1)}
          />
          <Button label="Ke Beranda" icon="pi pi-home" onClick={() => navigate('/')} />
        </div>
      </Card>
    </div>
  );
}
