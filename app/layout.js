import { Inter, Space_Grotesk } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-grotesk' });

export const metadata = {
  title: { default: 'Savepoint', template: '%s · Savepoint' },
  description: 'Seu diário de jogos: avalie, escreva reviews, siga amigos e participe da comunidade de cada jogo.',
};

// Aplica o tema salvo antes da página aparecer (evita "piscar")
const themeScript = `(function(){try{var t=localStorage.getItem('tema');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'claro':'escuro'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='escuro'}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" data-theme="escuro" suppressHydrationWarning className={`${inter.variable} ${grotesk.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
